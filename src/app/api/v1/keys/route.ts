import { NextRequest, NextResponse } from 'next/server';
import { createApiKey, listApiKeys, toggleApiKey, deleteApiKey, getApiKeyStats } from '../../../../lib/apiAuth';
import { getSession } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// Admin authorization: session-based only (role=admin).
// P0: The ADMIN_SECRET header backdoor has been removed — a leaked secret
// would give full admin access to anyone. Session auth is sufficient.
async function isAdminAuthorized(): Promise<boolean> {
  const session = await getSession();
  return session?.role === 'admin';
}

// GET /api/v1/keys — List all API keys + stats
export async function GET(req: NextRequest) {
  if (!await isAdminAuthorized()) {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  }

  try {
    const [keys, stats] = await Promise.all([
      listApiKeys(),
      getApiKeyStats(),
    ]);

    return NextResponse.json({
      success: true,
      keys: keys.map(k => ({
        ...k,
        // Only the display prefix is stored — full keys are never retrievable
        maskedKey: k.keyPrefix + '…',
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
      stats,
    });
  } catch (err) {
    console.error('[keys] GET error:', err);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

// POST /api/v1/keys — Create a new API key
export async function POST(req: NextRequest) {
  if (!await isAdminAuthorized()) {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, tier = 'free', domain } = body;

    if (!name || typeof name !== 'string' || name.length < 2) {
      return NextResponse.json({ error: 'Key name is required (min 2 characters)' }, { status: 400 });
    }

    const validTiers = ['free', 'pro', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` }, { status: 400 });
    }

    const apiKey = await createApiKey(name, tier, domain);

    return NextResponse.json({
      success: true,
      key: {
        id: apiKey.id,
        key: apiKey.key, // Full key shown only once at creation
        name: apiKey.name,
        tier: apiKey.tier,
        domain: apiKey.domain,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt.toISOString(),
      },
      message: 'Store this key securely — it will only be shown in full once.',
    });
  } catch (err) {
    console.error('[keys] POST error:', err);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

// PATCH /api/v1/keys — Toggle API key active/inactive
export async function PATCH(req: NextRequest) {
  if (!await isAdminAuthorized()) {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const updated = await toggleApiKey(id, Boolean(isActive));
    return NextResponse.json({
      success: true,
      key: { id: updated.id, isActive: updated.isActive },
    });
  } catch (err) {
    console.error('[keys] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}

// DELETE /api/v1/keys — Delete an API key
export async function DELETE(req: NextRequest) {
  if (!await isAdminAuthorized()) {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Key ID is required as query param' }, { status: 400 });
    }

    await deleteApiKey(id);
    return NextResponse.json({ success: true, deleted: id });
  } catch (err) {
    console.error('[keys] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
