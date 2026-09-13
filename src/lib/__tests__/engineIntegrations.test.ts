/**
 * Unit tests for engineIntegrations.ts
 *
 * Tests focus on:
 * 1. parseCitationSignals - the core signal extraction logic (no network I/O)
 * 2. queryAllEngines orchestration - key filtering, parallel execution, error isolation
 * 3. Individual engine functions - error paths, timeout, malformed response handling
 *
 * All fetch calls are mocked via vi.stubGlobal so no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  queryPerplexitySonar,
  queryOpenAIForDomain,
  queryAnthropicForDomain,
  queryGeminiForDomain,
  queryAllEngines,
} from '../engineIntegrations';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function openAIResponse(content: string) {
  return { choices: [{ message: { content } }] };
}

function anthropicResponse(text: string) {
  return { content: [{ text }] };
}

function geminiResponse(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

// ── parseCitationSignals (tested indirectly through query functions) ───────────

describe('Citation signal extraction', () => {
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch(openAIResponse(''))); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns isCited=true when domain is mentioned with positive context', async () => {
    vi.stubGlobal('fetch', mockFetch(
      openAIResponse('Yes, stripe.com is a well-known payments platform. I would cite stripe.com as a source.')
    ));
    const result = await queryOpenAIForDomain('stripe.com', 'sk-test');
    expect(result.isLiveQuery).toBe(true);
    expect(result.isCited).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('returns isCited=false when engine has no knowledge of domain', async () => {
    vi.stubGlobal('fetch', mockFetch(
      openAIResponse('I have no information about this domain. I cannot find any data.')
    ));
    const result = await queryOpenAIForDomain('unknown-domain-xyz.io', 'sk-test');
    expect(result.isCited).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('extracts a citation snippet from the response', async () => {
    vi.stubGlobal('fetch', mockFetch(
      openAIResponse('Yes, stripe.com is known for its payment processing APIs. I would cite it as a trusted source.')
    ));
    const result = await queryOpenAIForDomain('stripe.com', 'sk-test');
    expect(result.citationSnippet).toBeDefined();
    expect(result.citationSnippet!.length).toBeLessThanOrEqual(200);
  });

  it('gives partial confidence when domain is mentioned but context is ambiguous', async () => {
    vi.stubGlobal('fetch', mockFetch(
      openAIResponse('stripe.com appears in my results but I am not certain of its current relevance.')
    ));
    const result = await queryOpenAIForDomain('stripe.com', 'sk-test');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(0.7);
  });
});

// ── Perplexity ────────────────────────────────────────────────────────────────

describe('queryPerplexitySonar', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns a live result on success', async () => {
    vi.stubGlobal('fetch', mockFetch(
      { choices: [{ message: { content: 'Yes, stripe.com is known for payment APIs. I would cite it.' } }] }
    ));
    const result = await queryPerplexitySonar('stripe.com', 'pplx-test');
    expect(result.engine).toBe('perplexity');
    expect(result.isLiveQuery).toBe(true);
  });

  it('returns isLiveQuery=false on HTTP error', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Unauthorized' }, 401));
    const result = await queryPerplexitySonar('stripe.com', 'bad-key');
    expect(result.isLiveQuery).toBe(false);
    expect(result.error).toContain('Perplexity API error');
  });

  it('returns isLiveQuery=false on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const result = await queryPerplexitySonar('stripe.com', 'pplx-test');
    expect(result.isLiveQuery).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('handles empty response content gracefully', async () => {
    vi.stubGlobal('fetch', mockFetch({ choices: [{ message: { content: '' } }] }));
    const result = await queryPerplexitySonar('stripe.com', 'pplx-test');
    expect(result.isLiveQuery).toBe(true);
    expect(result.isCited).toBe(false);
  });

  it('handles completely malformed response without throwing', async () => {
    vi.stubGlobal('fetch', mockFetch({})); // no choices field
    const result = await queryPerplexitySonar('stripe.com', 'pplx-test');
    expect(result.isLiveQuery).toBe(true);
    expect(result.isCited).toBe(false);
  });
});

// ── OpenAI ────────────────────────────────────────────────────────────────────

describe('queryOpenAIForDomain', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns engine=chatgpt on success', async () => {
    vi.stubGlobal('fetch', mockFetch(openAIResponse('Yes, stripe.com is known for payments. I would cite it.')));
    const result = await queryOpenAIForDomain('stripe.com', 'sk-test');
    expect(result.engine).toBe('chatgpt');
    expect(result.isLiveQuery).toBe(true);
  });

  it('returns isLiveQuery=false on 429 rate limit', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: { message: 'Rate limit exceeded' } }, 429));
    const result = await queryOpenAIForDomain('stripe.com', 'sk-test');
    expect(result.isLiveQuery).toBe(false);
    expect(result.error).toContain('OpenAI API error');
  });

  it('handles fetch abort (timeout) gracefully', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));
    const result = await queryOpenAIForDomain('stripe.com', 'sk-test');
    expect(result.isLiveQuery).toBe(false);
    expect(result.isCited).toBe(false);
  });
});

// ── Anthropic ─────────────────────────────────────────────────────────────────

describe('queryAnthropicForDomain', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns engine=claude and parses content[0].text', async () => {
    vi.stubGlobal('fetch', mockFetch(anthropicResponse('Yes, stripe.com is a payments platform I would cite.')));
    const result = await queryAnthropicForDomain('stripe.com', 'sk-ant-test');
    expect(result.engine).toBe('claude');
    expect(result.isLiveQuery).toBe(true);
    expect(result.isCited).toBe(true);
  });

  it('returns isLiveQuery=false on 403 invalid key', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: { type: 'authentication_error' } }, 403));
    const result = await queryAnthropicForDomain('stripe.com', 'bad-key');
    expect(result.isLiveQuery).toBe(false);
    expect(result.error).toContain('Anthropic API error');
  });
});

// ── Gemini ────────────────────────────────────────────────────────────────────

describe('queryGeminiForDomain', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns engine=gemini and parses candidates[0].content.parts[0].text', async () => {
    vi.stubGlobal('fetch', mockFetch(geminiResponse('Yes, stripe.com is known for payment APIs. I would cite it.')));
    const result = await queryGeminiForDomain('stripe.com', 'AIza-test');
    expect(result.engine).toBe('gemini');
    expect(result.isLiveQuery).toBe(true);
    expect(result.isCited).toBe(true);
  });

  it('returns isLiveQuery=false on Gemini API error', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: { message: 'API key not valid' } }, 400));
    const result = await queryGeminiForDomain('stripe.com', 'bad-key');
    expect(result.isLiveQuery).toBe(false);
    expect(result.error).toContain('Gemini API error');
  });
});

// ── queryAllEngines orchestrator ───────────────────────────────────────────────

describe('queryAllEngines', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('skips engines with no key provided', async () => {
    const fetchMock = mockFetch(openAIResponse('Yes, stripe.com is known. I would cite it.'));
    vi.stubGlobal('fetch', fetchMock);

    const results = await queryAllEngines('stripe.com', { openai: 'sk-test' });
    // Only 1 engine queried (openai), others skipped
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0].engine).toBe('chatgpt');
  });

  it('runs all 4 engines in parallel when all keys are provided', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'Yes, stripe.com is known. I would cite it.' } }] }), text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'Yes, stripe.com is known. I would cite it.' } }] }), text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(anthropicResponse('Yes, stripe.com is known. I would cite it.')), text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(geminiResponse('Yes, stripe.com is known. I would cite it.')), text: () => Promise.resolve('') });

    vi.stubGlobal('fetch', fetchMock);

    const results = await queryAllEngines('stripe.com', {
      perplexity: 'pplx-test',
      openai: 'sk-test',
      anthropic: 'sk-ant-test',
      gemini: 'AIza-test',
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(results).toHaveLength(4);
    const engines = results.map(r => r.engine);
    expect(engines).toContain('perplexity');
    expect(engines).toContain('chatgpt');
    expect(engines).toContain('claude');
    expect(engines).toContain('gemini');
  });

  it('isolates failures - one engine failing does not affect others', async () => {
    const fetchMock = vi.fn()
      // Perplexity succeeds
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'Yes, stripe.com is known. I would cite it.' } }] }), text: () => Promise.resolve('') })
      // OpenAI throws network error
      .mockRejectedValueOnce(new Error('Network failure'));

    vi.stubGlobal('fetch', fetchMock);

    const results = await queryAllEngines('stripe.com', {
      perplexity: 'pplx-test',
      openai: 'sk-test',
    });

    // Both return results - the failed one with isLiveQuery=false
    expect(results).toHaveLength(2);
    const perp = results.find(r => r.engine === 'perplexity');
    const oai = results.find(r => r.engine === 'chatgpt');
    expect(perp?.isLiveQuery).toBe(true);
    expect(oai?.isLiveQuery).toBe(false);
    expect(oai?.error).toBe('Network failure');
  });

  it('skips engines with empty/whitespace keys', async () => {
    const fetchMock = mockFetch(openAIResponse(''));
    vi.stubGlobal('fetch', fetchMock);

    await queryAllEngines('stripe.com', {
      perplexity: '   ',  // whitespace only - should be skipped
      openai: '',          // empty - should be skipped
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty array when no keys are provided', async () => {
    const results = await queryAllEngines('stripe.com', {});
    expect(results).toEqual([]);
  });
});
