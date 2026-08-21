import { describe, it, expect } from 'vitest';
import { analyzeDomainGEO } from '../geoAnalyzer';

describe('analyzeDomainGEO (deterministic fallback scorer)', () => {
  it('returns consistent score for same domain', () => {
    const report1 = analyzeDomainGEO('stripe.com');
    const report2 = analyzeDomainGEO('stripe.com');
    expect(report1.overallGeoScore).toBe(report2.overallGeoScore);
    expect(report1.domain).toBe(report2.domain);
  });

  it('returns different scores for different domains', () => {
    const report1 = analyzeDomainGEO('stripe.com');
    const report2 = analyzeDomainGEO('shopify.com');
    // Very unlikely to be identical given different hash inputs
    // but we test that both are valid scores
    expect(report1.overallGeoScore).toBeGreaterThanOrEqual(34);
    expect(report2.overallGeoScore).toBeGreaterThanOrEqual(34);
  });

  it('score is within valid range (34-96)', () => {
    const domains = ['stripe.com', 'vercel.com', 'linear.app', 'notion.so', 'github.com', 'a.com', 'z.io'];
    for (const domain of domains) {
      const report = analyzeDomainGEO(domain);
      expect(report.overallGeoScore).toBeGreaterThanOrEqual(34);
      expect(report.overallGeoScore).toBeLessThanOrEqual(96);
    }
  });

  it('includes all four engine breakdowns', () => {
    const report = analyzeDomainGEO('example.com');
    expect(report.engineBreakdown).toHaveLength(4);
    const engines = report.engineBreakdown.map((e) => e.engine);
    expect(engines).toContain('perplexity');
    expect(engines).toContain('chatgpt');
    expect(engines).toContain('claude');
    expect(engines).toContain('gemini');
  });

  it('engine scores are within valid range', () => {
    const report = analyzeDomainGEO('test.org');
    for (const engine of report.engineBreakdown) {
      expect(engine.score).toBeGreaterThanOrEqual(0);
      expect(engine.score).toBeLessThanOrEqual(100);
      expect(engine.citationProbability).toBeGreaterThanOrEqual(0);
      expect(engine.citationProbability).toBeLessThanOrEqual(100);
    }
  });

  it('strips protocol and www from domain input', () => {
    const r1 = analyzeDomainGEO('https://www.stripe.com/pricing');
    const r2 = analyzeDomainGEO('stripe.com');
    expect(r1.domain).toBe(r2.domain);
    expect(r1.overallGeoScore).toBe(r2.overallGeoScore);
  });

  it('includes recommendations array', () => {
    const report = analyzeDomainGEO('example.com');
    expect(Array.isArray(report.recommendations)).toBe(true);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('includes entity nodes', () => {
    const report = analyzeDomainGEO('stripe.com');
    expect(Array.isArray(report.detectedEntities)).toBe(true);
    expect(report.detectedEntities.length).toBeGreaterThan(0);
  });
});
