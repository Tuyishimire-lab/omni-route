import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { POST as checkoutRoute } from '../../app/api/billing/checkout/route';
import { POST as webhookRoute } from '../../app/api/webhooks/lemonsqueezy/route';
import { GET as portalRoute } from '../../app/api/billing/portal/route';
import { verifyWebhookSignature, getTierForVariantId, getVariantIdForTier } from '../lemonsqueezy';
import { prisma } from '../prisma';
import * as authModule from '../auth';

const TEST_SECRET = 'test_webhook_secret_32_chars_12';

describe('Lemon Squeezy Billing Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = TEST_SECRET;
    process.env.LEMONSQUEEZY_API_KEY = 'test_api_key';
    process.env.LEMONSQUEEZY_STORE_ID = '12345';
    process.env.LEMONSQUEEZY_VARIANT_ID_PRO = 'variant_pro_99';
    process.env.LEMONSQUEEZY_VARIANT_ID_AGENCY = 'variant_agency_199';
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.citeroute.com';
  });

  describe('Cryptographic Signature Verification', () => {
    it('returns true for a valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ meta: { event_name: 'subscription_created' } });
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');

      const isValid = verifyWebhookSignature(payload, signature, TEST_SECRET);
      expect(isValid).toBe(true);
    });

    it('returns false for a forged or tampered signature', () => {
      const payload = JSON.stringify({ meta: { event_name: 'subscription_created' } });
      const forgedSig = 'a'.repeat(64);

      const isValid = verifyWebhookSignature(payload, forgedSig, TEST_SECRET);
      expect(isValid).toBe(false);
    });

    it('returns false when signature header or secret is missing', () => {
      expect(verifyWebhookSignature('payload', null, TEST_SECRET)).toBe(false);
      expect(verifyWebhookSignature('payload', 'sig', '')).toBe(false);
    });
  });

  describe('Variant and Tier Mapping', () => {
    it('maps tiers to variant IDs correctly', () => {
      expect(getVariantIdForTier('pro')).toBe('variant_pro_99');
      expect(getVariantIdForTier('agency')).toBe('variant_agency_199');
    });

    it('maps variant IDs to tiers correctly', () => {
      expect(getTierForVariantId('variant_pro_99')).toBe('pro');
      expect(getTierForVariantId('variant_agency_199')).toBe('agency');
      expect(getTierForVariantId('unknown_variant')).toBe(null);
    });
  });

  describe('POST /api/billing/checkout', () => {
    it('returns 401 when user is unauthenticated', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const res = await checkoutRoute(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 for unsupported tiers', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'user_123',
        email: 'user@example.com',
        name: 'User',
        role: 'user',
        tier: 'free',
      });

      const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'invalid_tier' }),
      });

      const res = await checkoutRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid tier/);
    });

    it('creates checkout session and returns checkoutUrl', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'user_123',
        email: 'user@example.com',
        name: 'Jane Doe',
        role: 'user',
        tier: 'free',
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              url: 'https://citeroute.lemonsqueezy.com/checkout/buy/test_session_id',
            },
          },
        }),
      } as unknown as Response);

      const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const res = await checkoutRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.checkoutUrl).toBe('https://citeroute.lemonsqueezy.com/checkout/buy/test_session_id');
    });
  });

  describe('POST /api/webhooks/lemonsqueezy', () => {
    it('returns 401 if X-Signature header is missing or invalid', async () => {
      const payload = JSON.stringify({ meta: { event_name: 'subscription_created' } });
      const req = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        body: payload,
        headers: {
          'x-signature': 'invalid_signature_hash',
        },
      });

      const res = await webhookRoute(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/signature/i);
    });

    it('provisions Pro tier on subscription_created', async () => {
      const payloadObj = {
        meta: {
          event_name: 'subscription_created',
          custom_data: {
            user_id: 'user_target_456',
            tier: 'pro',
          },
        },
        data: {
          id: 'sub_ls_1001',
          attributes: {
            customer_id: 'cust_ls_5001',
            variant_id: 'variant_pro_99',
            status: 'active',
            renews_at: '2026-10-11T12:00:00.000Z',
            ends_at: null,
            urls: {
              customer_portal: 'https://citeroute.lemonsqueezy.com/billing/portal/mock_hash',
            },
            user_email: 'customer@example.com',
          },
        },
      };

      const payloadStr = JSON.stringify(payloadObj);
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(payloadStr).digest('hex');

      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      const req = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        body: payloadStr,
        headers: {
          'x-signature': signature,
        },
      });

      const res = await webhookRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'user_target_456' },
        data: {
          tier: 'pro',
          lemonCustomerId: 'cust_ls_5001',
          lemonSubscriptionId: 'sub_ls_1001',
          lemonVariantId: 'variant_pro_99',
          subscriptionStatus: 'active',
          subscriptionRenewsAt: new Date('2026-10-11T12:00:00.000Z'),
          subscriptionEndsAt: null,
          lemonPortalUrl: 'https://citeroute.lemonsqueezy.com/billing/portal/mock_hash',
        },
      });
    });

    it('updates subscriptionStatus to cancelled on subscription_cancelled', async () => {
      const payloadObj = {
        meta: { event_name: 'subscription_cancelled' },
        data: {
          id: 'sub_ls_1001',
          attributes: {
            status: 'cancelled',
            ends_at: '2026-10-11T12:00:00.000Z',
          },
        },
      };

      const payloadStr = JSON.stringify(payloadObj);
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(payloadStr).digest('hex');

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({ id: 'user_target_456' } as any);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      const req = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        body: payloadStr,
        headers: { 'x-signature': signature },
      });

      const res = await webhookRoute(req);
      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'user_target_456' },
        data: {
          subscriptionStatus: 'cancelled',
          subscriptionEndsAt: new Date('2026-10-11T12:00:00.000Z'),
        },
      });
    });

    it('downgrades user to free tier on subscription_expired', async () => {
      const payloadObj = {
        meta: { event_name: 'subscription_expired' },
        data: {
          id: 'sub_ls_1001',
          attributes: {
            status: 'expired',
          },
        },
      };

      const payloadStr = JSON.stringify(payloadObj);
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(payloadStr).digest('hex');

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({ id: 'user_target_456' } as any);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      const req = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        body: payloadStr,
        headers: { 'x-signature': signature },
      });

      const res = await webhookRoute(req);
      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'user_target_456' },
        data: {
          tier: 'free',
          subscriptionStatus: 'expired',
        },
      });
    });
  });

  describe('GET /api/billing/portal', () => {
    it('redirects to login when unauthenticated', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/billing/portal');
      const res = await portalRoute(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
    });

    it('redirects to customer portal URL when user has subscription', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'user_subscribed_1',
        email: 'subscriber@example.com',
        name: 'Subscriber',
        role: 'user',
        tier: 'pro',
      });

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user_subscribed_1',
        tier: 'pro',
        lemonPortalUrl: 'https://citeroute.lemonsqueezy.com/billing/portal/valid_portal_hash',
        lemonSubscriptionId: 'sub_ls_1001',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/billing/portal');
      const res = await portalRoute(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('https://citeroute.lemonsqueezy.com/billing/portal/valid_portal_hash');
    });
  });
});
