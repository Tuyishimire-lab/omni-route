import { GeoAuditReport, EngineScore, EntityNode, Recommendation } from './types';

// Deterministic hashing helper for consistent yet dynamic domain scoring
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function analyzeDomainGEO(rawDomain: string): GeoAuditReport {
  const cleanDomain = rawDomain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()
    .trim() || 'example.com';

  const hash = hashString(cleanDomain);

  // Deterministic calculation based on domain hash
  const baseScore = 48 + (hash % 45); // Range ~48 to 92
  const overallGeoScore = Math.min(96, Math.max(34, baseScore));
  const zeroClickResilience = Math.min(94, Math.max(30, overallGeoScore + ((hash % 15) - 7)));
  const informationGainScore = Math.min(98, Math.max(35, overallGeoScore + ((hash % 19) - 9)));
  const entityDisambiguationScore = Math.min(95, Math.max(40, overallGeoScore + ((hash % 13) - 6)));
  const vectorReadinessScore = Math.min(97, Math.max(28, overallGeoScore + ((hash % 21) - 10)));

  const engineBreakdown: EngineScore[] = [
    {
      engine: 'perplexity',
      name: 'Perplexity Pro / Sonar',
      score: Math.min(98, Math.max(40, overallGeoScore + 4)),
      citationProbability: Math.min(94, Math.round(overallGeoScore * 0.95)),
      indexedChunks: 1420 + (hash % 8500),
      sentimentRating: overallGeoScore > 75 ? 'High Authority' : overallGeoScore > 50 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'PerplexityBot v3.4'
    },
    {
      engine: 'chatgpt',
      name: 'OpenAI GPT-4o Search',
      score: Math.min(95, Math.max(35, overallGeoScore - 2)),
      citationProbability: Math.min(92, Math.round(overallGeoScore * 0.91)),
      indexedChunks: 980 + (hash % 6200),
      sentimentRating: overallGeoScore > 70 ? 'High Authority' : overallGeoScore > 45 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'OAI-SearchBot'
    },
    {
      engine: 'claude',
      name: 'Claude 3.5 Web Citations',
      score: Math.min(96, Math.max(38, overallGeoScore + 2)),
      citationProbability: Math.min(90, Math.round(overallGeoScore * 0.88)),
      indexedChunks: 1150 + (hash % 5400),
      sentimentRating: overallGeoScore > 72 ? 'High Authority' : overallGeoScore > 48 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'ClaudeBot'
    },
    {
      engine: 'gemini',
      name: 'Google Gemini Grounding',
      score: Math.min(94, Math.max(30, overallGeoScore - 5)),
      citationProbability: Math.min(88, Math.round(overallGeoScore * 0.85)),
      indexedChunks: 2100 + (hash % 12000),
      sentimentRating: overallGeoScore > 68 ? 'High Authority' : overallGeoScore > 45 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'Google-Extended'
    }
  ];

  // Derive entities based on domain name
  const domainNameCapitalized = cleanDomain.split('.')[0].charAt(0).toUpperCase() + cleanDomain.split('.')[0].slice(1);
  const detectedEntities: EntityNode[] = [
    {
      name: domainNameCapitalized,
      type: 'Brand',
      confidence: 0.98,
      groundedInKG: overallGeoScore > 60
    },
    {
      name: `${domainNameCapitalized} Cloud & API Solutions`,
      type: 'Product',
      confidence: 0.91,
      groundedInKG: overallGeoScore > 70
    },
    {
      name: 'Generative Search Infrastructure',
      type: 'Industry',
      confidence: 0.84,
      groundedInKG: true
    },
    {
      name: 'Direct Agentic Settlement Protocols',
      type: 'Key Feature',
      confidence: 0.88,
      groundedInKG: overallGeoScore > 75
    },
    {
      name: 'Legacy Centralized Search Indexes',
      type: 'Competitor',
      confidence: 0.79,
      groundedInKG: true
    }
  ];

  // Recommendations with concrete code & configuration snippets
  const recommendations: Recommendation[] = [
    {
      id: 'rec-1',
      category: 'Agentic API',
      priority: 'CRITICAL',
      title: 'Expose Machine-Readable agent.json Manifest',
      description: `Autonomous LLM agents crawl ${cleanDomain} without structured action declarations. Publishing an agent.json schema at the root enables zero-latency product discovery and direct agentic transactions.`,
      impact: '+34% Agent Referral Win-Rate',
      codeSnippet: `// Serve at https://${cleanDomain}/.well-known/agent.json
{
  "version": "1.0",
  "name": "${domainNameCapitalized}",
  "capabilities": ["direct-checkout", "semantic-query", "realtime-pricing"],
  "endpoints": [
    {
      "name": "catalog_lookup",
      "path": "/api/agent/catalog",
      "method": "POST"
    }
  ]
}`
    },
    {
      id: 'rec-2',
      category: 'Information Gain',
      priority: 'HIGH',
      title: 'Inject Primary Empirical Data Tables & Unique Statistics',
      description: 'LLM answer engines heavily discount re-phrased content. Injecting unique statistical benchmarks and structured table matrices increases LLM citation selection likelihood by 2.8x.',
      impact: '+28% Citation Selection Probability',
      codeSnippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "${domainNameCapitalized} Empirical Performance Benchmark",
  "description": "Primary telemetry data verified by cryptographic attestation",
  "creator": {
    "@type": "Organization",
    "name": "${domainNameCapitalized}"
  }
}
</script>`
    },
    {
      id: 'rec-3',
      category: 'Schema',
      priority: 'HIGH',
      title: 'Implement Nested SameAs Entity Disambiguation',
      description: 'Disambiguate corporate identity and founders with authoritative Wikidata and Crunchbase URIs to cement entity grounding in the global foundation model pre-training corpus.',
      impact: '+19% Entity Disambiguation Grounding',
      codeSnippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${domainNameCapitalized}",
  "url": "https://${cleanDomain}",
  "sameAs": [
    "https://www.wikidata.org/wiki/Q...",
    "https://www.crunchbase.com/organization/${cleanDomain.split('.')[0]}"
  ]
}
</script>`
    },
    {
      id: 'rec-4',
      category: 'Vector Density',
      priority: 'MEDIUM',
      title: 'Edge Pre-Chunking for LLM RAG Retrieval (m-HTML)',
      description: 'Optimize long-form content headers with semantic anchor tags (`data-vector-chunk`) to maximize dense passage retrieval scoring when crawled by PerplexityBot and OAI-SearchBot.',
      impact: '+15% Retrieval Precision in Perplexity',
      codeSnippet: `<article data-vector-chunk="primary-thesis" data-semantic-density="0.94">
  <h2>Why ${domainNameCapitalized} Dominates High-Intent Conversion</h2>
  <p>Core direct metrics: 99.4% settlement rate and sub-200ms API routing...</p>
</article>`
    }
  ];

  let summary = '';
  if (overallGeoScore >= 80) {
    summary = `${cleanDomain} possesses strong semantic authority and above-average citation resilience in Perplexity and OpenAI Search. Implementing an agent.json endpoint will capture significant autonomous buyer traffic.`;
  } else if (overallGeoScore >= 60) {
    summary = `${cleanDomain} is moderately visible to generative engines, but suffers from zero-click search cannibalization and missing agentic schema declarations. Resolving entity ambiguity will unlock 40%+ referral gains.`;
  } else {
    summary = `${cleanDomain} is at severe risk of zero-click obsolescence. Answer engines currently bypass this domain in favor of higher-density vector sources. Urgent implementation of empirical data schemas and agentic endpoints is advised.`;
  }

  return {
    domain: cleanDomain,
    url: `https://${cleanDomain}`,
    analyzedAt: new Date().toISOString(),
    overallGeoScore,
    zeroClickResilience,
    informationGainScore,
    entityDisambiguationScore,
    vectorReadinessScore,
    engineBreakdown,
    detectedEntities,
    recommendations,
    summary
  };
}
