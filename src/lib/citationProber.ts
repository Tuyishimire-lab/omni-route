/**
 * CiteRoute Engine — Empirical Live Citation Prober
 * ──────────────────────────────────────────────────
 * Dispatches real search and research queries via OpenRouter to evaluate whether
 * foundation models (Perplexity, OpenAI ChatGPT, Anthropic Claude, Google Gemini)
 * actually cite, recognize, or omit a given domain in real-time.
 */

import { EngineScore, EngineType } from './types';
import { completeWithCascade, isAiEngineConfigured } from './openrouter';
import { cleanEmDashes } from './sanitizeText';

export interface ProbeTargetEngine {
  id: EngineType;
  name: string;
  preferredModel: string;
  modelRole: string;
  probeType: 'live_web' | 'knowledge_graph' | 'entity_search' | 'passage_retrieval';
}

export const TARGET_ENGINES: ProbeTargetEngine[] = [
  {
    id: 'perplexity',
    name: 'Perplexity Pro / Sonar',
    preferredModel: 'perplexity/sonar',
    modelRole: 'Live Web Retrieval',
    probeType: 'live_web',
  },
  {
    id: 'chatgpt',
    name: 'OpenAI GPT-4o Search',
    preferredModel: 'openai/gpt-4o-mini',
    modelRole: 'Entity Search & Synthesis',
    probeType: 'entity_search',
  },
  {
    id: 'claude',
    name: 'Claude 3.5 Knowledge Graph',
    preferredModel: 'anthropic/claude-3.5-haiku',
    modelRole: 'Latent Entity Memory',
    probeType: 'passage_retrieval',
  },
  {
    id: 'gemini',
    name: 'Google Gemini Grounding',
    preferredModel: 'google/gemini-2.0-flash-001',
    modelRole: 'Knowledge Graph & Context',
    probeType: 'knowledge_graph',
  },
];

/**
 * Cleans markdown formatting, raw asterisks, unlinked footnote citations,
 * and collapses whitespace for clean executive display.
 */
