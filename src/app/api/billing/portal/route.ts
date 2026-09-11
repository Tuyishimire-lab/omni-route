import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';
import { getSubscriptionPortalUrl } from '../../../../lib/lemonsqueezy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com').replace(/\/+$/, '');

    if (!session || !session.userId) {
      return NextResponse.redirect(`${appUrl}/login?next=/pricing`);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        tier: true,
        lemonPortalUrl: true,
        lemonSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.redirect(`${appUrl}/pricing`);
    }

    let portalUrl = user.lemonPortalUrl;

    // If portal URL is not cached, attempt to fetch it dynamically from Lemon Squeezy API
    if (!portalUrl && user.lemonSubscriptionId) {
      portalUrl = await getSubscriptionPortalUrl(user.lemonSubscriptionId);
      if (portalUrl) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lemonPortalUrl: portalUrl },
        }).catch(() => null);
      }
    }

    const wantsJson = req.headers.get('accept')?.includes('application/json');

    if (!portalUrl) {
      if (wantsJson) {
        return NextResponse.json({ error: 'No active billing portal found for your subscription' }, { status: 404 });
      }
      return NextResponse.redirect(`${appUrl}/pricing?notice=no_subscription`);
    }

    if (wantsJson) {
      return NextResponse.json({ success: true, portalUrl });
    }

    return NextResponse.redirect(portalUrl);
  } catch (err: unknown) {
    console.error('[billing/portal] Error redirecting to portal:', err);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com').replace(/\/+$/, '');
    return NextResponse.redirect(`${appUrl}/pricing?error=portal_failed`);
  }
}
