import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ user: null });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        tier: true,
        subscriptionStatus: true,
        lemonSubscriptionId: true,
      },
    });

    const hasUsedTrial = Boolean(dbUser?.lemonSubscriptionId || dbUser?.subscriptionStatus);

    return NextResponse.json({
      user: {
        ...session,
        emailVerified: session.emailVerified ?? false,
        tier: dbUser?.tier || session.tier,
        subscriptionStatus: dbUser?.subscriptionStatus || null,
        hasUsedTrial,
      },
    });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return NextResponse.json({ user: null });
  }
}