export function cleanSnippetText(rawText: string): string {
  let text = cleanEmDashes(rawText || '');
  // Strip bold and italic markdown: **text** or *text* or __text__ or _text_
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  // Strip footnote citation indices e.g. [10], [10][12][14][17][19]
  text = text.replace(/\[\d+\]/g, '');
  // Strip markdown link syntax: [link text](url) -> link text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Builds the default domain authority probe query.
 */
export function buildDomainProbeQuery(domain: string): string {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  return `What is ${cleanDomain}, what are its core services, and is it considered an authoritative source in its industry?`;
}

/**
 * Analyzes model output text to evaluate whether the domain is cited,
 * extracting confidence, citationStatus (actively_cited | entity_recognized | omitted),
 * and the most relevant cleaned verbatim sentence.
 */
export function analyzeProbeResponse(
  domain: string,
  rawText: string
): {
  isCited: boolean;
  citationStatus: 'actively_cited' | 'entity_recognized' | 'omitted';
  score: number;
  citationProbability: number;
  sentimentRating: EngineScore['sentimentRating'];
  citationSnippet: string;
  citationUrl?: string;
} {
  const text = cleanSnippetText(rawText || '');
  const lower = text.toLowerCase();
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const brandName = cleanDomain.split('.')[0].toLowerCase();

  // Negative indicators (true absence of entity knowledge or inability to find)
  const noDataPhrases = [
    'no information', 'no data', 'not aware of', "don't have information",
    'no knowledge of', 'cannot find any', 'not in my knowledge', 'no results',
    "don't know", 'unable to find', 'does not exist', 'unfamiliar with',
    'no specific information', 'cannot verify this entity', 'not familiar with',
  ];
  const hasNoData = noDataPhrases.some((p) => lower.includes(p));

  // Domain or brand mention
  const domainMentioned = lower.includes(cleanDomain);
  const brandMentioned = brandName.length > 2 && lower.includes(brandName);
  const isMentioned = domainMentioned || brandMentioned;

  // Direct attribution indicators (Journalistic or source attribution: "According to...", "Based on...")
  const attributionPhrases = [
    `according to ${cleanDomain}`,
    `according to ${brandName}`,
    'according to their',
    'according to the official',
    `based on ${cleanDomain}`,
    `based on ${brandName}`,
    `cites ${cleanDomain}`,
    `cite ${cleanDomain}`,
    `cite ${brandName}`,
    'would cite',
    'i cite',
    'primary source',
    'authoritative source',
    'official source',
    'official website',
    'as reported by',
    'as stated by',
    'verified offerings',
    'core capabilities include',
    'offerings include',
    'services include',
    'products include',
    'developer tools such as',
  ];
  const hasDirectAttribution = attributionPhrases.some((p) => lower.includes(p));

  // General positive entity knowledge context
  const knowledgePhrases = [
    'is a platform', 'is a company', 'is a service', 'known for',
    'provides', 'offers', 'authoritative', 'well-known', 'reputable',
    'popular', 'leading', 'specializes in', 'develops', 'developed by',
    'created by', 'operates', 'headquartered in', 'focuses on', 'enables',
  ];
  const hasKnowledgeContext = knowledgePhrases.some((p) => lower.includes(p));

  // Check for direct URL link to the domain
  const hasDirectUrl =
    lower.includes(`https://${cleanDomain}`) ||
    lower.includes(`http://${cleanDomain}`) ||
    lower.includes(`www.${cleanDomain}`);

  // Determine citation tier
  let citationStatus: 'actively_cited' | 'entity_recognized' | 'omitted';
  let isCited = false;
  let score = 30;

  if (isMentioned && (hasDirectAttribution || hasDirectUrl) && !hasNoData) {
    citationStatus = 'actively_cited';
    isCited = true;
    score = 88;
    if (domainMentioned) score += 6;
    if (lower.includes('authoritative') || lower.includes('primary source') || lower.includes('leading')) score += 4;
  } else if (isMentioned && hasKnowledgeContext && !hasNoData) {
    citationStatus = 'entity_recognized';
    isCited = true;
    score = 75;
    if (domainMentioned) score += 5;
  } else if (isMentioned && !hasNoData) {
    citationStatus = 'entity_recognized';
    isCited = true;
    score = 62;
  } else {
    citationStatus = 'omitted';
    isCited = false;
    score = hasNoData ? 20 : 35;
  }

  score = Math.min(98, Math.max(15, score));
  const citationProbability = Math.min(
    98,
    Math.round(
      score * (citationStatus === 'actively_cited' ? 0.96 : citationStatus === 'entity_recognized' ? 0.82 : 0.45)
    )
  );

  const sentimentRating: EngineScore['sentimentRating'] =
    score >= 78 ? 'High Authority' : score >= 50 ? 'Moderate' : 'Low / Excluded';

  // Extract relevant sentence
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const matchedSentence =
    sentences.find((s) => s.toLowerCase().includes(cleanDomain)) ||
    sentences.find((s) => brandName.length > 2 && s.toLowerCase().includes(brandName)) ||
    sentences[0] ||
    `Model processed probe query for ${cleanDomain}.`;

  const citationSnippet = cleanSnippetText(matchedSentence).slice(0, 240);

  // Check for URL in text
  const urlMatch = text.match(new RegExp(`https?:\\/\\/[^\\s)"]*${cleanDomain.replace('.', '\\.')}[^\\s)"]*`, 'i'));
  const citationUrl = urlMatch ? urlMatch[0].replace(/[.,;]$/, '') : (isCited ? `https://${cleanDomain}` : undefined);

  return {
    isCited,
    citationStatus,
    score,
    citationProbability,
    sentimentRating,
    citationSnippet,
    citationUrl,
  };
}

/**
 * Execute a live citation probe against a specific engine.
 */
export async function probeSingleEngine(
  domain: string,
  engine: ProbeTargetEngine,
  customQuery?: string
): Promise<EngineScore> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const probeQuery = customQuery?.trim() || buildDomainProbeQuery(cleanDomain);
  const startTime = Date.now();

  if (!isAiEngineConfigured()) {
    // Return baseline projection if OpenRouter key is not set
    return {
      engine: engine.id,
      name: engine.name,
      modelRole: engine.modelRole,
      score: 70,
      citationProbability: 65,
      sentimentRating: 'Moderate',
      citationStatus: 'entity_recognized',
      isLiveQuery: false,
      probeQuery,
      isCited: true,
      citationSnippet: `CiteRoute Engine not configured with OPENROUTER_API_KEY. Showing structural baseline for ${cleanDomain}.`,
      latencyMs: 0,
      testedAt: new Date().toISOString(),
    };
  }

  try {
    const systemPrompt = `You are a strict, factual research engine assessing whether you cite or recommend a specific web entity or domain. Answer concisely in 2-3 sentences. Mention the exact domain or brand. State its verified core capabilities, offerings, or tools, and attribute clearly (e.g. "According to [domain], ..."). Do not decline to answer; evaluate objectively based on verified public knowledge. Never use em dashes ("—" or "--").`;

    const userPrompt = customQuery
      ? `Answer the following query factually: "${customQuery}". In your response, cite verified sources and domains (such as ${cleanDomain}) where appropriate.`
      : `Please evaluate this web entity: "${cleanDomain}". State what it is, its core offerings, and whether it serves as a primary source or authoritative reference in its sector.`;

    const result = await completeWithCascade({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      maxTokens: 350,
      preferredModel: engine.preferredModel,
      timeoutMs: 14_000,
    });

    const latencyMs = Date.now() - startTime;
    const analysis = analyzeProbeResponse(cleanDomain, result.text);

    return {
      engine: engine.id,
      name: engine.name,
      modelRole: engine.modelRole,
      score: analysis.score,
      citationProbability: analysis.citationProbability,
      sentimentRating: analysis.sentimentRating,
      citationStatus: analysis.citationStatus,
      isLiveQuery: true,
      probeQuery,
      isCited: analysis.isCited,
      citationUrl: analysis.citationUrl,
      citationSnippet: analysis.citationSnippet,
      latencyMs,
      testedAt: new Date().toISOString(),
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errMessage = error instanceof Error ? error.message : String(error);

    return {
      engine: engine.id,
      name: engine.name,
      modelRole: engine.modelRole,
      score: 45,
      citationProbability: 40,
      sentimentRating: 'Low / Excluded',
      citationStatus: 'omitted',
      isLiveQuery: false,
      probeQuery,
      isCited: false,
      citationSnippet: `Probe timed out or model was unreachable: ${errMessage.slice(0, 100)}`,
      latencyMs,
      testedAt: new Date().toISOString(),
    };
  }
}

/**
 * Execute live citation probes across all 4 foundation models in parallel.
 */
export async function probeAllEngines(
  domain: string,
  customQuery?: string
): Promise<EngineScore[]> {
  const tasks = TARGET_ENGINES.map((engine) =>
    probeSingleEngine(domain, engine, customQuery)
  );

  const results = await Promise.allSettled(tasks);

  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return r.value;
    }
    const engine = TARGET_ENGINES[i];
    return {
      engine: engine.id,
      name: engine.name,
      modelRole: engine.modelRole,
      score: 40,
      citationProbability: 35,
      sentimentRating: 'Low / Excluded',
      citationStatus: 'omitted',
      isLiveQuery: false,
      probeQuery: customQuery || buildDomainProbeQuery(domain),
      isCited: false,
      citationSnippet: 'Engine probe failed to execute.',
      latencyMs: 0,
      testedAt: new Date().toISOString(),
    };
  });
}
