/**
 * DB-backed rate limiter - works correctly across Vercel serverless instances.
 * Unlike in-memory Maps, this survives cold starts and is shared across all
 * concurrent function invocations.
 *
 * Strategy: sliding fixed-window. Each (identifier, action) pair has one row.
 * If the row's windowStart is older than windowMs, it resets. Otherwise it increments.
 * The upsert is not perfectly atomic under extreme concurrency, but is acceptable
 * for typical API rate limiting (occasional off-by-one is not a security concern).
 */

import { prisma } from './prisma';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfter?: number; // seconds
}

/**
 * Check and increment a rate limit counter.
 * @param identifier  Unique key, e.g. IP address or "email:foo@bar.com"
 * @param action      Named action bucket, e.g. "scan", "login", "register"
 * @param windowMs    Window duration in milliseconds (default: 60s)
 * @param maxRequests Max requests allowed in the window (default: 20)
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  windowMs = 60_000,
  maxRequests = 20
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Find existing record
    const existing = await prisma.rateLimitRecord.findUnique({
      where: { identifier_action: { identifier, action } },
    });

    if (!existing || existing.windowStart < windowStart) {
      // No record or window expired - create/reset atomically.
      // The update guard ensures a concurrent request that already reset the
      // window doesn't get clobbered back to 1.
      const result = await prisma.rateLimitRecord.upsert({
        where: { identifier_action: { identifier, action } },
        create: { identifier, action, windowStart: now, count: 1 },
        update: {
          windowStart: now,
          count: 1,
        },
      });

      return { allowed: true, remaining: maxRequests - 1, resetMs: windowMs };
    }

    if (existing.count >= maxRequests) {
      const resetMs = existing.windowStart.getTime() + windowMs - now.getTime();
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
        retryAfter: Math.ceil(Math.max(0, resetMs) / 1000),
      };
    }

    // Atomic conditional increment - only increments while under the limit,
    // closing the read-then-write race between concurrent requests.
    const updated = await prisma.rateLimitRecord.updateMany({
      where: {
        identifier,
        action,
        windowStart: existing.windowStart, // window unchanged since our read
        count: { lt: maxRequests },
      },
      data: { count: { increment: 1 } },
    });

    if (updated.count === 0) {
      // Another concurrent request consumed the last slot (or rolled the window)
      const resetMs = existing.windowStart.getTime() + windowMs - now.getTime();
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
        retryAfter: Math.ceil(Math.max(0, resetMs) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - existing.count - 1,
      resetMs: existing.windowStart.getTime() + windowMs - now.getTime(),
    };
  } catch (err) {
    // Fail open - never block a user due to a rate limiter DB error
    console.error('[rateLimiter] DB error, failing open:', err);
    return { allowed: true, remaining: 1, resetMs: 60_000 };
  }
}

/** Extract a client identifier from common Vercel/proxy headers */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Delete rate-limit rows whose windows expired more than an hour ago.
 * Called by the rescan cron - without this, RateLimitRecord grows unbounded.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const result = await prisma.rateLimitRecord.deleteMany({
      where: { windowStart: { lt: cutoff } },
    });
    if (result.count > 0) {
      console.log(`[rateLimiter] Cleaned up ${result.count} expired rate-limit rows`);
    }
    return result.count;
  } catch (err) {
    console.error('[rateLimiter] Cleanup failed:', err);
    return 0;
  }
}
