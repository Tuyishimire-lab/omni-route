import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWeeklyDigestEmail } from '../email';
import { GET as handleCron } from '../../app/api/cron/weekly-digest/route';
import { NextRequest } from 'next/server';

describe('Weekly AI Citation & Score Digest Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates and triggers weekly digest email in development/test', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendWeeklyDigestEmail({
      to: 'founder@example.com',
      userName: 'Jane Founder',
      domains: [
        {
          domain: 'example.com',
          geoScore: 89,
          trendDelta: 4,
          citationRate: 85,
        },
        {
          domain: 'sub.example.com',
          geoScore: 76,
          trendDelta: -2,
          citationRate: 70,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe('dev-digest-id');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[CiteRoute Digest] Weekly GEO Digest Triggered'));

    if (originalKey) {
      process.env.RESEND_API_KEY = originalKey;
    }
  });

  it('rejects unauthorized cron execution in production mode without valid Bearer token', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSecret = process.env.CRON_SECRET;

    (process.env as any).NODE_ENV = 'production';
    process.env.CRON_SECRET = 'secret_cron_token_123';

    const req = new NextRequest('http://localhost:3000/api/cron/weekly-digest', {
      headers: {
        authorization: 'Bearer wrong_token',
      },
    });

    const res = await handleCron(req);
    expect(res.status).toBe(401);

    (process.env as any).NODE_ENV = originalNodeEnv;
    process.env.CRON_SECRET = originalSecret;
  });
});
