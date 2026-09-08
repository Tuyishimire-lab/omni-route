import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  upsertOAuthUser,
} from '../auth';
import { prisma } from '../prisma';

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
    });

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
    });


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
