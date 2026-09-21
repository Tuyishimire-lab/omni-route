import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  buildDomainProbeQuery,
  analyzeProbeResponse,
  probeSingleEngine,
  probeAllEngines,
  cleanSnippetText,
  TARGET_ENGINES,
} from '../citationProber';
import * as openrouter from '../openrouter';

vi.mock('../openrouter', () => ({
  completeWithCascade: vi.fn(),
  isAiEngineConfigured: vi.fn(),
}));

describe('citationProber', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cleanSnippetText', () => {
    it('strips bold and italic markdown', () => {
      const raw = 'I would cite **openai.com** and *developers.openai.com* as sources.';
      expect(cleanSnippetText(raw)).toBe(
        'I would cite openai.com and developers.openai.com as sources.'
      );
    });

    it('strips footnote citation brackets', () => {
      const raw = 'Primary sources include openai.com.[10][12][14][17][19]';
      expect(cleanSnippetText(raw)).toBe('Primary sources include openai.com.');
    });

    it('cleans markdown links and em dashes', () => {
      const raw = 'Check [OpenAI](https://openai.com) — a leading platform.';
      const cleaned = cleanSnippetText(raw);
      expect(cleaned).toContain('Check OpenAI');
      expect(cleaned).not.toContain('—');
      expect(cleaned).not.toContain('[');
    });
  });

  describe('buildDomainProbeQuery', () => {
    it('constructs query and strips protocol and path', () => {
      const query = buildDomainProbeQuery('https://example.com/docs/api');
      expect(query).toContain('example.com');
      expect(query).not.toContain('https://');
      expect(query).not.toContain('/docs/api');
    });

    it('contains no em dashes', () => {
      const query = buildDomainProbeQuery('stripe.com');
      expect(query).not.toContain('—');
      expect(query).not.toContain('--');
    });
  });

  describe('analyzeProbeResponse', () => {
    it('identifies positive citation when brand is mentioned with authoritative context', () => {
      const text =
        'Stripe is a leading financial infrastructure platform. It provides APIs that developers rely on globally. You can find their docs at https://stripe.com.';
      const result = analyzeProbeResponse('stripe.com', text);

      expect(result.isCited).toBe(true);
      expect(result.citationStatus).toBe('actively_cited');
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.sentimentRating).toBe('High Authority');
      expect(result.citationSnippet).toBeTruthy();
      expect(result.citationUrl).toBe('https://stripe.com');
    });

    it('accurately identifies Gemini-style attribution ("According to [domain], core capabilities include...")', () => {
      const text =
        'According to openai.com, the core capabilities include AI research and product development, deployment of models such as ChatGPT and developer tools such as the OpenAI API.';
      const result = analyzeProbeResponse('openai.com', text);

      expect(result.isCited).toBe(true);
      expect(result.citationStatus).toBe('actively_cited');
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.citationProbability).toBeGreaterThanOrEqual(80);
      expect(result.sentimentRating).toBe('High Authority');
      expect(result.citationSnippet).toContain('According to openai.com');
    });

    it('accurately identifies Claude-style latent entity memory as "entity_recognized"', () => {
      const text =
        'OpenAI is an AI research organization that develops machine learning tools and language models like ChatGPT and the OpenAI API suite.';
      const result = analyzeProbeResponse('openai.com', text);

      expect(result.isCited).toBe(true);
      expect(result.citationStatus).toBe('entity_recognized');
      expect(result.score).toBeGreaterThanOrEqual(65);
      expect(result.sentimentRating).toBe('Moderate');
    });

    it('identifies negative or missing citations as "omitted"', () => {
      const text =
        'I cannot find any specific information regarding this entity in my knowledge base. There is no data available for this query.';
      const result = analyzeProbeResponse('unknown-startup-xyz.org', text);

      expect(result.isCited).toBe(false);
      expect(result.citationStatus).toBe('omitted');
      expect(result.score).toBeLessThanOrEqual(50);
      expect(result.sentimentRating).toBe('Low / Excluded');
    });

    it('strips markdown asterisks and footnotes in the extracted snippet', () => {
      const text =
        'I would cite **openai.com** and **developers.openai.com** as the primary sources for verified offerings.[10][12][14]';
      const result = analyzeProbeResponse('openai.com', text);

      expect(result.citationSnippet).not.toContain('**');
      expect(result.citationSnippet).not.toContain('[10]');
      expect(result.citationSnippet).toBe(
        'I would cite openai.com and developers.openai.com as the primary sources for verified offerings.'
      );
    });
  });

  describe('probeSingleEngine', () => {
    it('returns baseline fallback when AI engine is not configured', async () => {
      vi.mocked(openrouter.isAiEngineConfigured).mockReturnValue(false);

      const engine = TARGET_ENGINES[0];
      const result = await probeSingleEngine('example.com', engine);

      expect(result.isLiveQuery).toBe(false);
      expect(result.engine).toBe('perplexity');
      expect(result.modelRole).toBe('Live Web Retrieval');
      expect(result.citationSnippet).toContain('CiteRoute Engine not configured');
      expect(openrouter.completeWithCascade).not.toHaveBeenCalled();
    });

    it('dispatches live completion and analyzes response when configured', async () => {
      vi.mocked(openrouter.isAiEngineConfigured).mockReturnValue(true);
      vi.mocked(openrouter.completeWithCascade).mockResolvedValue({
        text: 'According to example.com, core capabilities include developer APIs and documentation.',
        modelUsed: 'perplexity/sonar',
        attempts: 1,
      });

      const engine = TARGET_ENGINES[0];
      const result = await probeSingleEngine('example.com', engine);

      expect(result.isLiveQuery).toBe(true);
      expect(result.isCited).toBe(true);
      expect(result.citationStatus).toBe('actively_cited');
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(openrouter.completeWithCascade).toHaveBeenCalledTimes(1);
    });

    it('gracefully handles timeout or error without throwing', async () => {
      vi.mocked(openrouter.isAiEngineConfigured).mockReturnValue(true);
      vi.mocked(openrouter.completeWithCascade).mockRejectedValue(
        new Error('Network timeout after 14000ms')
      );

      const engine = TARGET_ENGINES[1];
      const result = await probeSingleEngine('example.com', engine);

      expect(result.isLiveQuery).toBe(false);
      expect(result.citationSnippet).toContain('Direct citation not verified');
    });
  });

  describe('probeAllEngines', () => {
    it('probes all 4 target engines with accurate model roles', async () => {
      vi.mocked(openrouter.isAiEngineConfigured).mockReturnValue(false);

      const results = await probeAllEngines('example.com');

      expect(results).toHaveLength(4);
      const engineIds = results.map((r) => r.engine);
      expect(engineIds).toContain('perplexity');
      expect(engineIds).toContain('chatgpt');
      expect(engineIds).toContain('claude');
      expect(engineIds).toContain('gemini');

      const claude = results.find((r) => r.engine === 'claude');
      expect(claude?.name).toBe('Claude 3.5 Knowledge Graph');
      expect(claude?.modelRole).toBe('Latent Entity Memory');
    });
  });
});
