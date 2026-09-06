import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crawlAndAnalyzeUrl } from '../liveCrawler';
import { classifyRequest } from '../agentTraffic';
import { GeoAuditReport } from '../types';

/**
 * Money-path integration test: the flow every visitor takes.
 * Scan a domain → verify the report is structurally sound → verify the
 * telemetry pipeline would classify its crawler correctly.
 *
 * Network calls to Jina Reader are mocked for fast, hermetic CI runs,
 * ensuring both the live path and deterministic fallbacks are thoroughly exercised.
 */

const MOCK_JINA_RESPONSE = {
  code: 200,
  status: 200,
  data: {
    title: 'Verified Domain',
    description: 'Enterprise production site with semantic data.',
    content: `# Welcome to Verified Domain

## Features and Capabilities
Our platform provides high-performance APIs and vector-ready datasets.

### Schema and Entity Data
Structured with Schema.org JSON-LD and canonical entities.

| Metric | Value | Status |
| --- | --- | --- |
| Latency | <5ms | Optimal |
| Uptime | 99.99% | Active |
`,
  },
};

const REPORT_SHAPE_KEYS: (keyof GeoAuditReport)[] = [
  'domain',
  'url',
  'analyzedAt',
  'overallGeoScore',
  'zeroClickResilience',
  'informationGainScore',
  'entityDisambiguationScore',
  'vectorReadinessScore',
  'engineBreakdown',
  'detectedEntities',
  'recommendations',
  'summary',
];

describe('money path: scan → report → classify', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (urlStr.includes('r.jina.ai')) {
        return new Response(JSON.stringify(MOCK_JINA_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not Found', { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('produces a structurally complete report for a real domain', async () => {
    const report = await crawlAndAnalyzeUrl('https://example.com', { bypassCache: true });

    for (const key of REPORT_SHAPE_KEYS) {
      expect(report, `missing key: ${key}`).toHaveProperty(key);
    }
    expect(report.domain).toBe('example.com');
  });

  it('scores are always within valid bounds', async () => {
    const report = await crawlAndAnalyzeUrl('stripe.com', { bypassCache: true });

    const scores = [
      report.overallGeoScore,
      report.zeroClickResilience,
      report.informationGainScore,
      report.entityDisambiguationScore,
      report.vectorReadinessScore,
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
      expect(Number.isFinite(s)).toBe(true);
    }
  });

  it('live scans are flagged; fallbacks are flagged too (honest-data policy)', async () => {
    const report = await crawlAndAnalyzeUrl('example.com', { bypassCache: true });

    expect(report.liveMetadata).toBeDefined();
    expect(typeof report.liveMetadata!.isLiveScanned).toBe('boolean');
    // Either genuinely live-scanned, or honestly flagged as fallback - never ambiguous
    if (report.liveMetadata!.isLiveScanned) {
      expect(report.liveMetadata!.wordCount).toBeGreaterThan(0);
    }
  });

  it('engine breakdown covers all four engines with consistent data', async () => {
    const report = await crawlAndAnalyzeUrl('vercel.com', { bypassCache: true });

    const engines = report.engineBreakdown.map((e) => e.engine).sort();
    expect(engines).toEqual(['chatgpt', 'claude', 'gemini', 'perplexity']);
    for (const e of report.engineBreakdown) {
      expect(e.score).toBeGreaterThanOrEqual(0);
      expect(e.score).toBeLessThanOrEqual(100);
      expect(e.citationProbability).toBeGreaterThanOrEqual(0);
      expect(e.citationProbability).toBeLessThanOrEqual(100);
      expect(e.indexedChunks).toBeGreaterThan(0);
    }
  });

  it('recommendations are actionable (have title + description)', async () => {
    const report = await crawlAndAnalyzeUrl('linear.app', { bypassCache: true });

    expect(report.recommendations.length).toBeGreaterThan(0);
    for (const rec of report.recommendations) {
      expect(rec.title.length).toBeGreaterThan(5);
      expect(rec.description.length).toBeGreaterThan(20);
      expect(['CRITICAL', 'HIGH', 'MEDIUM']).toContain(rec.priority);
    }
  });

  it('deterministic fallback is stable for the same domain', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Simulated network offline'));

    const a = await crawlAndAnalyzeUrl('stability-test.io', { bypassCache: true });
    const b = await crawlAndAnalyzeUrl('stability-test.io', { bypassCache: true });

    expect(a.liveMetadata?.isLiveScanned).toBe(false);
    expect(b.liveMetadata?.isLiveScanned).toBe(false);
    expect(b.overallGeoScore).toBe(a.overallGeoScore);
  });

  it('the tracking pipeline classifies the crawler that would scan these sites', () => {
    // The crawler that fetches these pages would itself be classified:
    const r = classifyRequest('GPTBot/1.0', null);
    expect(r.classification).toBe('AI_TRAINING_CRAWLER');
    expect(r.eventType).toBe('GEO_INDEX_PING');
  });
});
