import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClientIp, checkRateLimit } from '../rateLimiter';
import { prisma } from '../prisma';

describe('rateLimiter - getClientIp', () => {
  it('extracts the first IP from multi-hop x-forwarded-for header', () => {
    const req = {
      headers: new Headers({
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      }),
    };
    expect(getClientIp(req)).toBe('203.0.113.195');
  });

  it('extracts a single IP from x-forwarded-for header with surrounding whitespace', () => {
    const req = {
      headers: new Headers({
        'x-forwarded-for': '  198.51.100.42  ',
      }),
    };
    expect(getClientIp(req)).toBe('198.51.100.42');
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = {
      headers: new Headers({
        'x-real-ip': '192.0.2.1',
      }),
    };
    expect(getClientIp(req)).toBe('192.0.2.1');
  });

  it('falls back to 127.0.0.1 when no proxy headers are present', () => {
    const req = {
      headers: new Headers(),
    };
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
});

describe('rateLimiter - checkRateLimit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows the first request and initializes the window counter', async () => {
    vi.spyOn(prisma.rateLimitRecord, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.rateLimitRecord, 'upsert').mockResolvedValue({
      id: 'rl-1',
      identifier: 'test-user-1',
      action: 'scan',
      windowStart: new Date(),
      count: 1,
      updatedAt: new Date(),
    });

    const result = await checkRateLimit('test-user-1', 'scan', 60_000, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('allows requests within limit and decrements remaining count', async () => {
    const now = new Date();
    vi.spyOn(prisma.rateLimitRecord, 'findUnique').mockResolvedValue({
      id: 'rl-2',
      identifier: 'test-user-2',
      action: 'scan',
      windowStart: now,
      count: 3,
      updatedAt: now,
    });
    vi.spyOn(prisma.rateLimitRecord, 'updateMany').mockResolvedValue({ count: 1 });

    const result = await checkRateLimit('test-user-2', 'scan', 60_000, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(6); // 10 - 3 - 1 = 6
  });

  it('blocks requests when maxRequests limit is reached', async () => {
    const now = new Date();
    vi.spyOn(prisma.rateLimitRecord, 'findUnique').mockResolvedValue({
      id: 'rl-3',
      identifier: 'test-user-3',
      action: 'scan',
      windowStart: now,
      count: 10,
      updatedAt: now,
    });

    const result = await checkRateLimit('test-user-3', 'scan', 60_000, 10);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('falls back to in-memory rate limiting when database encounters an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(prisma.rateLimitRecord, 'findUnique').mockRejectedValue(new Error('DB connection timed out'));

    // First request should be allowed via fallback with correct remaining count
    const result1 = await checkRateLimit('test-fallback-user', 'scan', 60_000, 3);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    // Consume remaining slots
    const result2 = await checkRateLimit('test-fallback-user', 'scan', 60_000, 3);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = await checkRateLimit('test-fallback-user', 'scan', 60_000, 3);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);

    // Exceeded requests must be blocked even when DB is down (fail-secure)
    const result4 = await checkRateLimit('test-fallback-user', 'scan', 60_000, 3);
    expect(result4.allowed).toBe(false);
    expect(result4.remaining).toBe(0);
    expect(result4.retryAfter).toBeGreaterThan(0);
  });
});
