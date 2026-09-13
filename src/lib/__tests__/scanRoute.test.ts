import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// `after` is a Next.js runtime API unavailable in the Vitest environment.
// Mock it as a no-op so route handlers can reach the 200 path without throwing.
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn((fn: () => void) => { try { fn(); } catch {} }) };
});

import { POST, GET } from '../../app/api/v1/scan/route';
import * as liveCrawlerModule from '../liveCrawler';
import * as dbModule from '../db';
import * as rateLimiterModule from '../rateLimiter';
import * as authModule from '../auth';
import { prisma } from '../prisma';

const MOCK_REPORT = {
  domain: 'stripe.com',
  url: 'https://stripe.com',
  analyzedAt: new Date().toISOString(),
  overallGeoScore: 82,
  zeroClickResilience: 78,
  informationGainScore: 85,
  entityDisambiguationScore: 79,
  vectorReadinessScore: 80,
  engineBreakdown: [],
  detectedEntities: [],
  recommendations: [],
  summary: 'Strong structural authority.',
  dataSource: 'live_crawl' as const,
  liveMetadata: {
    isLiveScanned: true,
    httpStatus: 200,
    schemaJsonLdCount: 2,
    h1Count: 1,
    h2Count: 5,
    tableCount: 1,
    wordCount: 1800,
    hasRobotsIndexingAllowed: true,
    detectedSchemas: ['Organization'],
  },
};

function makePostRequest(body: object, ip = '1.2.3.4') {
  return new NextRequest('http://localhost:3000/api/v1/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string>, ip = '1.2.3.4') {
  const url = new URL('http://localhost:3000/api/v1/scan');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { headers: { 'x-forwarded-for': ip } });
}

const allowedRL = () => ({ allowed: true, remaining: 29, retryAfter: undefined, resetMs: 60_000 });
const blockedRL = (retryAfter = 45) => ({ allowed: false, remaining: 0, retryAfter, resetMs: retryAfter * 1000 });

describe('POST /api/v1/scan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, 'saveScanToDB').mockResolvedValue(undefined as any);
  });

  it('returns 200 with report for a valid URL (anonymous)', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

    const res = await POST(makePostRequest({ url: 'stripe.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.domain).toBe('stripe.com');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('29');
  });

  it('returns 400 when url is missing', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/url is required/i);
  });

  it('returns 400 when url is empty string', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const res = await POST(makePostRequest({ url: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 429 with Retry-After on burst rate limit', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(blockedRL(45));
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');

    const res = await POST(makePostRequest({ url: 'stripe.com' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
    const data = await res.json();
    expect(data.code).toBeUndefined();
  });

  it('returns 429 TIER_SCAN_LIMIT on monthly quota exhaustion', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit')
      .mockResolvedValueOnce(allowedRL())
      .mockResolvedValueOnce(blockedRL(2592000));
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const res = await POST(makePostRequest({ url: 'stripe.com' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeNull();
    const data = await res.json();
    expect(data.code).toBe('TIER_SCAN_LIMIT');
    expect(data.upgradeTier).toBe('pro');
  });

  it('returns 500 and does not leak internal error on crawl failure', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockRejectedValue(new Error('Jina timeout'));

    const res = await POST(makePostRequest({ url: 'stripe.com' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).not.toMatch(/jina/i);
    expect(data.error).toMatch(/failed/i);
  });

  describe('bypassCache tier gating', () => {
    it('ignores bypassCache:true for anonymous users', async () => {
      vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
      vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
      vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const crawlSpy = vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

      await POST(makePostRequest({ url: 'stripe.com', bypassCache: true }));
      expect(crawlSpy).toHaveBeenCalledWith('stripe.com', { bypassCache: false });
    });

    it('ignores bypassCache:true for free-tier users', async () => {
      vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
      vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'user-free', email: 'free@example.com', name: 'Free', role: 'user', tier: 'free',
      });
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ tier: 'free' } as any);
      const crawlSpy = vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

      await POST(makePostRequest({ url: 'stripe.com', bypassCache: true }));
      expect(crawlSpy).toHaveBeenCalledWith('stripe.com', { bypassCache: false });
    });

    it('honours bypassCache:true for Pro users', async () => {
      vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
      vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'user-pro', email: 'pro@example.com', name: 'Pro', role: 'user', tier: 'pro',
      });
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ tier: 'pro' } as any);
      const crawlSpy = vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

      await POST(makePostRequest({ url: 'stripe.com', bypassCache: true }));
      expect(crawlSpy).toHaveBeenCalledWith('stripe.com', { bypassCache: true });
    });

    it('honours bypassCache:true for admin users', async () => {
      vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
      vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'admin-1', email: 'admin@citeroute.com', name: 'Admin', role: 'admin', tier: 'enterprise',
      });
      const crawlSpy = vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

      await POST(makePostRequest({ url: 'stripe.com', bypassCache: true }));
      expect(crawlSpy).toHaveBeenCalledWith('stripe.com', { bypassCache: true });
    });
  });
});

describe('GET /api/v1/scan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, 'saveScanToDB').mockResolvedValue(undefined as any);
  });

  it('returns 200 for valid url param', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

    const res = await GET(makeGetRequest({ url: 'stripe.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('returns 400 when url param is missing', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const res = await GET(makeGetRequest({}));
    expect(res.status).toBe(400);
  });

  it('ignores ?refresh=true for anonymous users', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const crawlSpy = vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

    await GET(makeGetRequest({ url: 'stripe.com', refresh: 'true' }));
    expect(crawlSpy).toHaveBeenCalledWith('stripe.com', { bypassCache: false });
  });

  it('honours ?refresh=true for Pro users', async () => {
    vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue(allowedRL());
    vi.spyOn(rateLimiterModule, 'getClientIp').mockReturnValue('1.2.3.4');
    vi.spyOn(authModule, 'getSession').mockResolvedValue({
      userId: 'user-pro', email: 'pro@example.com', name: 'Pro', role: 'user', tier: 'pro',
    });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ tier: 'pro' } as any);
    const crawlSpy = vi.spyOn(liveCrawlerModule, 'crawlAndAnalyzeUrl').mockResolvedValue(MOCK_REPORT as any);

    await GET(makeGetRequest({ url: 'stripe.com', refresh: 'true' }));
    expect(crawlSpy).toHaveBeenCalledWith('stripe.com', { bypassCache: true });
  });
});
