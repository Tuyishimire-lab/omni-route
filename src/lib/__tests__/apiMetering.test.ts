import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateApiKey, attachMeteringHeaders } from '../apiAuth';
import { prisma } from '../prisma';
import { NextResponse } from 'next/server';
import * as rateLimiter from '../rateLimiter';
import * as lemonsqueezy from '../lemonsqueezy';

describe('API Metering & Overage Tracking', () => {
  const dummyKey = 'or-live_0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects keys with invalid format', async () => {
    const res = await validateApiKey('invalid_key_prefix');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Invalid API key format');
  });

  it('rejects keys not found in the database', async () => {
    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(null);

    const res = await validateApiKey(dummyKey);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('API key not found');
  });

  it('meters requests within daily limit without overage charges', async () => {
    const mockApiKey: any = {
      id: 'key-test-pro',
      keyHash: 'hash',
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
        lemonSubscriptionItemId: 'sub_item_123',
      },
    };

    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(mockApiKey);
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: true,
      remaining: 489,
      resetMs: 50000,
    });

    const updateSpy = vi.spyOn(prisma.apiKey, 'update').mockResolvedValue({} as any);
    const lemonSpy = vi.spyOn(lemonsqueezy, 'reportUsageToLemonSqueezy');

    const result = await validateApiKey(dummyKey, '/api/v1/geo-score');

    expect(result.valid).toBe(true);
    expect(result.key).toBeDefined();
    expect(result.key?.isOverage).toBe(false);
    expect(result.key?.usageCount).toBe(11);
    expect(result.key?.overageCount).toBe(0);
    expect(result.key?.dailyRemaining).toBe(489);

    // Should update usageCount but NOT overage
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'key-test-pro' },
      data: expect.objectContaining({
        usageCount: { increment: 1 },
      }),
    });

    // No LemonSqueezy usage reported when within plan limit
    expect(lemonSpy).not.toHaveBeenCalled();
  });

  it('detects overage calls beyond daily limit and charges endpoint-specific price', async () => {
    const mockApiKey: any = {
      id: 'key-test-pro',
      keyHash: 'hash',
      name: 'Pro Key',
      tier: 'pro',
      domain: null,
      rateLimit: 1000,
      usageCount: 500,
      overageCount: 2,
      overageCostCents: 4, // 4 cents so far
      isActive: true,
      owner: {
        id: 'user-1',
        tier: 'pro',
        role: 'user',
        lemonSubscriptionItemId: 'sub_item_123',
      },
    };

    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(mockApiKey);
    // Daily quota exhausted (allowed: false)
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetMs: 30000,
      retryAfter: 30,
    });

    const updateSpy = vi.spyOn(prisma.apiKey, 'update').mockResolvedValue({} as any);
    const lemonSpy = vi.spyOn(lemonsqueezy, 'reportUsageToLemonSqueezy').mockResolvedValue({ success: true });

    // Call /api/v1/ai-traffic which is $0.05 (5 cents / 5 credits)
    const result = await validateApiKey(dummyKey, '/api/v1/ai-traffic');

    expect(result.valid).toBe(true);
    expect(result.key?.isOverage).toBe(true);
    expect(result.key?.usageCount).toBe(501);
    expect(result.key?.overageCount).toBe(3);
    expect(result.key?.overageCostCents).toBe(9); // 4 + 5 = 9 cents
    expect(result.key?.endpointCostCents).toBe(5);

    // Verified overage increments were sent to DB
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'key-test-pro' },
      data: expect.objectContaining({
        usageCount: { increment: 1 },
        overageCount: { increment: 1 },
        overageCostCents: { increment: 5 },
      }),
    });

    // Reported 5 credits to LemonSqueezy usage records
    expect(lemonSpy).toHaveBeenCalledWith({
      subscriptionItemId: 'sub_item_123',
      quantity: 5,
    });
  });

  it('meters /api/v1/verify at $0.01 (1 credit) on overage', async () => {
    const mockApiKey: any = {
      id: 'key-test-pro',
      keyHash: 'hash',
      name: 'Pro Key',
      tier: 'pro',
      domain: null,
      rateLimit: 1000,
      usageCount: 500,
      overageCount: 0,
      overageCostCents: 0,
      isActive: true,
      owner: {
        id: 'user-1',
        tier: 'pro',
        role: 'user',
        lemonSubscriptionItemId: 'sub_item_123',
      },
    };

    vi.spyOn(prisma.apiKey, 'findUnique').mockResolvedValue(mockApiKey);
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetMs: 30000,
    });

    const updateSpy = vi.spyOn(prisma.apiKey, 'update').mockResolvedValue({} as any);
    const lemonSpy = vi.spyOn(lemonsqueezy, 'reportUsageToLemonSqueezy').mockResolvedValue({ success: true });

    const result = await validateApiKey(dummyKey, '/api/v1/verify');

    expect(result.valid).toBe(true);
    expect(result.key?.isOverage).toBe(true);
    expect(result.key?.endpointCostCents).toBe(1);

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'key-test-pro' },
      data: expect.objectContaining({
        overageCostCents: { increment: 1 },
      }),
    });

    expect(lemonSpy).toHaveBeenCalledWith({
      subscriptionItemId: 'sub_item_123',
      quantity: 1,
    });
  });

  it('correctly sets response metering and overage headers', () => {
    const response = NextResponse.json({ success: true });
    attachMeteringHeaders(response, {
      id: 'test',
      key: 'test',
      name: 'Test',
      tier: 'pro',
      domain: null,
      rateLimit: 1000,
      usageCount: 520,
      overageCount: 20,
      overageCostCents: 40,
      isOverage: true,
      dailyLimit: 500,
      dailyRemaining: 0,
      endpointCostCents: 2,
      userId: 'user-1',
    });

    expect(response.headers.get('X-RateLimit-Limit')).toBe('500');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Overage-Count')).toBe('20');
    expect(response.headers.get('X-RateLimit-Overage-Cost')).toBe('$0.40');
    expect(response.headers.get('X-RateLimit-Overage-Applied')).toBe('$0.02');
  });
});
