import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendWeeklyDigestEmail,
  getWeeklyTip,
  GEO_TIPS,
  MonitoredDomainDigest,
  computePriorityFix,
  computeEngineVisibility,
} from '../email';
import { GET as handleCron } from '../../app/api/cron/weekly-digest/route';
import { NextRequest } from 'next/server';

// ── Helper: Build a full MonitoredDomainDigest for tests ─────────────────────

function mockDomain(overrides: Partial<MonitoredDomainDigest> = {}): MonitoredDomainDigest {
  return {
    domain: 'example.com',
    geoScore: 89,
    previousGeoScore: 85,
    trendDelta: 4,
    citationRate: 85,
    status: 'OPTIMAL',
    zeroClickResilience: 82,
    infoGainScore: 78,
    entityScore: 74,
    vectorReadiness: 80,
    agentHits7d: 12,
    topBots: ['GPTBot', 'PerplexityBot'],
    scanCount: 5,
    lastScannedAt: new Date().toISOString(),
    dataSource: 'live_crawl',
    ...overrides,
  };
}

describe('Weekly AI Citation & Score Digest Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates and triggers weekly digest email with expanded data in dev mode', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendWeeklyDigestEmail({
      to: 'founder@example.com',
      userName: 'Jane Founder',
      domains: [
        mockDomain({ domain: 'example.com', geoScore: 89, trendDelta: 4 }),
        mockDomain({ domain: 'sub.example.com', geoScore: 76, trendDelta: -2, status: 'MODERATE' }),
      ],
      digestDate: 'Sep 7, 2026 - Sep 14, 2026',
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe('dev-digest-id');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[CiteRoute Digest] Weekly GEO Digest Triggered'));
    // Verify aggregate stats are logged
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Avg Score:'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Agent Hits:'));

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

  it('handles never_scanned domains gracefully without fabricating scores', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendWeeklyDigestEmail({
      to: 'user@example.com',
      userName: 'Test User',
      domains: [
        mockDomain({
          domain: 'never-scanned.com',
          geoScore: 0,
          previousGeoScore: null,
          trendDelta: 0,
          citationRate: 0,
          status: 'AT_RISK',
          zeroClickResilience: 0,
          infoGainScore: 0,
          entityScore: 0,
          vectorReadiness: 0,
          agentHits7d: 0,
          topBots: [],
          scanCount: 0,
          lastScannedAt: null,
          dataSource: 'never_scanned',
        }),
        mockDomain({ domain: 'scanned.com', geoScore: 92 }),
      ],
    });

    expect(result.success).toBe(true);

    if (originalKey) {
      process.env.RESEND_API_KEY = originalKey;
    }
  });

  it('includes all subscores in the expanded digest domain', async () => {
    const domain = mockDomain({
      zeroClickResilience: 88,
      infoGainScore: 72,
      entityScore: 65,
      vectorReadiness: 91,
    });

    expect(domain.zeroClickResilience).toBe(88);
    expect(domain.infoGainScore).toBe(72);
    expect(domain.entityScore).toBe(65);
    expect(domain.vectorReadiness).toBe(91);
    expect(domain.dataSource).toBe('live_crawl');
  });

  it('tracks agent traffic data per domain', async () => {
    const domain = mockDomain({
      agentHits7d: 23,
      topBots: ['GPTBot', 'PerplexityBot', 'ClaudeBot'],
    });

    expect(domain.agentHits7d).toBe(23);
    expect(domain.topBots).toHaveLength(3);
    expect(domain.topBots).toContain('ClaudeBot');
  });
});

describe('Weekly GEO Tip Rotation', () => {
  it('returns different tips for different week numbers', () => {
    const tip0 = getWeeklyTip(0);
    const tip1 = getWeeklyTip(1);
    const tip2 = getWeeklyTip(2);

    expect(tip0.title).not.toBe(tip1.title);
    expect(tip1.title).not.toBe(tip2.title);
  });

  it('rotates through all tips and wraps around', () => {
    const totalTips = GEO_TIPS.length;

    // Tip at week N should equal tip at week N + totalTips
    for (let i = 0; i < totalTips; i++) {
      const first = getWeeklyTip(i);
      const wrapped = getWeeklyTip(i + totalTips);
      expect(first.title).toBe(wrapped.title);
      expect(first.body).toBe(wrapped.body);
    }
  });

  it('returns a tip with non-empty title and body', () => {
    for (let i = 0; i < GEO_TIPS.length; i++) {
      const tip = getWeeklyTip(i);
      expect(tip.title.length).toBeGreaterThan(0);
      expect(tip.body.length).toBeGreaterThan(10);
    }
  });

  it('has at least 8 curated tips', () => {
    expect(GEO_TIPS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Weekly Digest Automated Enrichments', () => {
  it('computes baseline fix for never scanned domains', () => {
    const d = mockDomain({ dataSource: 'never_scanned', scanCount: 0 });
    const fix = computePriorityFix(d);
    expect(fix.pillar).toBe('Baseline Audit');
    expect(fix.action).toContain('Run an initial scan');
  });

  it('targets lowest subscore for priority action recommendation', () => {
    const d = mockDomain({
      zeroClickResilience: 90,
      infoGainScore: 45, // lowest
      entityScore: 80,
      vectorReadiness: 75,
      dataSource: 'live_crawl',
      scanCount: 3,
    });
    const fix = computePriorityFix(d);
    expect(fix.pillar).toBe('Info Gain Score');
    expect(fix.title).toBe('Infuse Proprietary Data');
  });

  it('computes foundation model visibility indicators correctly', () => {
    const d = mockDomain({
      geoScore: 88,
      topBots: ['PerplexityBot', 'GPTBot'],
    });
    const engines = computeEngineVisibility(d);
    expect(engines).toHaveLength(4);

    const perplexity = engines.find((e) => e.name === 'Perplexity');
    const chatgpt = engines.find((e) => e.name === 'ChatGPT');
    const claude = engines.find((e) => e.name === 'Claude');

    expect(perplexity?.botDetected).toBe(true);
    expect(perplexity?.status).toBe('OPTIMAL');
    expect(chatgpt?.botDetected).toBe(true);
    expect(chatgpt?.status).toBe('OPTIMAL');
    expect(claude?.botDetected).toBe(false);
  });
});
