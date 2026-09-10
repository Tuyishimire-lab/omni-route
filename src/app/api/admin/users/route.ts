import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_TIERS = ['free', 'pro', 'agency', 'enterprise'] as const;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() || '';
  const tier = searchParams.get('tier')?.trim().toLowerCase() || '';
  const role = searchParams.get('role')?.trim().toLowerCase() || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
    ];
  }

  if (tier && (VALID_TIERS as readonly string[]).includes(tier)) {
    where.tier = tier;
  }

  if (role && ['user', 'admin'].includes(role)) {
    where.role = role;
  }

  const [total, users, tierCounts, activeCount, inactiveCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        provider: true,
        createdAt: true,
        lastLoginAt: true,
        isActive: true,
        _count: {
          select: {
            apiKeys: true,
            registeredSites: true,
          },
        },
      },
    }),
    prisma.user.groupBy({
      by: ['tier'],
      _count: { id: true },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
  ]);

  // Ensure any account with role === 'admin' is aligned with 'enterprise' tier
  const normalizedUsers = users.map((u) => {
    if (u.role === 'admin' && u.tier === 'free') {
      // Asynchronously update in DB to keep permanent consistency
      prisma.user.update({ where: { id: u.id }, data: { tier: 'enterprise' } }).catch(() => {});
      return { ...u, tier: 'enterprise' as const };
    }
    return u;
  });

  const byTier: Record<string, number> = { free: 0, pro: 0, agency: 0, enterprise: 0 };
  tierCounts.forEach((t) => {
    byTier[t.tier] = t._count.id;
  });

  return NextResponse.json({
    users: normalizedUsers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      totalUsers: total,
      activeCount,
      inactiveCount,
      byTier,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, tier, isActive, role } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }

    // Protect against self-lockout
    if (userId === session.userId) {
      if (isActive === false) {
        return NextResponse.json({ error: 'Cannot deactivate your own admin account' }, { status: 400 });
      }
      if (role && role !== 'admin') {
        return NextResponse.json({ error: 'Cannot revoke your own admin role' }, { status: 400 });
      }
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (tier !== undefined) {
      if (!(VALID_TIERS as readonly string[]).includes(tier)) {
        return NextResponse.json({ error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` }, { status: 400 });
      }
      dataToUpdate.tier = tier;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
      }
      dataToUpdate.isActive = isActive;
    }

    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'role must be either user or admin' }, { status: 400 });
      }
      dataToUpdate.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update user' },
      { status: 500 }
    );
  }
}
