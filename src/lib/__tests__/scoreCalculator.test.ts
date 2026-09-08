import { describe, it, expect } from 'vitest';
import {
  hashDomain,
  computeDeterministicGeoSubscores,
  computeLiveGeoSubscores,
  buildEngineBreakdown,
  buildDetectedEntities,
  buildRecommendations,
  buildScoreSummary,
} from '../scoreCalculator';
import { LiveExtractionMetadata } from '../types';

describe('scoreCalculator', () => {
  describe('hashDomain', () => {
    it('produces consistent non-negative integers', () => {
      const h1 = hashDomain('example.com');
      const h2 = hashDomain('example.com');
      expect(h1).toBe(h2);
      expect(h1).toBeGreaterThanOrEqual(0);
    });

    it('produces different hashes for different domains', () => {
      expect(hashDomain('apple.com')).not.toBe(hashDomain('google.com'));
    });
  });

  describe('computeDeterministicGeoSubscores', () => {
    it('clamps all subscores to valid GEO ranges', () => {
      const domains = ['test.com', 'acme.org', 'dev.co', 'very-long-domain-name-with-hyphens.io'];
      for (const d of domains) {
        const scores = computeDeterministicGeoSubscores(d);
        expect(scores.overallGeoScore).toBeGreaterThanOrEqual(34);
        expect(scores.overallGeoScore).toBeLessThanOrEqual(96);
        expect(scores.zeroClickResilience).toBeGreaterThanOrEqual(30);
        expect(scores.zeroClickResilience).toBeLessThanOrEqual(94);
        expect(scores.informationGainScore).toBeGreaterThanOrEqual(35);
        expect(scores.informationGainScore).toBeLessThanOrEqual(98);
        expect(scores.entityDisambiguationScore).toBeGreaterThanOrEqual(40);
        expect(scores.entityDisambiguationScore).toBeLessThanOrEqual(95);
        expect(scores.vectorReadinessScore).toBeGreaterThanOrEqual(28);
        expect(scores.vectorReadinessScore).toBeLessThanOrEqual(97);
      }
    });
  });

  describe('computeLiveGeoSubscores', () => {
    const baseMeta: LiveExtractionMetadata = {
      isLiveScanned: true,
      schemaJsonLdCount: 2,
      h1Count: 1,
      h2Count: 4,
      tableCount: 1,
      wordCount: 1600,
      hasRobotsIndexingAllowed: true,
      detectedSchemas: ['Organization', 'Product', 'FAQPage'],
      extractedTitle: 'Test Title',
      extractedDescription: 'Test Description',
    };

    it('awards full bonuses for rich live metadata', () => {
      const scores = computeLiveGeoSubscores(baseMeta, 'richdomain.com');
      expect(scores.overallGeoScore).toBeGreaterThan(80);
      expect(scores.zeroClickResilience).toBeGreaterThan(scores.overallGeoScore - 5);
      expect(scores.informationGainScore).toBeGreaterThan(scores.overallGeoScore);
    });

    it('handles sparse live metadata gracefully', () => {
      const sparseMeta: LiveExtractionMetadata = {
        isLiveScanned: true,
        schemaJsonLdCount: 0,
        h1Count: 0,
        h2Count: 0,
        tableCount: 0,
        wordCount: 50,
        hasRobotsIndexingAllowed: true,
        detectedSchemas: [],
      };
      const scores = computeLiveGeoSubscores(sparseMeta, 'emptydomain.com');
      expect(scores.overallGeoScore).toBeGreaterThanOrEqual(32);
      expect(scores.overallGeoScore).toBeLessThan(70);
    });
  });

  describe('buildEngineBreakdown', () => {
    it('generates all 4 engine scores with valid ranges and sentiment', () => {
      const engines = buildEngineBreakdown(82, 1000);
      expect(engines).toHaveLength(4);

      const perplexity = engines.find((e) => e.engine === 'perplexity')!;
      expect(perplexity.sentimentRating).toBe('High Authority');
      expect(perplexity.citationProbability).toBeGreaterThan(70);

      for (const e of engines) {
        expect(e.score).toBeGreaterThanOrEqual(0);
        expect(e.score).toBeLessThanOrEqual(100);
        expect(e.citationProbability).toBeGreaterThanOrEqual(0);
        expect(e.citationProbability).toBeLessThanOrEqual(100);
        expect(e.lastCrawledAgent).toBeTruthy();
      }
    });
  });

  describe('buildDetectedEntities', () => {
    it('produces brand, product, industry, feature, and competitor entities', () => {
      const entities = buildDetectedEntities('Acme', 85);
      expect(entities.length).toBeGreaterThanOrEqual(4);
      expect(entities.some((e) => e.type === 'Brand')).toBe(true);
      expect(entities.some((e) => e.type === 'Product')).toBe(true);
      expect(entities.every((e) => e.confidence > 0 && e.confidence <= 1)).toBe(true);
    });
  });

  describe('buildRecommendations', () => {
    it('produces prioritized recommendations with code snippets', () => {
      const recs = buildRecommendations({
        cleanDomain: 'stripe.com',
        brandName: 'Stripe',
      });
      expect(recs.length).toBe(4);
      expect(recs[0].category).toBe('Agentic API');
      expect(recs[0].codeSnippet).toContain('agent.json');
    });
  });

  describe('buildScoreSummary', () => {
    it('returns high authority summary for score >= 80', () => {
      const summary = buildScoreSummary('stripe.com', 85);
      expect(summary).toContain('strong semantic authority');
    });

    it('returns moderate visibility summary for score 60-79', () => {
      const summary = buildScoreSummary('mid.com', 65);
      expect(summary).toContain('moderately visible');
    });

    it('returns at risk summary for score < 60', () => {
      const summary = buildScoreSummary('low.com', 45);
      expect(summary).toContain('severe risk');
    });
  });
});
