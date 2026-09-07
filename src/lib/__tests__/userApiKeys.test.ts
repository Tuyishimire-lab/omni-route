import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiKey, getUserApiKeys, revokeUserApiKey } from '../apiAuth';
import { prisma } from '../prisma';

describe('User API Keys Management', () => {
  const testUser1Id = 'test-apikey-user-1';
  const testUser2Id = 'test-apikey-user-2';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an API key linked to a user and assigns appropriate tier rate limit', async () => {
    vi.spyOn(prisma.apiKey, 'create').mockImplementation(async (args: any) => ({
      id: 'key-test-1',
      keyHash: args.data.keyHash,
      keyPrefix: args.data.keyPrefix,
      name: args.data.name,
      tier: args.data.tier,
      domain: args.data.domain,
      rateLimit: args.data.rateLimit,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: new Date(),
      isActive: true,
      userId: args.data.userId,
    }));

    const key = await createApiKey('Test Pro Key', 'pro', 'example.com', testUser1Id);

    expect(key).toBeDefined();
    expect(key.key).toMatch(/^or-live_[a-f0-9]{48}$/);
    expect(key.keyPrefix).toBe(key.key.slice(0, 16));
    expect(key.tier).toBe('pro');
    expect(key.rateLimit).toBe(1000);
    expect(key.userId).toBe(testUser1Id);
  });

  it('lists only keys owned by the specific user', async () => {
    const mockDbKeys = [
      {
        id: 'key-1',
        keyPrefix: 'or-live_abc12345',
        name: 'Key User 1',
        tier: 'pro',
        domain: null,
        rateLimit: 1000,
        usageCount: 5,
        lastUsedAt: null,
        createdAt: new Date(),
        isActive: true,
        userId: testUser1Id,
      },
      {
        id: 'key-2',
        keyPrefix: 'or-live_def67890',
        name: 'Key User 2',
        tier: 'agency',
        domain: null,
        rateLimit: 5000,
        usageCount: 12,
        lastUsedAt: null,
        createdAt: new Date(),
        isActive: true,
        userId: testUser2Id,
      },
    ];

    vi.spyOn(prisma.apiKey, 'findMany').mockImplementation(async (args: any) => {
      return mockDbKeys
        .filter((k) => k.userId === args.where.userId)
        .map(({ userId, ...rest }) => rest as any);
    });

    const user1Keys = await getUserApiKeys(testUser1Id);
    expect(user1Keys.length).toBe(1);
    expect(user1Keys[0].name).toBe('Key User 1');

    const user2Keys = await getUserApiKeys(testUser2Id);
    expect(user2Keys.length).toBe(1);
    expect(user2Keys[0].name).toBe('Key User 2');
  });

  it('revokes a key only if the authenticated user is the owner', async () => {
    const existingKey = {
      id: 'key-1',
      userId: testUser1Id,
      keyHash: 'dummyhash',
      keyPrefix: 'or-live_abc12345',
      name: 'Key User 1',
      tier: 'pro',
      domain: null,
      rateLimit: 1000,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: new Date(),
      isActive: true,
    };

    vi.spyOn(prisma.apiKey, 'findFirst').mockImplementation(async (args: any) => {
      if (args.where.id === existingKey.id && args.where.userId === existingKey.userId) {
        return existingKey as any;
      }
      return null;
    });

    vi.spyOn(prisma.apiKey, 'delete').mockImplementation(async (args: any) => {
      if (args.where.id === existingKey.id) {
        return existingKey as any;
      }
      throw new Error('Record not found');
    });

    // Other user attempts to revoke key1 -> should return null
    const unauthorizedRevocation = await revokeUserApiKey(testUser2Id, existingKey.id);
    expect(unauthorizedRevocation).toBeNull();

    // Owner revokes key1 -> should succeed
    const authorizedRevocation = await revokeUserApiKey(testUser1Id, existingKey.id);
    expect(authorizedRevocation).toBeDefined();
    expect(authorizedRevocation?.id).toBe(existingKey.id);
  });
});
