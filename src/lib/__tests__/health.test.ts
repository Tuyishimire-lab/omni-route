import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/health/route';
import { prisma } from '../prisma';

describe('GET /api/health', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...origEnv, DATABASE_URL: 'file:./citeroute.db' };
  });

  it('returns 200 and status: ok when all core models and config are healthy', async () => {
    vi.spyOn(prisma.domain, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.apiKey, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.rateLimitRecord, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.watchlistEntry, 'findFirst').mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.checks.db.ok).toBe(true);
    expect(data.checks.config.ok).toBe(true);
  });

  it('returns 503 and status: degraded when a core model fails (e.g. schema drift on User)', async () => {
    vi.spyOn(prisma.domain, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findFirst').mockRejectedValue(
      new Error('SQL_INPUT_ERROR: SQLite input error: no such column: main.User.lemonSubscriptionItemId')
    );
    vi.spyOn(prisma.apiKey, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.rateLimitRecord, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.watchlistEntry, 'findFirst').mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.checks.db.ok).toBe(false);
    expect(data.checks.db.error).toContain('no such column: main.User.lemonSubscriptionItemId');
  });

  it('returns 503 when ApiKey table has column drift', async () => {
    vi.spyOn(prisma.domain, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.apiKey, 'findFirst').mockRejectedValue(
      new Error('SQL_INPUT_ERROR: SQLite input error: no such column: main.ApiKey.overageCount')
    );
    vi.spyOn(prisma.rateLimitRecord, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.watchlistEntry, 'findFirst').mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.checks.db.ok).toBe(false);
  });
});
