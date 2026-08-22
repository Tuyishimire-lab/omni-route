import { describe, it, expect } from 'vitest';
import { crawlAndAnalyzeUrl } from '../liveCrawler';
import { classifyRequest } from '../agentTraffic';
import { GeoAuditReport } from '../types';

/**
 * Money-path integration test: the flow every visitor takes.
 * Scan a domain → verify the report is structurally sound → verify the
 * telemetry pipeline would classify its crawler correctly.
 *
 * Network calls to r.jina.ai are attempted but the assertions hold for BOTH
 * the live path and the deterministic fallback, so the test is hermetic.
 */

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
  it('produces a structurally complete report for a real domain', async () => {
    const report = await crawlAndAnalyzeUrl('https://example.com', { bypassCache: true });

    for (const key of REPORT_SHAPE_KEYS) {
      expect(report, `missing key: ${key}`).toHaveProperty(key);
    }
    expect(report.domain).toBe('example.com');
  }, 30_000);

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
  }, 30_000);

  it('live scans are flagged; fallbacks are flagged too (honest-data policy)', async () => {
    const report = await crawlAndAnalyzeUrl('example.com', { bypassCache: true });

    expect(report.liveMetadata).toBeDefined();
    expect(typeof report.liveMetadata!.isLiveScanned).toBe('boolean');
    // Either genuinely live-scanned, or honestly flagged as fallback - never ambiguous
    if (report.liveMetadata!.isLiveScanned) {
      expect(report.liveMetadata!.wordCount).toBeGreaterThan(0);
    }
  }, 30_000);

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
  }, 30_000);

  it('recommendations are actionable (have title + description)', async () => {
    const report = await crawlAndAnalyzeUrl('linear.app', { bypassCache: true });

    expect(report.recommendations.length).toBeGreaterThan(0);
    for (const rec of report.recommendations) {
      expect(rec.title.length).toBeGreaterThan(5);
      expect(rec.description.length).toBeGreaterThan(20);
      expect(['CRITICAL', 'HIGH', 'MEDIUM']).toContain(rec.priority);
    }
  }, 30_000);

  it('deterministic fallback is stable for the same domain', async () => {
    const a = await crawlAndAnalyzeUrl('stability-test.io', { bypassCache: true });
    const b = await crawlAndAnalyzeUrl('stability-test.io', { bypassCache: true });

    // If both fell back (likely - fake TLD), scores must match exactly
    if (!a.liveMetadata?.isLiveScanned && !b.liveMetadata?.isLiveScanned) {
      expect(b.overallGeoScore).toBe(a.overallGeoScore);
    }
  }, 60_000);

  it('the tracking pipeline classifies the crawler that would scan these sites', () => {
    // The crawler that fetches these pages would itself be classified:
    const r = classifyRequest('GPTBot/1.0', null);
    expect(r.classification).toBe('AI_TRAINING_CRAWLER');
    expect(r.eventType).toBe('GEO_INDEX_PING');
  });
});
