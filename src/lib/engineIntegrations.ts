/**
 * CiteRoute Engine Integrations
 * ─────────────────────────────
 * Queries AI answer engines directly about a domain to obtain real citation signals.
 * Each function is independent and gracefully handles missing / invalid API keys.
 *
 * These are called server-side (never from the client) so API keys are never exposed.
 * Keys flow in from the client-side settings page via the /api/v1/engine-query route,
 * which proxies the call and discards the key immediately after use.
 */

import { EngineQueryResult, EngineType } from './types';

// Shared timeout for all engine HTTP calls (ms)
const ENGINE_TIMEOUT_MS = 20_000;

/** Prompt template used for all engines - asks about domain visibility */
function buildDomainProbe(domain: string): string {
  return (
    `You are a factual research assistant. Please answer the following:\n\n` +
    `1. Do you have any information about "${domain}" in your knowledge base or search index?\n` +
    `2. If yes, briefly describe what "${domain}" does or is known for (1-2 sentences max).\n` +
    `3. Would you cite "${domain}" as a source if a user asked about topics related to it?\n\n` +
    `Be concise and factual. If you have no data about "${domain}", say so directly.`
  );
}

/** Extract domain mention confidence from engine response text */
function parseCitationSignals(domain: string, text: string): {
  isCited: boolean;
  confidence: number;
  citationSnippet?: string;
} {
  const lower = text.toLowerCase();
  const domainLower = domain.toLowerCase();

  // Negative indicators
  const noDataPhrases = [
    'no information', 'no data', 'not aware', 'don\'t have information',
    'no knowledge', 'cannot find', 'not in my knowledge', 'no results',
    "don't know", 'unable to find',
  ];
  const hasNoData = noDataPhrases.some(p => lower.includes(p));

  // Positive indicators - domain mentioned with affirmative context
  const isMentioned = lower.includes(domainLower) || lower.includes(domain.split('.')[0].toLowerCase());
  const hasPositiveContext = lower.includes('yes') || lower.includes('would cite') || lower.includes('known for') || lower.includes('is a');

  const isCited = isMentioned && hasPositiveContext && !hasNoData;

  // Confidence scoring
  let confidence = 0.0;
  if (isCited) {
    confidence = 0.7;
    if (lower.includes('would cite')) confidence += 0.15;
    if (lower.includes('known for') || lower.includes('is a platform') || lower.includes('is a tool')) confidence += 0.10;
    if (text.length > 200) confidence += 0.05; // longer = more confident
  } else if (hasNoData) {
    confidence = 0.0;
  } else if (isMentioned) {
    confidence = 0.35; // mentioned but ambiguous
  }

  confidence = Math.min(1.0, confidence);

  // Extract a short snippet - the sentence most relevant to the domain
  const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 10);
  const relevantSentence = sentences.find(s =>
    s.toLowerCase().includes(domainLower) || s.toLowerCase().includes(domain.split('.')[0].toLowerCase())
  );

  return {
    isCited,
    confidence,
    citationSnippet: relevantSentence ? relevantSentence.slice(0, 200) : undefined,
  };
}

// ── Perplexity Sonar ──────────────────────────────────────────────────────────

export async function queryPerplexitySonar(
  domain: string,
  apiKey: string
): Promise<EngineQueryResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'user', content: buildDomainProbe(domain) },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      return { engine: 'perplexity', isLiveQuery: false, isCited: false, confidence: 0, error: `Perplexity API error: ${errText.slice(0, 120)}` };
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const signals = parseCitationSignals(domain, text);

    return {
      engine: 'perplexity',
      isLiveQuery: true,
      ...signals,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { engine: 'perplexity', isLiveQuery: false, isCited: false, confidence: 0, error: message };
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

export async function queryOpenAIForDomain(
  domain: string,
  apiKey: string
): Promise<EngineQueryResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: buildDomainProbe(domain) },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      return { engine: 'chatgpt', isLiveQuery: false, isCited: false, confidence: 0, error: `OpenAI API error: ${errText.slice(0, 120)}` };
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const signals = parseCitationSignals(domain, text);

    return {
      engine: 'chatgpt',
      isLiveQuery: true,
      ...signals,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { engine: 'chatgpt', isLiveQuery: false, isCited: false, confidence: 0, error: message };
  }
}

// ── Anthropic / Claude ────────────────────────────────────────────────────────

export async function queryAnthropicForDomain(
  domain: string,
  apiKey: string
): Promise<EngineQueryResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        messages: [
          { role: 'user', content: buildDomainProbe(domain) },
        ],
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      return { engine: 'claude', isLiveQuery: false, isCited: false, confidence: 0, error: `Anthropic API error: ${errText.slice(0, 120)}` };
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const signals = parseCitationSignals(domain, text);

    return {
      engine: 'claude',
      isLiveQuery: true,
      ...signals,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { engine: 'claude', isLiveQuery: false, isCited: false, confidence: 0, error: message };
  }
}

// ── Google Gemini ─────────────────────────────────────────────────────────────

export async function queryGeminiForDomain(
  domain: string,
  apiKey: string
): Promise<EngineQueryResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildDomainProbe(domain) }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.1 },
        }),
      }
    );

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      return { engine: 'gemini', isLiveQuery: false, isCited: false, confidence: 0, error: `Gemini API error: ${errText.slice(0, 120)}` };
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const signals = parseCitationSignals(domain, text);

    return {
      engine: 'gemini',
      isLiveQuery: true,
      ...signals,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { engine: 'gemini', isLiveQuery: false, isCited: false, confidence: 0, error: message };
  }
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface EngineKeySet {
  perplexity?: string;
  openai?: string;
  anthropic?: string;
  gemini?: string;
}

/**
 * Query all engines for which a key was provided. Runs all queries in parallel.
 * Returns only the results where `isLiveQuery === true`.
 */
export async function queryAllEngines(
  domain: string,
  keys: EngineKeySet
): Promise<EngineQueryResult[]> {
  const tasks: Promise<EngineQueryResult>[] = [];

  if (keys.perplexity?.trim()) tasks.push(queryPerplexitySonar(domain, keys.perplexity.trim()));
  if (keys.openai?.trim()) tasks.push(queryOpenAIForDomain(domain, keys.openai.trim()));
  if (keys.anthropic?.trim()) tasks.push(queryAnthropicForDomain(domain, keys.anthropic.trim()));
  if (keys.gemini?.trim()) tasks.push(queryGeminiForDomain(domain, keys.gemini.trim()));

  const results = await Promise.allSettled(tasks);

  return results
    .filter((r): r is PromiseFulfilledResult<EngineQueryResult> => r.status === 'fulfilled')
    .map(r => r.value);
}
