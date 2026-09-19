import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enhanceAuditReportWithAi } from '../aiReportEnhancer';
import { GeoAuditReport } from '../types';
import { clearModelCache, resetModelCooldowns } from '../openrouter';

const sampleReport: GeoAuditReport = {
  domain: 'stripe.com',
  url: 'https://stripe.com',
  analyzedAt: new Date().toISOString(),
  overallGeoScore: 82,
  zeroClickResilience: 78,
  informationGainScore: 85,
  entityDisambiguationScore: 89,
  vectorReadinessScore: 80,
  engineBreakdown: [],
  detectedEntities: [],
  recommendations: [],
  summary: 'Original summary from deterministic engine',
  dataSource: 'live_crawl',
  liveMetadata: {
    isLiveScanned: true,
    extractedTitle: 'Stripe | Financial Infrastructure for the Internet',
    extractedDescription: 'Payments infrastructure for commerce.',
    schemaJsonLdCount: 2,
    h1Count: 1,
    h2Count: 5,
    tableCount: 2,
    wordCount: 1200,
    hasRobotsIndexingAllowed: true,
    detectedSchemas: ['Organization', 'SoftwareApplication'],
  },
};

/** Mock /models discovery endpoint response */
const mockDiscoveryResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    data: [
      {
        id: 'test/ai-engine-model:free',
        name: 'Test AI Model (free)',
        context_length: 131072,
        pricing: { prompt: '0', completion: '0' },
        architecture: { modality: 'text->text' },
        supported_parameters: ['response_format', 'max_tokens'],
      },
    ],
  }),
};

describe('enhanceAuditReportWithAi', () => {
  const originalEnv = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearModelCache();
    resetModelCooldowns();
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalEnv;
    vi.restoreAllMocks();
    clearModelCache();
    resetModelCooldowns();
  });

  it('returns original report unchanged if OPENROUTER_API_KEY is not set', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const result = await enhanceAuditReportWithAi(sampleReport);
    expect(result.aiInsights).toBeUndefined();
    expect(result.summary).toBe(sampleReport.summary);
  });

  it('enriches report with aiInsights when AI Engine returns valid data', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key-or';

    const mockAiResponse = {
      executiveSummary: 'Stripe dominates financial infrastructure citations across Perplexity and ChatGPT.',
      topicalAuthorityScore: 94,
      citationRiskFactors: ['API documentation requires higher tabular density for RAG chunking.'],
      tailoredSchemas: [
        {
          type: 'Organization',
          title: 'Stripe Corporate Entity Disambiguation',
          description: 'SameAs links to Wikidata Q28407767',
          jsonLd: '{"@context":"https://schema.org","@type":"Organization","name":"Stripe"}',
        },
      ],
      suggestedAgentManifest: '{"version":"1.2.0","siteName":"Stripe Core Node"}',
      contentRewrites: [
        {
          originalIssue: 'Vague marketing slogan',
          suggestedCopy: 'Processed over $1 Trillion in volume across 195+ countries.',
          rationale: 'Empirical numbers yield higher extraction confidence in answer engines.',
        },
      ],
      competitorStrategies: ['Maintain technical docs parity against Adyen and Checkout.com.'],
    };

    // First call = model discovery, subsequent calls = chat completion
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockDiscoveryResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'test/ai-engine-model:free',
          choices: [
            {
              message: {
                content: JSON.stringify(mockAiResponse),
              },
            },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await enhanceAuditReportWithAi(sampleReport, 'Sample page markdown');

    expect(result.aiInsights).toBeDefined();
    expect(result.aiInsights?.modelUsed).toBe('test/ai-engine-model:free');
    expect(result.aiInsights?.topicalAuthorityScore).toBe(94);
    expect(result.aiInsights?.tailoredSchemas).toHaveLength(1);
    expect(result.aiInsights?.contentRewrites).toHaveLength(1);
    expect(result.summary).toBe(mockAiResponse.executiveSummary);
  });

  it('falls back safely to original report if AI Engine throws an error', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key-or';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network offline or AI service unavailable'))
    );

    const result = await enhanceAuditReportWithAi(sampleReport);
    expect(result.aiInsights).toBeUndefined();
    expect(result.overallGeoScore).toBe(82);
  });
});
