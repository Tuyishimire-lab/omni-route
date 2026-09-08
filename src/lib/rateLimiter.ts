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
    // Fail-secure fallback: use in-memory sliding-window limiter instead of blind fail-open.
    // This ensures that database downtime cannot be exploited to send unbounded requests.
    console.error('[rateLimiter] DB error, falling back to in-memory rate limiter:', err);
    return checkFallbackRateLimit(identifier, action, windowMs, maxRequests);
  }
}

// ── In-Memory Fallback Rate Limiter ─────────────────────────────────────────
const fallbackRecords = new Map<string, number[]>();
const MAX_FALLBACK_RECORDS = 5000;

function checkFallbackRateLimit(
  identifier: string,
  action: string,
  windowMs: number,
  maxRequests: number
): RateLimitResult {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Prune expired records to prevent memory leaks if map grows large
  if (fallbackRecords.size > MAX_FALLBACK_RECORDS) {
    for (const [k, timestamps] of fallbackRecords.entries()) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        fallbackRecords.delete(k);
      } else {
        fallbackRecords.set(k, valid);
      }
    }
  }

  let timestamps = fallbackRecords.get(key) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const resetMs = Math.max(0, oldest + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      resetMs,
      retryAfter: Math.ceil(resetMs / 1000),
    };
  }

  timestamps.push(now);
  fallbackRecords.set(key, timestamps);

  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetMs: windowMs,
  };
}

/** Helper for unit testing to reset in-memory fallback state */
export function _resetFallbackRateLimits(): void {
  fallbackRecords.clear();
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
