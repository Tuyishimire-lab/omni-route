/**
 * OmniRoute Agent Traffic Classifier
 * ─────────────────────────────────
 * Classifies inbound requests as human, AI-agent, or AI-crawler based on
 * User-Agent and referer signals. This is the data-collection core of the
 * product: every classified event feeds real telemetry (TelemetryEvent rows)
 * instead of simulated data.
 *
 * Designed to run in an edge snippet, a middleware, or server-side - zero deps.
 */

export type TrafficClass =
  | 'HUMAN'
  | 'AI_TRAINING_CRAWLER'   // GPTBot, CCBot, etc. - model training crawls
  | 'AI_SEARCH_CRAWLER'     // OAI-SearchBot, PerplexityBot - live search indexing
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

/** Answer-engine referers - traffic arriving from an AI answer, not a blue link */
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
  // Note: Google AI Mode (google.com/search?udm=50) is handled separately below
  // because it shares the google.com domain with regular organic search and
  // requires a URL parameter check, not just a hostname match.
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
 * Hosting / CI / infra user-agent patterns that contain headless markers
 * but are NOT AI agents — they are the deployment platform itself.
 * These must be excluded before checking AGENT_MARKERS.
 *
 * IMPORTANT: Be as specific as possible here. Over-broad patterns silently
 * drop real AI agents (e.g. OpenAI Operator, browser-use frameworks) that
 * happen to use Headless Chrome on Linux.
 *
 * Vercel's ISR pre-renderer has a highly consistent UA:
 *   Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)
 *   HeadlessChrome/<version> Safari/537.36
 * It has NO extra product tokens beyond HeadlessChrome + Safari.
 * Real operator agents typically append their own product token AFTER Safari,
 * e.g. "...Safari/537.36 OpenAI-Operator/1.0" or "...Safari/537.36 Playwright/..."
 *
 * Strategy: exclude only the Vercel ISR signature by requiring the UA to END
 * with 'safari/<version>' (nothing appended after). Agents that add their own
 * token after Safari will correctly pass through to AGENT_MARKERS.
 */
const INFRASTRUCTURE_UA_PATTERNS = [
  // Vercel ISR renderer: HeadlessChrome on Linux x86_64, UA ends at Safari token.
  // Strict match: nothing after Safari/<version>.
  /mozilla\/5\.0 \(x11; linux x86_64\) applewebkit\/537\.36 \(khtml, like gecko\) headlesschrome\/[\d.]+ safari\/537\.36\s*$/i,
  // Wider fallback: catches minor UA variants Vercel deploys (e.g. slightly
  // different version strings) that share the same x11/Linux/HeadlessChrome
  // fingerprint but don't have any additional product tokens after Safari.
  /^\s*mozilla\/5\.0 \(x11;[^)]*linux[^)]*\) applewebkit\/[\d.]+ \(khtml[^)]*\) headlesschrome\/[\d.]+ safari\/[\d.]+\s*$/i,
];

/**
 * Classify an inbound request.
 * @param userAgent Raw User-Agent header
 * @param referer   Raw Referer header
 */
export function classifyRequest(userAgent: string | null, referer: string | null): ClassifiedRequest {
  const ua = (userAgent ?? '').toLowerCase();
  const ref = (referer ?? '').toLowerCase();

  // 1a. Google AI Mode — must be checked BEFORE the generic referrer loop because
  //     AI Mode referrals come from google.com (same as regular search). The udm=50
  //     parameter is Google's internal identifier for AI Mode searches.
  //     e.g. https://www.google.com/search?q=stripe+pricing&udm=50
  if (ref.includes('google.com') && ref.includes('udm=50')) {
    return {
      classification: 'AI_ANSWER_ENGINE',
      agentName: 'Google AI Mode',
      referredBy: 'Google AI Mode',
      eventType: 'AI_CITATION',
      confidence: 0.92,
    };
  }

  // 1b. Answer-engine referral - highest business value (a citation that converted)
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
  // Skip if this looks like a known hosting/infra renderer (e.g. Vercel ISR bot).
  const isInfraBot = INFRASTRUCTURE_UA_PATTERNS.some(p => p.test(userAgent ?? ''));
  if (!isInfraBot) {
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
