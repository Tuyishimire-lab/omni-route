import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../app/api/v1/benchmark/route';
import * as rateLimiter from '../rateLimiter';
import * as authModule from '../auth';
import { prisma } from '../prisma';
import * as db from '../db';
import * as liveCrawler from '../liveCrawler';

describe('GET /api/v1/benchmark (Competitors Discovery)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects with 400 when competitorsFor parameter is missing', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 29, resetMs: 60000 });
    const req = new NextRequest('http://localhost:3000/api/v1/benchmark');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('competitorsFor query parameter is required');
  });

  it('returns category and rivals for a valid domain', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 29, resetMs: 60000 });
    vi.spyOn(prisma.domain, 'findUnique').mockResolvedValue({
      domain: 'stripe.com',
      category: 'Fintech',
      latestGeoScore: 95,
    } as any);

    vi.spyOn(prisma.domain, 'findMany').mockResolvedValue([
      { domain: 'brex.com', category: 'Fintech', latestGeoScore: 89 },
      { domain: 'mercury.com', category: 'Fintech', latestGeoScore: 86 },
    ] as any);

    const req = new NextRequest('http://localhost:3000/api/v1/benchmark?competitorsFor=stripe.com');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.domain).toBe('stripe.com');
    expect(json.category).toBe('Fintech');
    expect(json.competitors.length).toBe(2);
    expect(json.competitors[0].domain).toBe('brex.com');
  });
});

describe('POST /api/v1/benchmark (Batch Comparison)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects when fewer than 2 domains are provided', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 19, resetMs: 60000 });
    const req = new NextRequest('http://localhost:3000/api/v1/benchmark', {
      method: 'POST',
      body: JSON.stringify({ domains: ['stripe.com'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('At least 2 domains');
  });

  it('rejects when more than 5 domains are provided', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 19, resetMs: 60000 });
    const req = new NextRequest('http://localhost:3000/api/v1/benchmark', {
      method: 'POST',
      body: JSON.stringify({ domains: ['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('maximum of 5 domains');
  });

  it('rejects with 403 TIER_LIMIT_EXCEEDED when free or anonymous user provides more than 2 domains', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 19, resetMs: 60000 });
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/v1/benchmark', {
      method: 'POST',
      body: JSON.stringify({ domains: ['stripe.com', 'brex.com', 'mercury.com'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe('TIER_LIMIT_EXCEEDED');
    expect(json.tier).toBe('free');
    expect(json.maxAllowed).toBe(2);
  });

  it('allows pro user to benchmark up to 5 domains', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 19, resetMs: 60000 });
    vi.spyOn(authModule, 'getSession').mockResolvedValue({
      userId: 'user-pro-1',
      email: 'pro@example.com',
      role: 'user',
    } as any);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-pro-1',
      tier: 'pro',
    } as any);
    vi.spyOn(db, 'getCachedScanReport').mockResolvedValue(null);
    vi.spyOn(prisma.domain, 'findUnique').mockResolvedValue(null);
    vi.spyOn(liveCrawler, 'crawlAndAnalyzeUrl').mockImplementation(async (url) => {
      const clean = url.replace('https://', '');
      return {
        domain: clean,
        url,
        overallGeoScore: 85,
        zeroClickResilience: 80,
        informationGainScore: 78,
        entityDisambiguationScore: 82,
        vectorReadinessScore: 80,
        engineBreakdown: [],
        detectedEntities: [],
        recommendations: [],
        summary: 'Mock summary',
      } as any;
    });

    const req = new NextRequest('http://localhost:3000/api/v1/benchmark', {
      method: 'POST',
      body: JSON.stringify({ domains: ['stripe.com', 'brex.com', 'mercury.com'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.reports.length).toBe(3);
  });

  it('processes domains in parallel and returns reports for 2 domains on free tier', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 19, resetMs: 60000 });
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);
    vi.spyOn(db, 'getCachedScanReport').mockResolvedValue(null);
    vi.spyOn(prisma.domain, 'findUnique').mockResolvedValue(null);
    vi.spyOn(liveCrawler, 'crawlAndAnalyzeUrl').mockImplementation(async (url) => {
      const clean = url.replace('https://', '');
      return {
        domain: clean,
        url,
        overallGeoScore: 85,
        zeroClickResilience: 80,
        informationGainScore: 78,
        entityDisambiguationScore: 82,
        vectorReadinessScore: 80,
        engineBreakdown: [],
        detectedEntities: [],
        recommendations: [],
        summary: 'Mock summary',
      } as any;
    });

    const req = new NextRequest('http://localhost:3000/api/v1/benchmark', {
      method: 'POST',
      body: JSON.stringify({ domains: ['stripe.com', 'brex.com'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.reports.length).toBe(2);
    expect(json.reports[0].domain).toBe('stripe.com');
    expect(json.reports[1].domain).toBe('brex.com');
  });
});
