import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getScans } from '../../app/api/admin/scans/route';
import { GET as getUsers, PATCH as patchUsers } from '../../app/api/admin/users/route';
import { prisma } from '../prisma';
import * as authModule from '../auth';

describe('Admin API Endpoints Authorization and Handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/scans', () => {
    it('returns 403 Forbidden when unauthenticated', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/scans');
      const res = await getScans(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/admin/i);
    });

    it('returns 403 Forbidden when authenticated as standard user', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'user',
        tier: 'free',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/scans');
      const res = await getScans(req);
      expect(res.status).toBe(403);
    });

    it('returns 200 with scans array and stats when admin', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'admin-1',
        email: 'admin@citeroute.com',
        name: 'Admin',
        role: 'admin',
        tier: 'enterprise',
      });

      const mockScans = [
        {
          id: 'scan-1',
          domain: 'example.com',
          scannedAt: new Date(),
          geoScore: 88,
          status: 'OPTIMAL',
          citationRate: 75,
          zeroClickResilience: 80,
          infoGainScore: 85,
          entityScore: 90,
          vectorReadiness: 95,
          isLiveScan: true,
        },
      ];

      vi.spyOn(prisma.scanEvent, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.scanEvent, 'findMany').mockResolvedValue(mockScans as any);

      const req = new NextRequest('http://localhost:3000/api/admin/scans?page=1&limit=10');
      const res = await getScans(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.scans).toHaveLength(1);
      expect(data.scans[0].domain).toBe('example.com');
      expect(data.pagination.total).toBe(1);
      expect(data.stats).toBeDefined();
    });

    it('handles CSV export format', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'admin-1',
        email: 'admin@citeroute.com',
        name: 'Admin',
        role: 'admin',
        tier: 'enterprise',
      });

      const mockScans = [
        {
          id: 'scan-1',
          domain: 'example.com',
          scannedAt: new Date('2026-09-10T12:00:00Z'),
          geoScore: 88,
          status: 'OPTIMAL',
          citationRate: 75,
          zeroClickResilience: 80,
          infoGainScore: 85,
          entityScore: 90,
          vectorReadiness: 95,
          isLiveScan: true,
        },
      ];

      vi.spyOn(prisma.scanEvent, 'findMany').mockResolvedValue(mockScans as any);

      const req = new NextRequest('http://localhost:3000/api/admin/scans?format=csv');
      const res = await getScans(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/csv');
      const csvText = await res.text();
      expect(csvText).toContain('Scan ID,Domain,Scanned At (UTC)');
      expect(csvText).toContain('"example.com"');
    });
  });

  describe('User Directory /api/admin/users', () => {
    it('returns 403 Forbidden for non-admins on GET', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/users');
      const res = await getUsers(req);
      expect(res.status).toBe(403);
    });

    it('lists users and tier stats for admin', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'admin-1',
        email: 'admin@citeroute.com',
        name: 'Admin',
        role: 'admin',
        tier: 'enterprise',
      });

      const mockUsers = [
        {
          id: 'user-1',
          email: 'pro@test.com',
          name: 'Pro User',
          role: 'user',
          tier: 'pro',
          provider: 'email',
          createdAt: new Date(),
          lastLoginAt: null,
          isActive: true,
          _count: { apiKeys: 1, registeredSites: 1 },
        },
      ];

      vi.spyOn(prisma.user, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.user, 'findMany').mockResolvedValue(mockUsers as any);
      vi.spyOn(prisma.user, 'groupBy').mockResolvedValue([
        { tier: 'pro', _count: { id: 1 } },
      ] as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users');
      const res = await getUsers(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
      expect(data.stats.byTier.pro).toBe(1);
    });

    it('prevents an admin from deactivating their own account via PATCH', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'admin-1',
        email: 'admin@citeroute.com',
        name: 'Admin',
        role: 'admin',
        tier: 'enterprise',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'admin-1', isActive: false }),
      });

      const res = await patchUsers(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/own admin account/i);
    });

    it('allows an admin to override user tier via PATCH', async () => {
      vi.spyOn(authModule, 'getSession').mockResolvedValue({
        userId: 'admin-1',
        email: 'admin@citeroute.com',
        name: 'Admin',
        role: 'admin',
        tier: 'enterprise',
      });

      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'target-user',
        email: 'user@test.com',
        name: 'Target User',
        role: 'user',
        tier: 'agency',
        isActive: true,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'target-user', tier: 'agency' }),
      });

      const res = await patchUsers(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.tier).toBe('agency');
    });
  });
});
