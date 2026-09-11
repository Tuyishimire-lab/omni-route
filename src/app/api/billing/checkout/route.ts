import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { createLemonCheckout } from '../../../../lib/lemonsqueezy';

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

    const body = await req.json().catch(() => ({}));
    const { tier } = body;

    if (tier !== 'pro' && tier !== 'agency') {
      return NextResponse.json(
        { error: 'Invalid tier specified. Supported tiers: "pro", "agency"' },
        { status: 400 }
      );
    }

    const { checkoutUrl } = await createLemonCheckout({
      userId: session.userId,
      email: session.email,
      name: session.name,
      tier,
    });

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (err: unknown) {
    console.error('[billing/checkout] Error:', err);
    const message = err instanceof Error ? err.message : 'Checkout initiation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
