import { prisma } from './prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTierConfig } from './tierLimits';
import { checkRateLimit } from './rateLimiter';
import { getEndpointPricing, formatCents } from './apiPricing';
import { reportUsageToLemonSqueezy } from './lemonsqueezy';

// ─── Key Generation ──────────────────────────────────────────────────────────

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 1000,
  agency: 5000,
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
  tier: 'free' | 'pro' | 'agency' | 'enterprise' = 'free',
  domain?: string,
  userId?: string
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
      userId: userId ?? null,
    },
  });

  // Return the plaintext key exactly once - it is never retrievable again.
  return { ...apiKey, key };
}

export async function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      tier: true,
      domain: true,
      rateLimit: true,
      usageCount: true,
      overageCount: true,
      overageCostCents: true,
      lastUsedAt: true,
      createdAt: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeUserApiKey(userId: string, keyId: string) {
  const existing = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });
  if (!existing) return null;

  return prisma.apiKey.delete({
    where: { id: keyId },
  });
}

// ─── Key Validation & Metering ───────────────────────────────────────────────

export interface ValidatedKey {
  id: string;
  key: string;
  name: string;
  tier: string;
  domain: string | null;
  rateLimit: number;
  usageCount: number;
  overageCount: number;
  overageCostCents: number;
  isOverage: boolean;
  dailyLimit: number;
  dailyRemaining: number;
  endpointCostCents: number;
  userId: string | null;
}

export async function validateApiKey(
  keyString: string,
  pathname?: string
): Promise<{ valid: boolean; key?: ValidatedKey; error?: string; code?: string }> {
  if (!keyString || !keyString.startsWith('or-')) {
    return { valid: false, error: 'Invalid API key format. Keys start with "or-live_" or "or-test_".' };
  }

  try {
    const keyHash = hashApiKey(keyString);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        owner: {
          select: {
            id: true,
            tier: true,
            role: true,
            lemonSubscriptionItemId: true,
          },
        },
      },
    });

    if (!apiKey) {
      return { valid: false, error: 'API key not found.' };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: 'API key has been deactivated.' };
    }

    // Determine user tier & permissions
    const effectiveTier = apiKey.owner?.tier || apiKey.tier;
    const isAdmin = apiKey.owner?.role === 'admin';
    const tierConfig = getTierConfig(effectiveTier);

    if (!isAdmin && !tierConfig.hasApiAccess) {
      return {
        valid: false,
        error: 'API key access requires an active Pro or Agency plan. Upgrade your plan to use the API.',
        code: 'TIER_API_ACCESS_REQUIRED',
      };
    }

    // Resolve daily limit & endpoint pricing
    const dailyLimit = isAdmin ? Infinity : tierConfig.apiDailyLimit;
    const endpointCost = getEndpointPricing(pathname || '/api/v1/scan');

    // 24-hour daily quota check
    const DAY_MS = 24 * 60 * 60 * 1000;
    const quotaMax = dailyLimit === Infinity ? 999_999_999 : dailyLimit;
    const dailyCheck = await checkRateLimit(apiKey.id, 'api:daily', DAY_MS, quotaMax);

    const isOverage = !dailyCheck.allowed;
    const appliedCostCents = isOverage ? endpointCost.priceCents : 0;

    // Update API Key usage and overage counts atomically
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        usageCount: { increment: 1 },
        ...(isOverage ? {
          overageCount: { increment: 1 },
          overageCostCents: { increment: appliedCostCents },
        } : {}),
        lastUsedAt: new Date(),
      },
    });

    // If overage occurred and customer has a LemonSqueezy metered subscription item, report usage
    if (isOverage && apiKey.owner?.lemonSubscriptionItemId) {
      reportUsageToLemonSqueezy({
        subscriptionItemId: apiKey.owner.lemonSubscriptionItemId,
        quantity: endpointCost.credits,
      }).catch((err) => console.error('[apiAuth] Error syncing usage to LemonSqueezy:', err));
    }

    const currentUsage = apiKey.usageCount + 1;
    const currentOverage = isOverage ? apiKey.overageCount + 1 : apiKey.overageCount;
    const currentOverageCost = isOverage ? apiKey.overageCostCents + appliedCostCents : apiKey.overageCostCents;
    const dailyRemaining = dailyLimit === Infinity ? Infinity : (isOverage ? 0 : dailyCheck.remaining);

    return {
      valid: true,
      key: {
        id: apiKey.id,
        key: keyString,
        name: apiKey.name,
        tier: effectiveTier,
        domain: apiKey.domain,
        rateLimit: apiKey.rateLimit,
        usageCount: currentUsage,
        overageCount: currentOverage,
        overageCostCents: currentOverageCost,
        isOverage,
        dailyLimit,
        dailyRemaining,
        endpointCostCents: endpointCost.priceCents,
        userId: apiKey.userId,
      },
    };
  } catch (err) {
    console.error('[apiAuth] Validation error:', err);
    return { valid: false, error: 'Internal authentication error.' };
  }
}

/**
 * Attaches standard rate-limit and overage metering headers to any NextResponse.
 */
export function attachMeteringHeaders(res: NextResponse, key: ValidatedKey): NextResponse {
  res.headers.set('X-RateLimit-Limit', key.dailyLimit === Infinity ? 'Unlimited' : String(key.dailyLimit));
  res.headers.set('X-RateLimit-Remaining', key.dailyRemaining === Infinity ? 'Unlimited' : String(key.dailyRemaining));
  res.headers.set('X-RateLimit-Overage-Count', String(key.overageCount));
  res.headers.set('X-RateLimit-Overage-Cost', formatCents(key.overageCostCents));
  if (key.isOverage) {
    res.headers.set('X-RateLimit-Overage-Applied', formatCents(key.endpointCostCents));
  }
  return res;
}

// ─── Middleware Wrapper ──────────────────────────────────────────────────────

type ApiHandler = (
  req: NextRequest,
  context: { apiKey?: ValidatedKey }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with API key authentication & metering.
 * If `required` is true, unauthenticated requests get 401.
 * If `required` is false, unauthenticated requests still pass through.
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

    const result = await validateApiKey(keyString, req.nextUrl.pathname);

    if (!result.valid) {
      const status = result.code === 'TIER_API_ACCESS_REQUIRED' ? 403 : 401;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    const response = await handler(req, { apiKey: result.key });
    if (result.key) {
      attachMeteringHeaders(response, result.key);
    }
    return response;
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
