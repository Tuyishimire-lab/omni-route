import { prisma } from './prisma';

/**
 * In-memory fast cache to eliminate redundant database probes for recently revoked tokens.
 * In serverless environments, this speeds up execution within the same execution context.
 */
const memoryRevocationCache = new Set<string>();

/**
 * Maximum items retained in memory cache to prevent unbounded growth.
 */
const MAX_MEMORY_CACHE_SIZE = 5000;

/**
 * Revokes a session token by its unique JWT ID (jti).
 * Records the revocation in the persistent database and populates the local fast cache.
 */
export async function revokeToken(
  jti: string,
  expiresAt: Date,
  userId?: string
): Promise<void> {
  if (!jti || typeof jti !== 'string') return;

  // Add to local fast cache
  if (memoryRevocationCache.size >= MAX_MEMORY_CACHE_SIZE) {
    // Clear oldest items if cache reaches limit
    memoryRevocationCache.clear();
  }
  memoryRevocationCache.add(jti);

  try {
    await prisma.revokedToken.upsert({
      where: { jti },
      create: {
        jti,
        userId: userId ?? null,
        expiresAt,
      },
      update: {
        expiresAt,
      },
    });
  } catch (err) {
    console.error(`[tokenRevocation] Failed to persist revoked token ${jti}:`, err);
  }
}

/**
 * Checks whether a given JWT ID (jti) has been revoked.
 * Returns true if the token is revoked, false otherwise.
 */
export async function isTokenRevoked(jti?: string | null): Promise<boolean> {
  if (!jti || typeof jti !== 'string') return false;

  // 1. Fast path: check in-memory cache
  if (memoryRevocationCache.has(jti)) {
    return true;
  }

  // 2. Persistent path: query database
  try {
    const record = await prisma.revokedToken.findUnique({
      where: { jti },
      select: { jti: true, expiresAt: true },
    });

    if (record) {
      // Token is recorded in the blacklist
      memoryRevocationCache.add(jti);
      return true;
    }

    return false;
  } catch (err) {
    console.warn(`[tokenRevocation] Database lookup failed for jti ${jti}:`, err);
    // Fail-open for transient network errors only if not in memory, but log warning
    return false;
  }
}

/**
 * Housekeeping: Prunes expired tokens from the revocation database.
 * Because session tokens expire naturally (e.g. 1 hour), records older than
 * their expiration timestamp no longer need to be kept.
 */
export async function pruneExpiredRevokedTokens(): Promise<number> {
  try {
    const result = await prisma.revokedToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  } catch (err) {
    console.error('[tokenRevocation] Failed to prune expired tokens:', err);
    return 0;
  }
}

/**
 * Dev/Test helper: Clears the in-memory fast cache.
 */
export function _clearMemoryRevocationCache(): void {
  memoryRevocationCache.clear();
}
