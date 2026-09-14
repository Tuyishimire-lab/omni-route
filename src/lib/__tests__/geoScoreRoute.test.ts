import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/v1/geo-score/route';
import { prisma } from '../prisma';
import { hashApiKey } from '../apiAuth';
import * as rateLimiter from '../rateLimiter';

describe('GET & POST /api/v1/geo-score', () => {
  const dummyKey = 'or-live_abcdef0123456789abcdef0123456789abcdef0123456789';

  const mockApiKey: any = {
    id: 'key-1',
    keyHash: hashApiKey(dummyKey),
    keyPrefix: dummyKey.slice(0, 16),
    name: 'Pro Key',
    tier: 'pro',
    domain: null,
    rateLimit: 1000,
    usageCount: 10,
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
    const req = new NextRequest('https://www.citeroute.com/api/v1/geo-score?domain=stripe.com');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when domain parameter is missing', async () => {
    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(mockApiKey);
    vi.spyOn(prisma.apiKey, 'update').mockResolvedValue({} as any);
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 489, resetMs: 50000 });

    const req = new NextRequest('https://www.citeroute.com/api/v1/geo-score', {
      headers: { Authorization: `Bearer ${dummyKey}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('domain or url parameter is required');
  });

  it('returns cached scores and attaches metering headers for known domains', async () => {
    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(mockApiKey);
    vi.spyOn(prisma.apiKey, 'update').mockResolvedValue({} as any);
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 489, resetMs: 50000 });

    vi.spyOn(prisma.domain, 'findUnique').mockResolvedValue({
      id: 'dom-1',
      domain: 'stripe.com',
      url: 'https://stripe.com',
      latestGeoScore: 92,
      latestCitationRate: 90,
      latestZeroClickResilience: 88,
      latestInfoGainScore: 89,
      latestEntityScore: 94,
      latestVectorReadiness: 91,
      category: 'Fintech',
      scanCount: 12,
      status: 'OPTIMAL',
      trendDelta: 2,
      trend: 'up',
      lastScanned: new Date(),
      scanEvents: [],
    } as any);

    const req = new NextRequest('https://www.citeroute.com/api/v1/geo-score?domain=stripe.com', {
      headers: { Authorization: `Bearer ${dummyKey}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.domain).toBe('stripe.com');
    expect(data.data.overallGeoScore).toBe(92);

    // Verify rate limit & metering headers
    expect(res.headers.get('X-RateLimit-Limit')).toBe('500');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('489');
    expect(res.headers.get('X-RateLimit-Overage-Cost')).toBe('$0.00');
  });
});
