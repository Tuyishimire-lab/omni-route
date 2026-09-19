import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  upsertOAuthUser,
  registerUser,
  destroySession,
} from '../auth';
import { prisma } from '../prisma';
import { _clearMemoryRevocationCache } from '../tokenRevocation';

// Mock next/headers cookies store at top level
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

describe('auth - Session Tokens', () => {
  it('creates and verifies a valid session token', async () => {
    const payload = {
      userId: 'user-123',
      email: 'alex@example.com',
      name: 'Alex Dev',
      role: 'user',
      tier: 'pro',
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user-123');
    expect(verified?.email).toBe('alex@example.com');
    expect(verified?.role).toBe('user');
    expect(verified?.tier).toBe('pro');
  });

  it('promotes admin role to enterprise tier automatically', async () => {
    const payload = {
      userId: 'admin-1',
      email: 'admin@citeroute.com',
      name: 'Admin User',
      role: 'admin',
      tier: 'free',
    };

    const token = await createSessionToken(payload);
    const verified = await verifySessionToken(token);
    expect(verified?.role).toBe('admin');
    expect(verified?.tier).toBe('enterprise');
  });

  it('returns null for an invalid or tampered token', async () => {
    const verified = await verifySessionToken('invalid.jwt.token');
    expect(verified).toBeNull();
  });

  it('revokes session when user tokenVersion has incremented after password reset (OWASP A07)', async () => {
    const userPayload = {
      userId: 'user-victim-1',
      email: 'victim@example.com',
      name: 'Victim User',
      role: 'user',
      tier: 'pro',
      tokenVersion: 1,
    };

    // Device A issues token at tokenVersion 1
    const deviceAToken = await createSessionToken(userPayload);

    // Mock DB: user password was reset on Device B, incrementing tokenVersion to 2
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-victim-1',
      email: 'victim@example.com',
      tokenVersion: 2,
      isActive: true,
    } as any);

    // Device A attempts to use their old session token
    const verifiedDeviceA = await verifySessionToken(deviceAToken, { checkRevocation: true });
    expect(verifiedDeviceA).toBeNull();

    // Fresh session token issued after password reset with tokenVersion 2 is accepted
    const newSessionToken = await createSessionToken({ ...userPayload, tokenVersion: 2 });
    const verifiedNew = await verifySessionToken(newSessionToken, { checkRevocation: true });
    expect(verifiedNew).not.toBeNull();
    expect(verifiedNew?.userId).toBe('user-victim-1');
  });

  it('assigns unique JTI per session and invalidates token upon revocation / logout (OWASP A07)', async () => {
    _clearMemoryRevocationCache();

    const userPayload = {
      userId: 'user-logout-test',
      email: 'logout@example.com',
      name: 'Logout Test User',
      role: 'user',
      tier: 'pro',
      tokenVersion: 1,
    };

    // Device A and Device B issue tokens for the same user
    const tokenA = await createSessionToken(userPayload);
    const tokenB = await createSessionToken(userPayload);

    const verifiedA = await verifySessionToken(tokenA);
    const verifiedB = await verifySessionToken(tokenB);

    expect(verifiedA?.jti).toBeDefined();
    expect(verifiedB?.jti).toBeDefined();
    expect(verifiedA?.jti).not.toBe(verifiedB?.jti);

    // Mock active user in DB
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-logout-test',
      isActive: true,
      tokenVersion: 1,
    } as any);

    // Both tokens valid before logout
    const preA = await verifySessionToken(tokenA, { checkRevocation: true });
    const preB = await verifySessionToken(tokenB, { checkRevocation: true });
    expect(preA).not.toBeNull();
    expect(preB).not.toBeNull();

    const jtiA = verifiedA?.jti;
    expect(jtiA).toBeDefined();

    // User logs out on Device A: token A's JTI is revoked in DB and cache
    vi.spyOn(prisma.revokedToken, 'findUnique').mockImplementation((async ({ where }: any) => {
      if (where.jti === jtiA) {
        return {
          jti: jtiA,
          userId: 'user-logout-test',
          expiresAt: new Date(Date.now() + 3600000),
          revokedAt: new Date(),
        };
      }
      return null;
    }) as any);

    // Device A token is now rejected immediately upon presentation
    const postA = await verifySessionToken(tokenA, { checkRevocation: true });
    expect(postA).toBeNull();

    // Device B token remains completely valid and undisturbed
    const postB = await verifySessionToken(tokenB, { checkRevocation: true });
    expect(postB).not.toBeNull();
    expect(postB?.userId).toBe('user-logout-test');
  });
});

describe('auth - upsertOAuthUser provider consistency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves email provider and does not set OAuth providerId for email users', async () => {
    // Mock existing email-registered user
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'usr-email-1',
      email: 'sarah@example.com',
      name: 'Sarah Connor',
      passwordHash: '$2a$12$hashedpassword...',
      role: 'user',
      tier: 'free',
      watchlist: '[]',
      avatarUrl: null,
      provider: 'email',
      providerId: null,
      createdAt: new Date(),
      lastLoginAt: null,
      isActive: true,
      lemonCustomerId: null,
      lemonSubscriptionId: null,
      lemonVariantId: null,
      subscriptionStatus: null,
      subscriptionRenewsAt: null,
      subscriptionEndsAt: null,
      lemonPortalUrl: null,
    } as any);

    const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({
      id: 'usr-email-1',
      email: 'sarah@example.com',
      name: 'Sarah Connor',
      passwordHash: '$2a$12$hashedpassword...',
      role: 'user',
      tier: 'free',
      watchlist: '[]',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar',
      provider: 'email',
      providerId: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true,
      lemonCustomerId: null,
      lemonSubscriptionId: null,
      lemonVariantId: null,
      subscriptionStatus: null,
      subscriptionRenewsAt: null,
      subscriptionEndsAt: null,
      lemonPortalUrl: null,
    } as any);


    const result = await upsertOAuthUser({
      email: 'sarah@example.com',
      name: 'Sarah Connor',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar',
      provider: 'google',
      providerId: 'google-sub-999',
    });

    expect(result.success).toBe(true);
    // Ensure update did NOT clobber provider to 'google' or providerId to 'google-sub-999'
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'email',
          providerId: null,
          avatarUrl: 'https://lh3.googleusercontent.com/avatar',
        }),
      })
    );
  });
});

describe('auth - registerUser Input Sanitization & URL Injection Prevention (OWASP A03)', () => {
  it('rejects registration when name contains the reported URL / markdown link injection payload', async () => {
    const maliciousName = 'Didn’t create this account? Click [evil.com](http://evil.com/)';
    const result = await registerUser('attacker@example.com', maliciousName, 'ValidPassword123#$');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Name cannot contain URLs, website links, or HTML tags.');
  });

  it('rejects registration when name contains raw URLs or domain names', async () => {
    const result = await registerUser('attacker@example.com', 'https://evil.com', 'ValidPassword123#$');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Name cannot contain URLs, website links, or HTML tags.');
  });

  it('rejects registration when name contains HTML or script tags', async () => {
    const result = await registerUser('attacker@example.com', '<script>alert(1)</script>', 'ValidPassword123#$');
    expect(result.success).toBe(false);
  });
});
