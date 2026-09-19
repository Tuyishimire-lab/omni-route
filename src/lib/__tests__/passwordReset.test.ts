import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
} from '../auth';
import { prisma } from '../prisma';
import { sendPasswordResetEmail } from '../email';

describe('Password Reset Token Management', () => {
  let tokenStore: Array<{
    id: string;
    userId: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
  }> = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    tokenStore = [];

    (vi.spyOn(prisma.passwordResetToken, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      tokenStore.forEach((t) => {
        const matchesUser = !where.userId || t.userId === where.userId;
        const matchesUsed = where.used === undefined || t.used === where.used;
        if (matchesUser && matchesUsed) {
          if (data.used !== undefined) t.used = data.used;
          count++;
        }
      });
      return { count };
    });

    (vi.spyOn(prisma.passwordResetToken, 'create') as any).mockImplementation(async ({ data }: any) => {
      const record = {
        id: data.id,
        userId: data.userId,
        expiresAt: data.expiresAt,
        used: data.used ?? false,
        createdAt: data.createdAt || new Date(),
      };
      tokenStore.push(record);
      return record as any;
    });

    (vi.spyOn(prisma.passwordResetToken, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      const found = tokenStore.find((t) => t.id === where.id);
      return (found ? { ...found } : null) as any;
    });

    (vi.spyOn(prisma.passwordResetToken, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      const found = tokenStore.find((t) => {
        if (where.userId && t.userId !== where.userId) return false;
        if (where.createdAt?.gt && !(t.createdAt > where.createdAt.gt)) return false;
        return true;
      });
      return (found ? { ...found } : null) as any;
    });
  });

  it('creates and verifies a valid password reset token', async () => {
    const mockUser = {
      id: 'usr_reset_1',
      email: 'alex@example.com',
      passwordHash: '$2a$12$abcdefghijklmnopqrstuvwx',
      isActive: true,
    };

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

    const token = await createPasswordResetToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const result = await verifyPasswordResetToken(token);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe('usr_reset_1');
    expect(result.email).toBe('alex@example.com');
  });

  it('rejects an expired or tampered token', async () => {
    const result = await verifyPasswordResetToken('tampered.or.invalid.token');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('invalidates older reset token (Link A) when a new reset token (Link B) is generated (OWASP A07)', async () => {
    const mockUser = {
      id: 'usr_reset_multi',
      email: 'victim@example.com',
      passwordHash: '$2a$12$originalSecureHash123456',
      isActive: true,
    };

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

    // 1. User requests Link A
    const tokenA = await createPasswordResetToken(mockUser);
    expect(tokenStore).toHaveLength(1);
    expect(tokenStore[0].used).toBe(false);

    // Give a slight millisecond offset to differentiate creation timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 2. User requests Link B before using Link A
    const tokenB = await createPasswordResetToken(mockUser);
    expect(tokenStore).toHaveLength(2);
    // Link A must now be marked as used/superseded
    expect(tokenStore[0].used).toBe(true);
    // Link B must be active
    expect(tokenStore[1].used).toBe(false);

    // 3. User or attacker attempts to use Link A
    const resultA = await verifyPasswordResetToken(tokenA);
    expect(resultA.valid).toBe(false);
    expect(resultA.error).toContain('newer reset link was requested');

    // 4. User attempts to use Link B (the most recent one)
    const resultB = await verifyPasswordResetToken(tokenB);
    expect(resultB.valid).toBe(true);
    expect(resultB.userId).toBe(mockUser.id);
  });

  it('automatically invalidates previous reset tokens once password is changed', async () => {
    const initialUser = {
      id: 'usr_reset_2',
      email: 'elena@example.com',
      passwordHash: '$2a$12$initialHashOldPassword123',
      isActive: true,
    };

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(initialUser as any);

    const token = await createPasswordResetToken(initialUser);

    // Simulate that the user has changed their password, resulting in a new hash in the DB
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...initialUser,
      passwordHash: '$2a$12$newHashUpdatedPassword999',
    } as any);

    const result = await verifyPasswordResetToken(token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('already been used');
  });

  it('rejects a reset token if the user account is deactivated', async () => {
    const mockUser = {
      id: 'usr_reset_3',
      email: 'deactivated@example.com',
      passwordHash: '$2a$12$somehash12345678901234',
      isActive: true,
    };

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

    const token = await createPasswordResetToken(mockUser);

    // User is now marked inactive
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...mockUser,
      isActive: false,
    } as any);

    const result = await verifyPasswordResetToken(token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('deactivated');
  });
});

describe('Email Helper (Resend)', () => {
  it('falls back gracefully to dev console logging when RESEND_API_KEY is unset', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendPasswordResetEmail({
      to: 'test@example.com',
      resetUrl: 'https://citeroute.com/reset-password?token=mock',
      userName: 'Test User',
    });

    expect(result.success).toBe(true);
    expect(logSpy).toHaveBeenCalled();

    if (originalKey) {
      process.env.RESEND_API_KEY = originalKey;
    }
  });
});
