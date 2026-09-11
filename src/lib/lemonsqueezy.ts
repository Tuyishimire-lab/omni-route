import crypto from 'crypto';

/**
 * Resolves the Lemon Squeezy API Key, Store ID, and Webhook Secret from environment.
 */
export function getLemonConfig() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY || '';
  const storeId = process.env.LEMONSQUEEZY_STORE_ID || '';
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
  const proVariantId = process.env.LEMONSQUEEZY_VARIANT_ID_PRO || '';
  const agencyVariantId = process.env.LEMONSQUEEZY_VARIANT_ID_AGENCY || '';

  return {
    apiKey,
    storeId,
    webhookSecret,
    proVariantId,
    agencyVariantId,
  };
}

/**
 * Resolves the Lemon Squeezy variant ID for a given tier.
 */
export function getVariantIdForTier(tier: 'pro' | 'agency'): string | null {
  const { proVariantId, agencyVariantId } = getLemonConfig();
  if (tier === 'pro') return proVariantId || null;
  if (tier === 'agency') return agencyVariantId || null;
  return null;
}

/**
 * Resolves the app tier from a Lemon Squeezy variant ID.
 */
export function getTierForVariantId(variantId: string | number): 'pro' | 'agency' | null {
  const vIdStr = variantId.toString();
  const { proVariantId, agencyVariantId } = getLemonConfig();
  if (proVariantId && vIdStr === proVariantId.toString()) return 'pro';
  if (agencyVariantId && vIdStr === agencyVariantId.toString()) return 'agency';
  return null;
}

/**
 * Verifies the cryptographic HMAC-SHA256 signature from Lemon Squeezy.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export function verifyWebhookSignature(
  rawPayload: string | Buffer,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawPayload).digest('hex'), 'utf8');
    const signature = Buffer.from(signatureHeader, 'utf8');

    if (digest.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(digest, signature);
  } catch (err) {
    console.error('[lemonsqueezy] Error verifying webhook signature:', err);
    return false;
  }
}

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  name?: string;
  tier: 'pro' | 'agency';
  redirectUrl?: string;
}

/**
 * Creates an authenticated Lemon Squeezy checkout session.
 */
export async function createLemonCheckout(params: CreateCheckoutParams): Promise<{ checkoutUrl: string }> {
  const { apiKey, storeId } = getLemonConfig();

  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY environment variable is not configured');
  }
  if (!storeId) {
    throw new Error('LEMONSQUEEZY_STORE_ID environment variable is not configured');
  }

  const variantId = getVariantIdForTier(params.tier);
  if (!variantId) {
    throw new Error(`Variant ID for tier "${params.tier}" is not configured in environment variables`);
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com').replace(/\/+$/, '');
  const redirectUrl = params.redirectUrl || `${appUrl}/my-sites?upgraded=true&tier=${params.tier}`;

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: params.email,
          name: params.name || undefined,
          custom: {
            user_id: params.userId,
            tier: params.tier,
          },
        },
        checkout_options: {
          embed: true,
          media: true,
          logo: true,
        },
        product_options: {
          redirect_url: redirectUrl,
        },
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: storeId.toString(),
          },
        },
        variant: {
          data: {
            type: 'variants',
            id: variantId.toString(),
          },
        },
      },
    },
  };

  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[lemonsqueezy] Checkout creation failed:', response.status, errorText);
    throw new Error(`Lemon Squeezy checkout failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const checkoutUrl = data?.data?.attributes?.url;

  if (!checkoutUrl) {
    throw new Error('No checkout URL returned from Lemon Squeezy API');
  }

  return { checkoutUrl };
}

/**
 * Retrieves the Customer Portal URL for a given subscription ID from Lemon Squeezy.
 */
export async function getSubscriptionPortalUrl(subscriptionId: string): Promise<string | null> {
  const { apiKey } = getLemonConfig();
  if (!apiKey || !subscriptionId) return null;

  try {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.data?.attributes?.urls?.customer_portal || null;
  } catch (err) {
    console.error('[lemonsqueezy] Error fetching customer portal URL:', err);
    return null;
  }
}
