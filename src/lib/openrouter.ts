/**
 * CiteRoute Engine — Internal Model Orchestration Layer
 * ─────────────────────────────────────────────────────────
 * Dynamically discovers available free-tier AI models at runtime via the
 * provider's /models API, filters for text+JSON capable candidates, and
 * orchestrates a cascade with automatic rate-limit (HTTP 429) detection,
 * circuit breaker cooldowns, and seamless provider fallback.
 *
 * This module is server-only and never exposed to clients.
 */

import { cleanEmDashes, deepCleanEmDashes } from './sanitizeText';

// ── Dynamic Free Model Discovery ────────────────────────────────────────────

interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
  supported_parameters?: string[];
  architecture?: { modality?: string };
  pricing?: { prompt?: string; completion?: string };
}

/** In-memory cache for discovered free models */
let cachedFreeModels: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Discover free models dynamically from the provider API.
 * Filters for: pricing == 0, text-capable modality, and response_format (JSON) support.
 * Results are cached in-memory with a 1-hour TTL.
 */
export async function discoverFreeModels(): Promise<string[]> {
  // Return cache if still fresh
  if (cachedFreeModels.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFreeModels;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[CiteRoute Engine] Model discovery returned HTTP ${response.status}`);
      return getFallbackModels();
    }

    const payload = (await response.json()) as { data: ModelInfo[] };

    const freeTextModels = payload.data.filter((m) => {
      // Must be free (both prompt and completion pricing are "0")
      if (!m.pricing || m.pricing.prompt !== '0' || m.pricing.completion !== '0') return false;
      // Must accept text input
      const modality = m.architecture?.modality || '';
      if (!modality.includes('text')) return false;
      // Skip alias/redirect models
      if (m.id.startsWith('~')) return false;
      // Skip audio/multimodal-only models (e.g. Lyria, speech)
      const idLower = m.id.toLowerCase();
      if (
        idLower.includes('lyria') ||
        idLower.includes('audio') ||
        idLower.includes('video') ||
        idLower.includes('image') ||
        idLower.includes('sante') ||
        idLower.includes('fin')
      ) {
        return false;
      }
      if (modality.includes('->') && !modality.split('->')[1]?.includes('text')) return false;
      // Skip the generic router itself — we use it as last-resort fallback
      if (m.id === 'openrouter/free') return false;
      return true;
    });

    // Prioritize models that support response_format (JSON mode)
    const jsonCapable = freeTextModels.filter(
      (m) => m.supported_parameters?.includes('response_format') || m.supported_parameters?.includes('structured_outputs')
    );
    const nonJsonCapable = freeTextModels.filter(
      (m) => !m.supported_parameters?.includes('response_format') && !m.supported_parameters?.includes('structured_outputs')
    );

    // Sort each group by context length (larger = better for our report prompts)
    const sortByCtx = (a: ModelInfo, b: ModelInfo) => (b.context_length || 0) - (a.context_length || 0);
    jsonCapable.sort(sortByCtx);
    nonJsonCapable.sort(sortByCtx);

    // JSON-capable models first, then others, capped at top 10
    const ordered = [...jsonCapable, ...nonJsonCapable].slice(0, 10).map((m) => m.id);

    // Boost primary model to the front — nex-agi/nex-n2.5-mini:free is the
    // fastest + most reliable for our GEO analysis prompts (verified via benchmarks).
    const PREFERRED_MODELS = ['nex-agi/nex-n2.5-mini:free', 'nex-agi/nex-n2.5-pro:free'];
    const boosted = PREFERRED_MODELS.filter((id) => ordered.includes(id));
    const rest = ordered.filter((id) => !PREFERRED_MODELS.includes(id));
    const discovered = [...boosted, ...rest];

    if (discovered.length > 0) {
      cachedFreeModels = discovered;
      cacheTimestamp = Date.now();
      console.log(`[CiteRoute Engine] Discovered ${discovered.length} free models: ${discovered.join(', ')}`);
    }

    return discovered.length > 0 ? discovered : getFallbackModels();
  } catch (err) {
    console.warn('[CiteRoute Engine] Model discovery failed, using fallback:', err instanceof Error ? err.message : err);
    return getFallbackModels();
  }
}

/**
 * Static fallback chain — used when dynamic discovery fails or free models hit quotas.
 * Uses verified fast and economical models (e.g. Gemini 2.5 Flash at fractions of a cent).
 */
function getFallbackModels(): string[] {
  return [
    'nex-agi/nex-n2.5-mini:free',
    'nex-agi/nex-n2.5-pro:free',
    'google/gemini-2.5-flash',
    'meta-llama/llama-3.3-70b-instruct',
    'openrouter/auto',
  ];
}

/** Force-clear the model cache (useful for testing) */
export function clearModelCache(): void {
  cachedFreeModels = [];
  cacheTimestamp = 0;
}

/** Get the current cached models (for testing/inspection) */
export function getCachedModels(): string[] {
  return [...cachedFreeModels];
}

// ── Cooldown / Circuit Breaker ──────────────────────────────────────────────

const modelCooldowns = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 60_000; // 60s backoff when rate-limited

export function isModelCoolingDown(model: string): boolean {
  const expiresAt = modelCooldowns.get(model);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    modelCooldowns.delete(model);
    return false;
  }
  return true;
}

export function markModelCooldown(model: string, durationMs = DEFAULT_COOLDOWN_MS): void {
  modelCooldowns.set(model, Date.now() + durationMs);
}

export function resetModelCooldowns(): void {
  modelCooldowns.clear();
}

// ── Configuration Check ─────────────────────────────────────────────────────

export function isAiEngineConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
}

// Legacy alias for backward compatibility
export const isOpenRouterConfigured = isAiEngineConfigured;

// ── Chat Completion with Cascade Fallback ───────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiEngineChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  maxAttempts?: number;
  overrideApiKey?: string;
  preferredModel?: string;
}

// Legacy alias
export type OpenRouterChatOptions = AiEngineChatOptions;

export interface AiEngineChatResult {
  text: string;
  modelUsed: string;
  attempts: number;
}

// Legacy alias
export type OpenRouterChatResult = AiEngineChatResult;

/**
 * Execute chat completion with cascading fallback across dynamically
 * discovered free models + paid high-speed fallbacks.
 */
export async function completeWithCascade(
  options: AiEngineChatOptions
): Promise<AiEngineChatResult> {
  const apiKey = (options.overrideApiKey || process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('CiteRoute Engine is not configured.');
  }

  // Fast failover timeout per candidate: 7.5s for rapid failover
  const timeoutMs = options.timeoutMs ?? 7_500;
  const maxAttempts = options.maxAttempts ?? 3;

  // Dynamically discover models
  const discoveredModels = await discoverFreeModels();

  // Filter out models on cooldown
  let candidateModels = discoveredModels.filter((m) => !isModelCoolingDown(m));

  // If user or environment specified a preferred model that's not cooling down, put it first
  const preferred = options.preferredModel || process.env.OPENROUTER_PREFERRED_MODEL;
  if (preferred && !isModelCoolingDown(preferred)) {
    candidateModels = [
      preferred,
      ...candidateModels.filter((m) => m !== preferred),
    ];
  }

  // Always include verified high-speed paid fallbacks (Gemini Flash / Meta Llama)
  const PAID_FALLBACKS = [
    'google/gemini-2.5-flash',
    'meta-llama/llama-3.3-70b-instruct',
    'openrouter/auto',
  ];
  for (const fb of PAID_FALLBACKS) {
    if (!candidateModels.includes(fb)) {
      candidateModels.push(fb);
    }
  }

  // If all discovered models were on cooldown, try fallback list
  if (candidateModels.length <= 1) {
    candidateModels = [...getFallbackModels(), 'openrouter/free'];
  }

  // Cap to maxAttempts for rapid response without 2-minute hangs
  const modelsToTry = candidateModels.slice(0, maxAttempts);

  let lastError: Error | null = null;
  let attemptCount = 0;

  for (const model of modelsToTry) {
    attemptCount++;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const requestBody: Record<string, unknown> = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.15,
        max_tokens: options.maxTokens ?? 3500,
        // Disable reasoning tokens on reasoning-capable models (e.g. nex-n2.5-mini)
        // so completion tokens are never starved, preventing empty/truncated responses
        reasoning: { effort: 'none' },
      };

      if (options.jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://citeroute.com',
          'X-Title': 'CiteRoute Engine',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      clearTimeout(timer);

      if (response.status === 429 || response.status === 503) {
        // Rate limited or model overloaded -> cool down and failover
        markModelCooldown(model, DEFAULT_COOLDOWN_MS);
        const errText = await response.text().catch(() => `HTTP ${response.status}`);
        console.warn(`[CiteRoute Engine] Model ${model} returned ${response.status}: ${errText.slice(0, 120)}. Trying next.`);
        lastError = new Error(`Model ${model} rate-limited or overloaded (HTTP ${response.status})`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => `HTTP ${response.status}`);
        console.warn(`[CiteRoute Engine] Model ${model} error: ${errText.slice(0, 200)}`);
        // Missing or invalid model: cool it down for 10 minutes
        if (response.status === 404 || response.status === 400) {
          markModelCooldown(model, DEFAULT_COOLDOWN_MS * 10);
        }
        lastError = new Error(`Model ${model} failed with HTTP ${response.status}: ${errText.slice(0, 120)}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content;

      if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
        // Model returned 200 but empty content — cool it down and try next
        markModelCooldown(model, DEFAULT_COOLDOWN_MS * 5);
        console.warn(`[CiteRoute Engine] Model ${model} returned empty content. Cooling down & trying next.`);
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }

      // If in JSON mode, validate that the content is parsable before returning
      if (options.jsonMode) {
        let cleaned = rawText.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }
        const fb = cleaned.indexOf('{');
        const lb = cleaned.lastIndexOf('}');
        if (fb !== -1 && lb !== -1 && lb > fb) {
          cleaned = cleaned.slice(fb, lb + 1);
        }
        try {
          JSON.parse(cleaned);
        } catch (jsonErr) {
          console.warn(`[CiteRoute Engine] Model ${model} returned malformed or truncated JSON: ${jsonErr instanceof Error ? jsonErr.message : jsonErr}. Trying next.`);
          markModelCooldown(model, DEFAULT_COOLDOWN_MS * 2);
          lastError = new Error(`Malformed JSON from ${model}`);
          continue;
        }
      }

      return {
        text: cleanEmDashes(rawText.trim()),
        modelUsed: data?.model || model,
        attempts: attemptCount,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CiteRoute Engine] Error querying ${model}: ${msg}`);
      lastError = err instanceof Error ? err : new Error(msg);
      // Try next model in loop
    }
  }

  throw new Error(
    `CiteRoute Engine exhausted all ${attemptCount} model candidates. Last error: ${lastError?.message || 'Unknown failure'}`
  );
}

// Legacy alias for backward compatibility
export const completeWithOpenRouterCascade = completeWithCascade;

/**
 * Generate and parse structured JSON with automatic markdown fence stripping.
 */
export async function generateJson<T>(
  options: AiEngineChatOptions
): Promise<{ data: T; modelUsed: string; attempts: number }> {
  const result = await completeWithCascade({
    ...options,
    jsonMode: true,
  });

  let sanitized = result.text.trim();
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  if (sanitized.startsWith('```')) {
    sanitized = sanitized.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  // Find first { and last } to tolerate reasoning preamble from models
  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    sanitized = sanitized.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(sanitized) as T;
    return {
      data: deepCleanEmDashes(parsed),
      modelUsed: result.modelUsed,
      attempts: result.attempts,
    };
  } catch (parseError) {
    throw new Error(
      `Failed to parse JSON from AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Preview: ${sanitized.slice(0, 200)}`
    );
  }
}

// Legacy alias for backward compatibility
export const generateOpenRouterJson = generateJson;
