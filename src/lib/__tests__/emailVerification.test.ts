import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  verifyEmailVerificationOtp,
  isUserEmailVerified,
  generateVerificationOtp,
} from '../emailVerification';
import { prisma } from '../prisma';

describe('emailVerification - Token Creation & Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a 6-digit numeric verification OTP', () => {
    const code = generateVerificationOtp();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('creates and verifies a valid time-limited verification token', async () => {
    const mockUser = {
      id: 'usr_verif_1',
      email: 'founder@enterprise.com',
      provider: 'email',
    };

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
    vi.spyOn(prisma.emailVerification, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.emailVerification, 'create').mockResolvedValue({} as any);

    const token = await createEmailVerificationToken(mockUser.id, mockUser.email);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const result = await verifyEmailVerificationToken(token);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
  });

  it('rejects an invalid or tampered verification token', async () => {
    const result = await verifyEmailVerificationToken('tampered.or.invalid.token');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a token if the user no longer exists in database', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const token = await createEmailVerificationToken('ghost_id', 'ghost@example.com');
    const result = await verifyEmailVerificationToken(token);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not match any registered account');
  });
});

describe('emailVerification - 6-Digit OTP Code Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies a matching unexpired OTP code and activates record', async () => {
    const mockRecord = {
      id: 'verif_rec_1',
      email: 'test@example.com',
      code: '849201',
      verified: false,
      expiresAt: new Date(Date.now() + 600000),
    };

    vi.spyOn(prisma.emailVerification, 'findFirst').mockResolvedValue(mockRecord as any);
    const updateSpy = vi.spyOn(prisma.emailVerification, 'update').mockResolvedValue({} as any);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'usr_99' } as any);

    const result = await verifyEmailVerificationOtp('test@example.com', '849201');

    expect(result.valid).toBe(true);
    expect(result.userId).toBe('usr_99');
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'verif_rec_1' },
        data: { verified: true },
      })
    );
  });

  it('rejects an incorrect or expired OTP code', async () => {
    vi.spyOn(prisma.emailVerification, 'findFirst').mockResolvedValue(null);

    const result = await verifyEmailVerificationOtp('test@example.com', '000000');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid or expired verification code');
  });
});

describe('emailVerification - isUserEmailVerified Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('automatically considers OAuth users (Google / GitHub) as verified', async () => {
    const googleUser = { email: 'user@gmail.com', provider: 'google' };
    const githubUser = { email: 'dev@github.com', provider: 'github' };

    expect(await isUserEmailVerified(googleUser)).toBe(true);
    expect(await isUserEmailVerified(githubUser)).toBe(true);
  });

  it('respects pre-existing emailVerified session claim', async () => {
    const verifiedSession = { email: 'verified@example.com', emailVerified: true };
    expect(await isUserEmailVerified(verifiedSession)).toBe(true);
  });

  it('returns false for unverified email users without a verified database record', async () => {
    vi.spyOn(prisma.emailVerification, 'findFirst').mockResolvedValue(null);

    const unverifiedUser = { email: 'unverified@example.com', provider: 'email' };
    expect(await isUserEmailVerified(unverifiedUser)).toBe(false);
  });

  it('returns true when a verified record exists in the database', async () => {
    vi.spyOn(prisma.emailVerification, 'findFirst').mockResolvedValue({
      id: 'v1',
      email: 'checked@example.com',
      verified: true,
    } as any);

    const verifiedUser = { email: 'checked@example.com', provider: 'email' };
    expect(await isUserEmailVerified(verifiedUser)).toBe(true);
  });
});

describe('Core Feature Gating - Unverified User Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/sites/add blocks unverified users with HTTP 403', async () => {
    const { POST: addSite } = await import('../../app/api/sites/add/route');
    const authModule = await import('../auth');

    vi.spyOn(authModule, 'getSession').mockResolvedValue({
      userId: 'unverified_1',
      email: 'unverified@example.com',
      name: 'Unverified User',
      role: 'user',
      tier: 'pro',
      emailVerified: false,
    });

    const req = new NextRequest('http://localhost:3000/api/sites/add', {
      method: 'POST',
      body: JSON.stringify({ domain: 'example.com' }),
    });

    const res = await addSite(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Email verification required');
  });

  it('GET /api/keys/me blocks unverified users with HTTP 403', async () => {
    const { GET: getKeys } = await import('../../app/api/keys/me/route');
    const authModule = await import('../auth');

    vi.spyOn(authModule, 'getSession').mockResolvedValue({
      userId: 'unverified_2',
      email: 'unverified@example.com',
      name: 'Unverified User',
      role: 'user',
      tier: 'pro',
      emailVerified: false,
    });

    const res = await getKeys();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Email verification required');
  });

  it('POST /api/billing/checkout blocks unverified users with HTTP 403', async () => {
    const { POST: checkout } = await import('../../app/api/billing/checkout/route');
    const authModule = await import('../auth');

    vi.spyOn(authModule, 'getSession').mockResolvedValue({
      userId: 'unverified_3',
      email: 'unverified@example.com',
      name: 'Unverified User',
      role: 'user',
      tier: 'free',
      emailVerified: false,
    });

    const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier: 'pro' }),
    });

    const res = await checkout(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Email verification required');
  });
});

describe('Anti-Bot & Registration Safeguards', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    const rateLimiter = await import('../rateLimiter');
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 5, resetMs: 60000 });
  });

  it('POST /api/auth/register rejects automated submission when honeypot trap is filled', async () => {
    const { POST: register } = await import('../../app/api/auth/register/route');
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'bot@spam.com',
        name: 'Bot User',
        password: 'Password#2026!',
        hp_website_trap: 'https://spam-link.com',
      }),
    });

    const res = await register(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Automated registration detected');
  });

  it('POST /api/auth/register rejects submission completed under 800ms', async () => {
    const { POST: register } = await import('../../app/api/auth/register/route');
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'speedy@spam.com',
        name: 'Speedy Bot',
        password: 'Password#2026!',
        formRenderTimestamp: Date.now() - 200, // submitted in 200ms
      }),
    });

    const res = await register(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Automated script detected');
  });
});
