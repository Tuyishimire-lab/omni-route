import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { createApiKey, getUserApiKeys, revokeUserApiKey } from '../../../../lib/apiAuth';
import { checkApiKeyEligibility, getTierConfig, UserTier } from '../../../../lib/tierLimits';

export const dynamic = 'force-dynamic';

/**
 * GET /api/keys/me
 * Retrieves all API keys owned by the authenticated user along with their tier quota.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tierConfig = getTierConfig(session.tier);
    const keys = await getUserApiKeys(session.userId);

    return NextResponse.json({
      keys,
      tier: session.tier,
      role: session.role,
      hasApiAccess: session.role === 'admin' ? true : tierConfig.hasApiAccess,
      dailyLimit: session.role === 'admin' ? Infinity : tierConfig.apiDailyLimit,
    });
  } catch (err) {
    console.error('[keys/me GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

/**
 * POST /api/keys/me
 * Generates a new API key for the authenticated user according to their plan tier.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check tier eligibility (Pro, Agency, Enterprise, or Admin)
    const eligibility = checkApiKeyEligibility(session.tier, session.role);
    if (!eligibility.allowed) {
      return NextResponse.json(
        {
          error: eligibility.reason,
          code: 'TIER_API_ACCESS_REQUIRED',
          upgradeTier: eligibility.upgradeTier,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' && body.name.trim().length > 0
      ? body.name.trim()
      : 'Default API Key';
    const domain = typeof body.domain === 'string' && body.domain.trim().length > 0
      ? body.domain.trim()
      : undefined;

    // Cap at 5 active keys per user (unless admin)
    const existingKeys = await getUserApiKeys(session.userId);
    if (session.role !== 'admin' && existingKeys.length >= 5) {
      return NextResponse.json(
        { error: 'You have reached the maximum limit of 5 API keys. Please revoke an existing key first.' },
        { status: 400 }
      );
    }

    const userTier = (session.role === 'admin' ? 'enterprise' : session.tier) as UserTier;
    const newKey = await createApiKey(name, userTier, domain, session.userId);

    return NextResponse.json({
      success: true,
      key: {
        id: newKey.id,
        key: newKey.key, // Shown once for secure copy
        keyPrefix: newKey.keyPrefix,
        name: newKey.name,
        tier: newKey.tier,
        domain: newKey.domain,
        rateLimit: newKey.rateLimit,
        createdAt: newKey.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[keys/me POST] Error:', err);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

/**
 * DELETE /api/keys/me?id=<keyId>
 * Revokes an API key owned by the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = req.nextUrl.searchParams.get('id');
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const revoked = await revokeUserApiKey(session.userId, keyId);
    if (!revoked) {
      return NextResponse.json({ error: 'API key not found or not owned by you' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'API key successfully revoked' });
  } catch (err) {
    console.error('[keys/me DELETE] Error:', err);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
