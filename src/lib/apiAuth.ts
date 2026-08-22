import { prisma } from './prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ─── Key Generation ──────────────────────────────────────────────────────────

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 1000,
  enterprise: 10000,
};

export function generateKeyString(prefix: 'live' | 'test' = 'live'): string {
  const random = crypto.randomBytes(24).toString('hex');
  return `or-${prefix}_${random}`;
}

/**
 * Hash an API key for at-rest storage. Keys are 48+ chars of CSPRNG entropy,
 * so a fast sha256 is sufficient - no need for bcrypt here.
 */
export function hashApiKey(keyString: string): string {
  return crypto.createHash('sha256').update(keyString).digest('hex');
}

/** Display prefix so users can identify keys without exposing the full secret. */
export function keyDisplayPrefix(keyString: string): string {
  return keyString.slice(0, 16);
}

export async function createApiKey(
  name: string,
  tier: 'free' | 'pro' | 'enterprise' = 'free',
  domain?: string
) {
  const key = generateKeyString('live');
  const rateLimit = TIER_LIMITS[tier] ?? 100;

  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash: hashApiKey(key),
      keyPrefix: keyDisplayPrefix(key),
      name,
      tier,
      domain: domain ?? null,
      rateLimit,
    },
  });

  // Return the plaintext key exactly once - it is never retrievable again.
  return { ...apiKey, key };
}

// ─── Key Validation ──────────────────────────────────────────────────────────

export interface ValidatedKey {
  id: string;
  key: string;
  name: string;
  tier: string;
  domain: string | null;
  rateLimit: number;
  usageCount: number;
}

export async function validateApiKey(
  keyString: string
): Promise<{ valid: boolean; key?: ValidatedKey; error?: string }> {
  if (!keyString || !keyString.startsWith('or-')) {
    return { valid: false, error: 'Invalid API key format. Keys start with "or-live_" or "or-test_".' };
  }

  try {
    const keyHash = hashApiKey(keyString);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!apiKey) {
      return { valid: false, error: 'API key not found.' };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: 'API key has been deactivated.' };
    }

    // Simple hourly rate limit check using usageCount
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isRecentlyReset = !apiKey.lastUsedAt || apiKey.lastUsedAt < hourAgo;

    // Atomic conditional increment - prevents concurrent requests from
    // blowing past the limit via a read-then-write race.
    const updated = await prisma.apiKey.updateMany({
      where: {
        id: apiKey.id,
        OR: [
          // Window expired - reset to 1
          { lastUsedAt: { lt: hourAgo } },
          { lastUsedAt: null },
          // Window active - only increment if under the limit
          ...(isRecentlyReset ? [] : [{ usageCount: { lt: apiKey.rateLimit } }]),
        ],
      },
      data: {
        usageCount: isRecentlyReset ? 1 : { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return {
        valid: false,
        error: `Rate limit exceeded. ${apiKey.tier} tier allows ${apiKey.rateLimit} requests/hour.`,
      };
    }

    const currentUsage = isRecentlyReset ? 1 : apiKey.usageCount + 1;

    return {
      valid: true,
      key: {
        id: apiKey.id,
        key: keyString,
        name: apiKey.name,
        tier: apiKey.tier,
        domain: apiKey.domain,
        rateLimit: apiKey.rateLimit,
        usageCount: currentUsage,
      },
    };
  } catch (err) {
    console.error('[apiAuth] Validation error:', err);
    return { valid: false, error: 'Internal authentication error.' };
  }
}

// ─── Middleware Wrapper ──────────────────────────────────────────────────────

type ApiHandler = (
  req: NextRequest,
  context: { apiKey?: ValidatedKey }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with optional API key authentication.
 * If `required` is true, unauthenticated requests get 401.
 * If `required` is false, unauthenticated requests still pass through
 * but with a lower IP-based rate limit.
 */
export function withAuth(handler: ApiHandler, options: { required?: boolean } = {}) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get('authorization');
    const keyParam = req.nextUrl.searchParams.get('api_key');
    const keyString = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : keyParam?.trim();

    if (!keyString) {
      if (options.required) {
        return NextResponse.json(
          { error: 'Authentication required. Provide an API key via Authorization: Bearer <key> header.' },
          { status: 401 }
        );
      }
      return handler(req, {});
    }

    const result = await validateApiKey(keyString);

    if (!result.valid) {
      const status = result.error?.includes('Rate limit') ? 429 : 401;
      return NextResponse.json({ error: result.error }, { status });
    }

    return handler(req, { apiKey: result.key });
  };
}

// ─── Admin Operations ────────────────────────────────────────────────────────

export async function listApiKeys() {
  return prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      tier: true,
      domain: true,
      rateLimit: true,
      usageCount: true,
      lastUsedAt: true,
      createdAt: true,
      isActive: true,
    },
  });
}

export async function toggleApiKey(id: string, isActive: boolean) {
  return prisma.apiKey.update({
    where: { id },
    data: { isActive },
  });
}

export async function deleteApiKey(id: string) {
  return prisma.apiKey.delete({
    where: { id },
  });
}

export async function getApiKeyStats() {
  const allKeys = await prisma.apiKey.findMany({
    select: { tier: true, isActive: true },
  });

  const total = allKeys.length;
  const active = allKeys.filter((k) => k.isActive).length;

  const tierMap: Record<string, number> = {};
  for (const k of allKeys) {
    tierMap[k.tier] = (tierMap[k.tier] || 0) + 1;
  }

  return {
    total,
    active,
    inactive: total - active,
    byTier: Object.entries(tierMap).map(([tier, count]) => ({ tier, count })),
  };
}
