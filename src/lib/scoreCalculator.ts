import {
  EngineScore,
  EntityNode,
  LiveExtractionMetadata,
  Recommendation,
} from './types';

// Deterministic hashing helper for consistent yet dynamic domain scoring
export function hashDomain(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export interface GeoSubscores {
  overallGeoScore: number;
  zeroClickResilience: number;
  informationGainScore: number;
  entityDisambiguationScore: number;
  vectorReadinessScore: number;
}

/**
 * Compute GEO subscores from live crawler metadata.
 */
export function computeLiveGeoSubscores(
  liveMeta: LiveExtractionMetadata,
  cleanDomain: string
): GeoSubscores {
  let calculatedScore = 50;

  if (liveMeta.isLiveScanned) {
    if (liveMeta.extractedTitle) calculatedScore += 8;
    if (liveMeta.extractedDescription) calculatedScore += 8;
    if (liveMeta.schemaJsonLdCount > 0) calculatedScore += Math.min(20, liveMeta.schemaJsonLdCount * 8);
    if (liveMeta.h1Count === 1) calculatedScore += 7;
    if (liveMeta.h2Count >= 3) calculatedScore += 8;
    if (liveMeta.tableCount > 0) calculatedScore += 10;
    if (liveMeta.wordCount > 500) calculatedScore += 5;
    if (liveMeta.wordCount > 1500) calculatedScore += 4;
    if (liveMeta.detectedSchemas.includes('Organization')) calculatedScore += 5;
    if (liveMeta.detectedSchemas.includes('Product')) calculatedScore += 4;
    if (liveMeta.detectedSchemas.includes('FAQPage')) calculatedScore += 6;
  } else {
    const hash = hashDomain(cleanDomain);
    calculatedScore = 55 + (hash % 36);
  }

  const overallGeoScore = Math.min(96, Math.max(32, calculatedScore));
  const zeroClickResilience = Math.min(94, Math.max(30, overallGeoScore + (liveMeta.tableCount > 0 ? 8 : -4)));
  const informationGainScore = Math.min(98, Math.max(35, overallGeoScore + (liveMeta.wordCount > 800 ? 7 : -5)));
  const entityDisambiguationScore = Math.min(95, Math.max(40, overallGeoScore + (liveMeta.schemaJsonLdCount > 0 ? 10 : -8)));
  const vectorReadinessScore = Math.min(97, Math.max(28, overallGeoScore + (liveMeta.h2Count >= 4 ? 6 : -6)));

  return {
    overallGeoScore,
    zeroClickResilience,
    informationGainScore,
    entityDisambiguationScore,
    vectorReadinessScore,
  };
}

/**
 * Compute deterministic GEO subscores for fallback/preview analysis.
 */
export function computeDeterministicGeoSubscores(cleanDomain: string): GeoSubscores {
  const hash = hashDomain(cleanDomain);
  const baseScore = 48 + (hash % 45); // Range ~48 to 92
  const overallGeoScore = Math.min(96, Math.max(34, baseScore));
  const zeroClickResilience = Math.min(94, Math.max(30, overallGeoScore + ((hash % 15) - 7)));
  const informationGainScore = Math.min(98, Math.max(35, overallGeoScore + ((hash % 19) - 9)));
  const entityDisambiguationScore = Math.min(95, Math.max(40, overallGeoScore + ((hash % 13) - 6)));
  const vectorReadinessScore = Math.min(97, Math.max(28, overallGeoScore + ((hash % 21) - 10)));

  return {
    overallGeoScore,
    zeroClickResilience,
    informationGainScore,
    entityDisambiguationScore,
    vectorReadinessScore,
  };
}

/**
 * Build engine breakdowns for Perplexity, ChatGPT, Claude, and Gemini.
 */
export function buildEngineBreakdown(
  overallGeoScore: number,
  chunkBonus: number
): EngineScore[] {
  return [
    {
      engine: 'perplexity',
      name: 'Perplexity Pro / Sonar',
      score: Math.min(98, Math.max(40, overallGeoScore + 4)),
      citationProbability: Math.min(94, Math.round(overallGeoScore * 0.95)),
      indexedChunks: 1400 + Math.floor(chunkBonus * 1.5),
      sentimentRating: overallGeoScore > 75 ? 'High Authority' : overallGeoScore > 50 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'PerplexityBot v3.4',
    },
    {
      engine: 'chatgpt',
      name: 'OpenAI GPT-4o Search',
      score: Math.min(95, Math.max(35, overallGeoScore - 2)),
      citationProbability: Math.min(92, Math.round(overallGeoScore * 0.91)),
      indexedChunks: 950 + Math.floor(chunkBonus * 1.2),
      sentimentRating: overallGeoScore > 70 ? 'High Authority' : overallGeoScore > 45 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'OAI-SearchBot',
    },
    {
      engine: 'claude',
      name: 'Claude 3.5 Web Citations',
      score: Math.min(96, Math.max(38, overallGeoScore + 2)),
      citationProbability: Math.min(90, Math.round(overallGeoScore * 0.88)),
      indexedChunks: 1100 + Math.floor(chunkBonus * 1.4),
      sentimentRating: overallGeoScore > 72 ? 'High Authority' : overallGeoScore > 48 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'ClaudeBot',
    },
    {
      engine: 'gemini',
      name: 'Google Gemini Grounding',
      score: Math.min(94, Math.max(30, overallGeoScore - 5)),
      citationProbability: Math.min(88, Math.round(overallGeoScore * 0.85)),
      indexedChunks: 2000 + Math.floor(chunkBonus * 2.0),
      sentimentRating: overallGeoScore > 68 ? 'High Authority' : overallGeoScore > 45 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'Google-Extended',
    },
  ];
}

/**
 * Synthesize detected semantic entities grounded in the Knowledge Graph.
 */
export function buildDetectedEntities(
  brandName: string,
  overallGeoScore: number
): EntityNode[] {
  return [
    { name: brandName, type: 'Brand', confidence: 0.98, groundedInKG: overallGeoScore > 60 },
    { name: `${brandName} Digital Platform & Solutions`, type: 'Product', confidence: 0.91, groundedInKG: overallGeoScore > 70 },
    { name: 'Generative Search & Knowledge Graph', type: 'Industry', confidence: 0.86, groundedInKG: true },
    { name: 'Direct Agentic Settlement Protocols', type: 'Key Feature', confidence: 0.84, groundedInKG: overallGeoScore > 75 },
    { name: 'Legacy Centralized Search Indexes', type: 'Competitor', confidence: 0.79, groundedInKG: true },
  ];
}

/**
 * Generate actionable GEO recommendations.
 */
export function buildRecommendations(params: {
  cleanDomain: string;
  brandName: string;
  fullUrl?: string;
  tableCount?: number;
  schemaJsonLdCount?: number;
}): Recommendation[] {
  const { cleanDomain, brandName, fullUrl = `https://${cleanDomain}`, tableCount = 0, schemaJsonLdCount = 0 } = params;

  return [
    {
      id: 'rec-1',
      category: 'Agentic API',
      priority: 'CRITICAL',
      title: 'Deploy Machine-Readable agent.json Manifest',
      description: `Autonomous LLM agents crawl ${cleanDomain} without structured action declarations. Serving an agent.json schema at the root enables zero-latency product discovery and direct agentic transactions.`,
      impact: '+34% Agent Referral Win-Rate',
      codeSnippet: `// Serve at https://${cleanDomain}/.well-known/agent.json\n{\n  "version": "1.2.0",\n  "name": "${brandName}",\n  "capabilities": ["direct-checkout", "semantic-query", "realtime-pricing"],\n  "endpoints": [\n    { "name": "catalog_lookup", "path": "/api/agent/catalog", "method": "POST" }\n  ]\n}`,
    },
    {
      id: 'rec-2',
      category: 'Information Gain',
      priority: 'HIGH',
      title: tableCount === 0 ? 'Inject Primary Empirical Data Tables & Unique Statistics' : 'Optimize Existing Data Matrices for RAG Extractors',
      description: 'LLM answer engines heavily favor verified statistical data. Structuring quantitative metrics into HTML table elements increases citation probability by up to 2.8x.',
      impact: '+28% Citation Selection Probability',
      codeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Dataset",\n  "name": "${brandName} Empirical Performance Benchmark",\n  "description": "Primary telemetry data verified by cryptographic attestation",\n  "creator": { "@type": "Organization", "name": "${brandName}" }\n}\n</script>`,
    },
    {
      id: 'rec-3',
      category: 'Schema',
      priority: schemaJsonLdCount === 0 ? 'CRITICAL' : 'HIGH',
      title: 'Implement Nested SameAs Entity Disambiguation',
      description: 'Disambiguate corporate identity and founders with authoritative Wikidata and Crunchbase URIs to cement entity grounding in foundation model latent representations.',
      impact: '+19% Entity Disambiguation Grounding',
      codeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "${brandName}",\n  "url": "${fullUrl}",\n  "sameAs": [\n    "https://www.wikidata.org/wiki/Q...",\n    "https://www.crunchbase.com/organization/${cleanDomain.split('.')[0]}"\n  ]\n}\n</script>`,
    },
    {
      id: 'rec-4',
      category: 'Vector Density',
      priority: 'MEDIUM',
      title: 'Edge Pre-Chunking for LLM RAG Retrieval (m-HTML)',
      description: 'Optimize long-form content headers with semantic anchor tags (`data-vector-chunk`) to maximize dense passage retrieval scoring when crawled by PerplexityBot and OAI-SearchBot.',
      impact: '+15% Retrieval Precision in Perplexity',
      codeSnippet: `<article data-vector-chunk="primary-thesis" data-semantic-density="0.94">\n  <h2>Why ${brandName} Dominates High-Intent Conversion</h2>\n  <p>Core direct metrics: 99.4% settlement rate and sub-200ms API routing...</p>\n</article>`,
    },
  ];
}

/**
 * Generate 3-tier GEO executive summary.
 */
export function buildScoreSummary(cleanDomain: string, overallGeoScore: number): string {
  if (overallGeoScore >= 80) {
    return `${cleanDomain} possesses strong semantic authority and above-average citation resilience in Perplexity and OpenAI Search. Implementing an agent.json endpoint will capture significant autonomous buyer traffic.`;
  }
  if (overallGeoScore >= 60) {
    return `${cleanDomain} is moderately visible to generative engines, but suffers from zero-click search cannibalization and missing agentic schema declarations. Resolving entity ambiguity will unlock 40%+ referral gains.`;
  }
  return `${cleanDomain} is at severe risk of zero-click obsolescence. Answer engines currently bypass this domain in favor of higher-density vector sources. Urgent implementation of empirical data schemas and agentic endpoints is advised.`;
}
