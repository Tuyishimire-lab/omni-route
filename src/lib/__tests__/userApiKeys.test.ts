import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createApiKey, getUserApiKeys, revokeUserApiKey } from '../apiAuth';
import { prisma } from '../prisma';

describe('User API Keys Management', () => {
  const testUser1Id = 'test-apikey-user-1';
  const testUser2Id = 'test-apikey-user-2';

  beforeEach(async () => {
    // Ensure test users exist in DB
    await prisma.user.upsert({
      where: { id: testUser1Id },
      create: {
        id: testUser1Id,
        email: 'apikey-test1@citeroute.com',
        name: 'API Key Tester 1',
        role: 'user',
        tier: 'pro',
      },
      update: {},
    });

    await prisma.user.upsert({
      where: { id: testUser2Id },
      create: {
        id: testUser2Id,
        email: 'apikey-test2@citeroute.com',
        name: 'API Key Tester 2',
        role: 'user',
        tier: 'agency',
      },
      update: {},
    });

    // Clean up any test keys
    await prisma.apiKey.deleteMany({
      where: { userId: { in: [testUser1Id, testUser2Id] } },
    });
  });

  afterAll(async () => {
    await prisma.apiKey.deleteMany({
      where: { userId: { in: [testUser1Id, testUser2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUser1Id, testUser2Id] } },
    });
  });

  it('creates an API key linked to a user and assigns appropriate tier rate limit', async () => {
    const key = await createApiKey('Test Pro Key', 'pro', 'example.com', testUser1Id);

    expect(key).toBeDefined();
    expect(key.key).toMatch(/^or-live_[a-f0-9]{48}$/);
    expect(key.keyPrefix).toBe(key.key.slice(0, 16));
    expect(key.tier).toBe('pro');
    expect(key.rateLimit).toBe(1000);
    expect(key.userId).toBe(testUser1Id);
  });

  it('lists only keys owned by the specific user', async () => {
    await createApiKey('Key User 1', 'pro', undefined, testUser1Id);
    await createApiKey('Key User 2', 'agency', undefined, testUser2Id);

    const user1Keys = await getUserApiKeys(testUser1Id);
    expect(user1Keys.length).toBe(1);
    expect(user1Keys[0].name).toBe('Key User 1');

    const user2Keys = await getUserApiKeys(testUser2Id);
    expect(user2Keys.length).toBe(1);
    expect(user2Keys[0].name).toBe('Key User 2');
  });

  it('revokes a key only if the authenticated user is the owner', async () => {
    const key1 = await createApiKey('Key User 1', 'pro', undefined, testUser1Id);

    // Other user attempts to revoke key1 -> should fail (return null)
    const unauthorizedRevocation = await revokeUserApiKey(testUser2Id, key1.id);
    expect(unauthorizedRevocation).toBeNull();

    // Owner revokes key1 -> should succeed
    const authorizedRevocation = await revokeUserApiKey(testUser1Id, key1.id);
    expect(authorizedRevocation).toBeDefined();
    expect(authorizedRevocation?.id).toBe(key1.id);

    // Confirm it no longer exists
    const keysRemaining = await getUserApiKeys(testUser1Id);
    expect(keysRemaining.length).toBe(0);
  });
});
