import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { createLemonCheckout } from '../../../../lib/lemonsqueezy';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Authentication required to initiate checkout', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (!session.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required. Please verify your email before subscribing.', code: 'EMAIL_VERIFICATION_REQUIRED' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { tier, domain } = body;

    if (tier !== 'pro' && tier !== 'agency') {
      return NextResponse.json(
        { error: 'Invalid tier specified. Supported tiers: "pro", "agency"' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        lemonSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    // If the account has ever had a subscription or trial, skip the trial so they pay immediately
    const hasUsedTrial = Boolean(user?.lemonSubscriptionId || user?.subscriptionStatus);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com').replace(/\/+$/, '');
    const cleanDomain = typeof domain === 'string' ? domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '';
    const redirectUrl = cleanDomain
      ? `${appUrl}/my-sites?upgraded=true&tier=${tier}&domain=${encodeURIComponent(cleanDomain)}`
      : `${appUrl}/my-sites?upgraded=true&tier=${tier}`;

    const { checkoutUrl } = await createLemonCheckout({
      userId: session.userId,
      email: session.email,
      name: session.name,
      tier,
      skipTrial: hasUsedTrial,
      redirectUrl,
    });

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (err: unknown) {
    console.error('[billing/checkout] Error:', err);
    const message = err instanceof Error ? err.message : 'Checkout initiation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
