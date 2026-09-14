import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/v1/ai-traffic/route';
import { prisma } from '../prisma';
import { hashApiKey } from '../apiAuth';
import * as rateLimiter from '../rateLimiter';

describe('GET /api/v1/ai-traffic', () => {
  const dummyKey = 'or-live_abcdef0123456789abcdef0123456789abcdef0123456789';

  const mockApiKey: any = {
    id: 'key-1',
    keyHash: hashApiKey(dummyKey),
    keyPrefix: dummyKey.slice(0, 16),
    name: 'Pro Key',
    tier: 'pro',
    domain: null,
    rateLimit: 1000,
    usageCount: 25,
    overageCount: 0,
    overageCostCents: 0,
    isActive: true,
    owner: {
      id: 'user-1',
      tier: 'pro',
      role: 'user',
      lemonSubscriptionItemId: null,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const req = new NextRequest('https://www.citeroute.com/api/v1/ai-traffic?domain=linear.app');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when domain query parameter is missing', async () => {
    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(mockApiKey);
    vi.spyOn(prisma.apiKey, 'update').mockResolvedValue({} as any);
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 474, resetMs: 50000 });

    const req = new NextRequest('https://www.citeroute.com/api/v1/ai-traffic', {
      headers: { Authorization: `Bearer ${dummyKey}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('domain query parameter is required');
  });

  it('returns aggregated AI crawler visits, bot breakdown, and metering headers', async () => {
    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue({
      ...mockApiKey,
      overageCount: 1,
      overageCostCents: 5,
    });
    vi.spyOn(prisma.apiKey, 'update').mockResolvedValue({} as any);
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: false, remaining: 0, resetMs: 50000 });

    vi.spyOn(prisma.telemetryEvent, 'findMany').mockResolvedValue([
      {
        id: 'ev-1',
        timestamp: new Date(),
        type: 'AI_CITATION',
        source: 'PerplexityBot',
        domain: 'linear.app',
        destinationUrl: 'https://linear.app/features',
        intent: 'Task Management Query',
        geoScoreAtTime: 88,
        settlementValue: null,
      },
      {
        id: 'ev-2',
        timestamp: new Date(),
        type: 'AGENT_TX',
        source: 'ChatGPT SearchBot',
        domain: 'linear.app',
        destinationUrl: 'https://linear.app',
        intent: 'Issue Tracking Search',
        geoScoreAtTime: 88,
        settlementValue: 1.50,
      },
    ] as any);

    vi.spyOn(prisma.tagHeartbeat, 'findFirst').mockResolvedValue({
      domain: 'linear.app',
      lastSeen: new Date(),
      firstSeen: new Date(),
    } as any);

    const req = new NextRequest('https://www.citeroute.com/api/v1/ai-traffic?domain=linear.app&days=14', {
      headers: { Authorization: `Bearer ${dummyKey}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.domain).toBe('linear.app');
    expect(data.windowDays).toBe(14);
    expect(data.isTagInstalled).toBe(true);
    expect(data.metrics.totalCrawlerHits).toBe(2);
    expect(data.metrics.totalSettlementValue).toBe(1.50);
    expect(data.metrics.botBreakdown.length).toBe(2);

    // Verify rate limit & metering headers
    expect(res.headers.get('X-RateLimit-Limit')).toBe('500');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Overage-Count')).toBe('2');
    expect(res.headers.get('X-RateLimit-Overage-Cost')).toBe('$0.10');
    expect(res.headers.get('X-RateLimit-Overage-Applied')).toBe('$0.05');
  });
});
