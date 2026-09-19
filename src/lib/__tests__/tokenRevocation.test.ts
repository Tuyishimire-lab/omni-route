import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  revokeToken,
  isTokenRevoked,
  pruneExpiredRevokedTokens,
  _clearMemoryRevocationCache,
} from '../tokenRevocation';
import { prisma } from '../prisma';

describe('tokenRevocation - JTI Blacklist Management', () => {
  beforeEach(() => {
    _clearMemoryRevocationCache();
    vi.restoreAllMocks();
  });

  it('returns false for unknown or unrevoked JTI', async () => {
    vi.spyOn(prisma.revokedToken, 'findUnique').mockResolvedValue(null);

    const revoked = await isTokenRevoked('unknown-jti-12345');
    expect(revoked).toBe(false);
  });

  it('handles null, undefined, or empty JTI gracefully', async () => {
    expect(await isTokenRevoked(null)).toBe(false);
    expect(await isTokenRevoked(undefined)).toBe(false);
    expect(await isTokenRevoked('')).toBe(false);
  });

  it('registers token revocation and immediately flags it as revoked', async () => {
    const jti = 'revoked-test-jti-1';
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    const userId = 'usr-test-123';

    const upsertSpy = vi.spyOn(prisma.revokedToken, 'upsert').mockResolvedValue({
      jti,
      userId,
      expiresAt,
      revokedAt: new Date(),
    });

    await revokeToken(jti, expiresAt, userId);

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jti },
        create: expect.objectContaining({ jti, userId, expiresAt }),
      })
    );

    // In-memory cache should immediately return true without even hitting database
    const findSpy = vi.spyOn(prisma.revokedToken, 'findUnique');
    const isRevoked = await isTokenRevoked(jti);
    expect(isRevoked).toBe(true);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('queries database when not in memory cache and populates cache', async () => {
    const jti = 'db-only-jti-2';
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    const findSpy = vi.spyOn(prisma.revokedToken, 'findUnique').mockResolvedValue({
      jti,
      userId: 'usr-456',
      expiresAt,
      revokedAt: new Date(),
    });

    // Cache is clear
    const firstCheck = await isTokenRevoked(jti);
    expect(firstCheck).toBe(true);
    expect(findSpy).toHaveBeenCalledTimes(1);

    // Second check should hit in-memory cache
    const secondCheck = await isTokenRevoked(jti);
    expect(secondCheck).toBe(true);
    expect(findSpy).toHaveBeenCalledTimes(1);
  });

  it('prunes expired revoked tokens from database', async () => {
    const deleteManySpy = vi.spyOn(prisma.revokedToken, 'deleteMany').mockResolvedValue({
      count: 5,
    });

    const prunedCount = await pruneExpiredRevokedTokens();
    expect(prunedCount).toBe(5);
    expect(deleteManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      })
    );
  });
});
