import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
} from '../auth';
import { prisma } from '../prisma';
import { sendPasswordResetEmail } from '../email';

describe('Password Reset Token Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it('automatically invalidates previous reset tokens once password is changed', async () => {
    const initialUser = {
      id: 'usr_reset_2',
      email: 'elena@example.com',
      passwordHash: '$2a$12$initialHashOldPassword123',
      isActive: true,
    };

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
