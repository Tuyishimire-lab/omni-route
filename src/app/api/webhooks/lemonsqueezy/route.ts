import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyWebhookSignature, getTierForVariantId, getLemonConfig } from '../../../../lib/lemonsqueezy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');

    const { webhookSecret } = getLemonConfig();
    if (!webhookSecret) {
      console.error('[webhooks/lemonsqueezy] LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn('[webhooks/lemonsqueezy] Invalid signature rejected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload?.meta?.event_name;
    const customData = payload?.meta?.custom_data || {};
    const data = payload?.data;

    if (!eventName || !data) {
      return NextResponse.json({ error: 'Malformed webhook payload' }, { status: 400 });
    }

    const subscriptionId = data.id ? String(data.id) : null;
    const variantId = data.attributes?.variant_id ? String(data.attributes.variant_id) : null;
    const customerId = data.attributes?.customer_id ? String(data.attributes.customer_id) : null;
    const status = data.attributes?.status || 'active';
    const trialEndsAt = data.attributes?.trial_ends_at ? new Date(data.attributes.trial_ends_at) : null;
    const renewsAt = data.attributes?.renews_at
      ? new Date(data.attributes.renews_at)
      : trialEndsAt;
    const endsAt = data.attributes?.ends_at
      ? new Date(data.attributes.ends_at)
      : (status === 'on_trial' ? trialEndsAt : null);
    const portalUrl = data.attributes?.urls?.customer_portal || null;
    const userEmail = data.attributes?.user_email;

    // Resolve target tier: custom_data has priority, fallback to variantId mapping
    let resolvedTier: 'pro' | 'agency' = 'pro';
    if (customData.tier === 'agency' || (variantId && getTierForVariantId(variantId) === 'agency')) {
      resolvedTier = 'agency';
    }

    // Identify user: custom_data.user_id has priority, fallback to email lookup
    let targetUserId = customData.user_id;
    if (!targetUserId && userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });
      if (user) targetUserId = user.id;
    }

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed': {
        if (!targetUserId && subscriptionId) {
          const existing = await prisma.user.findFirst({
            where: { lemonSubscriptionId: subscriptionId },
            select: { id: true },
          });
          if (existing) targetUserId = existing.id;
        }

        if (targetUserId) {
          await prisma.user.update({
            where: { id: targetUserId },
            data: {
              tier: resolvedTier,
              lemonCustomerId: customerId,
              lemonSubscriptionId: subscriptionId,
              lemonVariantId: variantId,
              subscriptionStatus: status,
              subscriptionRenewsAt: renewsAt,
              subscriptionEndsAt: endsAt,
              lemonPortalUrl: portalUrl,
            },
          });
          console.log(`[webhooks/lemonsqueezy] User ${targetUserId} provisioned tier ${resolvedTier} (${eventName})`);
        } else {
          console.warn(`[webhooks/lemonsqueezy] No user found for event ${eventName} (sub: ${subscriptionId}, email: ${userEmail})`);
        }
        break;
      }

      case 'subscription_cancelled': {
        // When cancelled, subscription continues until ends_at, but update status
        if (subscriptionId) {
          const user = await prisma.user.findFirst({
            where: { lemonSubscriptionId: subscriptionId },
            select: { id: true },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: 'cancelled',
                subscriptionEndsAt: endsAt,
              },
            });
            console.log(`[webhooks/lemonsqueezy] User ${user.id} subscription marked cancelled (ends: ${endsAt})`);
          }
        }
        break;
      }

      case 'subscription_expired': {
        // When expired, immediately downgrade user back to free tier
        if (subscriptionId) {
          const user = await prisma.user.findFirst({
            where: { lemonSubscriptionId: subscriptionId },
            select: { id: true },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                tier: 'free',
                subscriptionStatus: 'expired',
              },
            });
            console.log(`[webhooks/lemonsqueezy] User ${user.id} subscription expired; reverted to free tier`);
          }
        }
        break;
      }

      default:
        console.log(`[webhooks/lemonsqueezy] Handled event ${eventName}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('[webhooks/lemonsqueezy] Processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
