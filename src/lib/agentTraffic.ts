/**
 * OmniRoute Agent Traffic Classifier
 * ─────────────────────────────────
 * Classifies inbound requests as human, AI-agent, or AI-crawler based on
 * User-Agent and referer signals. This is the data-collection core of the
 * product: every classified event feeds real telemetry (TelemetryEvent rows)
 * instead of simulated data.
 *
 * Designed to run in an edge snippet, a middleware, or server-side — zero deps.
 */

export type TrafficClass =
  | 'HUMAN'
  | 'AI_TRAINING_CRAWLER'   // GPTBot, CCBot, etc. — model training crawls
  | 'AI_SEARCH_CRAWLER'     // OAI-SearchBot, PerplexityBot — live search indexing
  | 'AI_AGENT'              // Autonomous buyer/tooling agents (operator-style)
  | 'AI_ANSWER_ENGINE';     // Referral traffic arriving FROM an answer engine

export interface ClassifiedRequest {
  classification: TrafficClass;
  /** Human-readable agent name, e.g. "PerplexityBot" or null for humans */
  agentName: string | null;
  /** The answer engine that referred the visit, if any (e.g. "chatgpt.com") */
  referredBy: string | null;
  /** Maps to TelemetryEvent.type */
  eventType: 'AI_CITATION' | 'AGENT_TX' | 'P2P_MESH_CLICK' | 'GEO_INDEX_PING';
  confidence: number; // 0–1
}

/** Known AI crawlers by UA substring → canonical name */
const AI_CRAWLERS: Record<string, { name: string; kind: 'training' | 'search' }> = {
  'gptbot': { name: 'GPTBot', kind: 'training' },
  'ccbot': { name: 'CCBot', kind: 'training' },
  'claudebot': { name: 'ClaudeBot', kind: 'training' },
  'claude-web': { name: 'Claude-Web', kind: 'training' },
  'anthropic-ai': { name: 'Anthropic AI', kind: 'training' },
  'google-extended': { name: 'Google-Extended', kind: 'training' },
  'bytespider': { name: 'Bytespider', kind: 'training' },
  'omgili': { name: 'Omgili', kind: 'training' },
  'diffbot': { name: 'Diffbot', kind: 'training' },
  'oai-searchbot': { name: 'OAI-SearchBot', kind: 'search' },
  'perplexitybot': { name: 'PerplexityBot', kind: 'search' },
  'perplexity-user': { name: 'Perplexity-User', kind: 'search' },
  'applebot-extended': { name: 'Applebot-Extended', kind: 'training' },
  'meta-externalagent': { name: 'Meta-ExternalAgent', kind: 'training' },
  'amazonbot': { name: 'Amazonbot', kind: 'training' },
  'cohere-ai': { name: 'Cohere AI', kind: 'training' },
  'youbot': { name: 'YouBot', kind: 'search' },
};

/** Answer-engine referers — traffic arriving from an AI answer, not a blue link */
const ANSWER_ENGINE_REFERRERS: Record<string, string> = {
  'chatgpt.com': 'ChatGPT',
  'chat.openai.com': 'ChatGPT',
  'perplexity.ai': 'Perplexity',
  'claude.ai': 'Claude',
  'gemini.google.com': 'Gemini',
  'copilot.microsoft.com': 'Copilot',
  'you.com': 'You.com',
  'poe.com': 'Poe',
  'arc.net': 'Arc Search',
  'duck.ai': 'DuckDuckGo AI',
};

/** UA markers of autonomous agent frameworks / operator-style browsing */
const AGENT_MARKERS = [
  'langchain',
  'auto-gpt',
  'autogpt',
  'agentgpt',
  'babyagi',
  'crewai',
  'openai-operator',
  'operator',
  'playwright',
  'puppeteer',
  'headlesschrome',
  'python-requests/2.',
  'axios/1.',
  'node-fetch',
  'got/',
  'scrapy',
  'httpx',
];

/**
 * Classify an inbound request.
 * @param userAgent Raw User-Agent header
 * @param referer   Raw Referer header
 */
export function classifyRequest(userAgent: string | null, referer: string | null): ClassifiedRequest {
  const ua = (userAgent ?? '').toLowerCase();
  const ref = (referer ?? '').toLowerCase();

  // 1. Answer-engine referral — highest business value (a citation that converted)
  for (const [host, engine] of Object.entries(ANSWER_ENGINE_REFERRERS)) {
    if (ref.includes(host)) {
      return {
        classification: 'AI_ANSWER_ENGINE',
        agentName: engine,
        referredBy: engine,
        eventType: 'AI_CITATION',
        confidence: 0.95,
      };
    }
  }

  // 2. Known AI crawlers
  for (const [marker, info] of Object.entries(AI_CRAWLERS)) {
    if (ua.includes(marker)) {
      return {
        classification: info.kind === 'search' ? 'AI_SEARCH_CRAWLER' : 'AI_TRAINING_CRAWLER',
        agentName: info.name,
        referredBy: null,
        eventType: 'GEO_INDEX_PING',
        confidence: 0.98,
      };
    }
  }

  // 3. Autonomous agent frameworks / headless automation
  for (const marker of AGENT_MARKERS) {
    if (ua.includes(marker)) {
      return {
        classification: 'AI_AGENT',
        agentName: userAgent!.slice(0, 80),
        referredBy: null,
        eventType: 'AGENT_TX',
        confidence: 0.85,
      };
    }
  }

  // 4. Default: human
  return {
    classification: 'HUMAN',
    agentName: null,
    referredBy: null,
    eventType: 'P2P_MESH_CLICK',
    confidence: 0.6, // absence of evidence, not proof
  };
}

/**
 * Extract the destination domain from a Referer-less agent hit using the
 * request host. Utility for snippet-side enrichment.
 */
export function extractDomainFromHost(host: string | null): string | null {
  if (!host) return null;
  return host.toLowerCase().replace(/^www\./, '').split(':')[0] || null;
}
