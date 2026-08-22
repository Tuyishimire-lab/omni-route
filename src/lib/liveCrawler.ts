import { GeoAuditReport, LiveExtractionMetadata, EngineScore, EntityNode, Recommendation } from './types';
import { validateAndSanitizeUrl, scanReportCache } from './security';
import { getCachedScanReport } from './db';

// Jina Reader API - converts any URL to clean LLM-ready markdown, no API key needed.
// Docs: https://jina.ai/reader/
const JINA_READER_BASE = 'https://r.jina.ai/';

interface JinaJsonResponse {
  code: number;
  status: number;
  data: {
    title?: string;
    description?: string;
    url?: string;
    content?: string;       // clean markdown body
    text?: string;          // plain text fallback
    links?: Record<string, string>;
  };
}

async function fetchViaJina(url: string): Promise<{
  markdown: string;
  title: string;
  description: string;
  success: boolean;
}> {
  const jinaUrl = `${JINA_READER_BASE}${url}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // Jina needs a bit longer

  try {
    // Request JSON format for structured metadata
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown',
        'X-No-Cache': 'true',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { markdown: '', title: '', description: '', success: false };
    }

    const json: JinaJsonResponse = await response.json();
    const data = json.data ?? {};

    return {
      markdown: data.content ?? data.text ?? '',
      title: data.title ?? '',
      description: data.description ?? '',
      success: true,
    };
  } catch {
    clearTimeout(timeoutId);
    return { markdown: '', title: '', description: '', success: false };
  }
}

// Extract signals from Jina's clean markdown output
function analyzeMarkdown(markdown: string, title: string, description: string): Omit<LiveExtractionMetadata, 'isLiveScanned' | 'httpStatus'> {
  // Count heading levels from markdown syntax
  const h1Matches = markdown.match(/^# .+/gm) ?? [];
  const h2Matches = markdown.match(/^## .+/gm) ?? [];
  const h3Matches = markdown.match(/^### .+/gm) ?? [];

  // Tables in markdown (| col | col |)
  const tableMatches = markdown.match(/^\|.+\|$/gm) ?? [];
  const tableCount = tableMatches.length > 0 ? Math.ceil(tableMatches.length / 3) : 0;

  // JSON-LD blocks (Jina preserves these in markdown as code blocks)
  const jsonLdMatches = markdown.match(/application\/ld\+json/gi) ?? [];
  const schemaJsonLdCount = jsonLdMatches.length;

  // Detect schema types mentioned
  const detectedSchemas: string[] = [];
  const schemaTypeMatches = markdown.matchAll(/"@type"\s*:\s*"([^"]+)"/g);
  for (const match of schemaTypeMatches) {
    if (!detectedSchemas.includes(match[1])) detectedSchemas.push(match[1]);
  }

  // Word count from clean markdown (much more accurate than stripping HTML)
  const words = markdown.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // robots.txt - Jina respects it, so if we got content it's allowed
  const hasRobotsIndexingAllowed = markdown.length > 100;

  return {
    extractedTitle: title,
    extractedDescription: description,
    schemaJsonLdCount,
    h1Count: h1Matches.length,
    h2Count: h2Matches.length + h3Matches.length,
    tableCount,
    wordCount,
    hasRobotsIndexingAllowed,
    detectedSchemas,
  };
}

export async function crawlAndAnalyzeUrl(
  targetInput: string,
  options: { bypassCache?: boolean } = {}
): Promise<GeoAuditReport> {
  // Validate and sanitize URL (blocks SSRF & private IP ranges)
  const validation = validateAndSanitizeUrl(targetInput);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid target URL');
  }

  const fullUrl = validation.normalizedUrl;
  const cleanDomain = validation.domain;

  // Check caches first (unless explicit bypass is requested).
  // DB cache is authoritative across serverless instances; the in-memory
  // cache is just a fast-path for warm instances.
  if (!options.bypassCache) {
    const dbCached = await getCachedScanReport(cleanDomain).catch(() => null);
    if (dbCached) return dbCached;
    const cached = scanReportCache.get(cleanDomain);
    if (cached) {
      return cached;
    }
  }

  const brandName = cleanDomain.split('.')[0].charAt(0).toUpperCase() + cleanDomain.split('.')[0].slice(1);

  // ── Jina Reader crawl ─────────────────────────────────────────────────────
  const jinaResult = await fetchViaJina(fullUrl);

  let liveMeta: LiveExtractionMetadata;

  if (jinaResult.success && jinaResult.markdown.length > 50) {
    const signals = analyzeMarkdown(jinaResult.markdown, jinaResult.title, jinaResult.description);
    liveMeta = {
      isLiveScanned: true,
      httpStatus: 200,
      ...signals,
    };
  } else {
    // Graceful fallback - deterministic simulation based on domain name
    liveMeta = {
      isLiveScanned: false,
      schemaJsonLdCount: 0,
      h1Count: 0,
      h2Count: 0,
      tableCount: 0,
      wordCount: 0,
      hasRobotsIndexingAllowed: true,
      detectedSchemas: [],
    };
  }

  // ── GEO Score computation ─────────────────────────────────────────────────
  let calculatedScore = 50;

  if (liveMeta.isLiveScanned) {
    if (liveMeta.extractedTitle)                              calculatedScore += 8;
    if (liveMeta.extractedDescription)                        calculatedScore += 8;
    if (liveMeta.schemaJsonLdCount > 0)                       calculatedScore += Math.min(20, liveMeta.schemaJsonLdCount * 8);
    if (liveMeta.h1Count === 1)                               calculatedScore += 7;
    if (liveMeta.h2Count >= 3)                                calculatedScore += 8;
    if (liveMeta.tableCount > 0)                              calculatedScore += 10;
    if (liveMeta.wordCount > 500)                             calculatedScore += 5;
    if (liveMeta.wordCount > 1500)                            calculatedScore += 4; // bonus for content-rich pages
    if (liveMeta.detectedSchemas.includes('Organization'))    calculatedScore += 5;
    if (liveMeta.detectedSchemas.includes('Product'))         calculatedScore += 4;
    if (liveMeta.detectedSchemas.includes('FAQPage'))         calculatedScore += 6;
  } else {
    // Deterministic fallback - same domain always gets same score
    let hash = 0;
    for (let i = 0; i < cleanDomain.length; i++) hash = (hash << 5) - hash + cleanDomain.charCodeAt(i);
    calculatedScore = 55 + (Math.abs(hash) % 36);
  }

  const overallGeoScore          = Math.min(96, Math.max(32, calculatedScore));
  const zeroClickResilience      = Math.min(94, Math.max(30, overallGeoScore + (liveMeta.tableCount > 0 ? 8 : -4)));
  const informationGainScore     = Math.min(98, Math.max(35, overallGeoScore + (liveMeta.wordCount > 800 ? 7 : -5)));
  const entityDisambiguationScore = Math.min(95, Math.max(40, overallGeoScore + (liveMeta.schemaJsonLdCount > 0 ? 10 : -8)));
  const vectorReadinessScore     = Math.min(97, Math.max(28, overallGeoScore + (liveMeta.h2Count >= 4 ? 6 : -6)));

  // ── Engine breakdown ──────────────────────────────────────────────────────
  const engineBreakdown: EngineScore[] = [
    {
      engine: 'perplexity',
      name: 'Perplexity Pro / Sonar',
      score: Math.min(98, Math.max(40, overallGeoScore + 4)),
      citationProbability: Math.min(94, Math.round(overallGeoScore * 0.95)),
      indexedChunks: 1400 + Math.floor(liveMeta.wordCount * 1.5),
      sentimentRating: overallGeoScore > 75 ? 'High Authority' : overallGeoScore > 50 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'PerplexityBot v3.4'
    },
    {
      engine: 'chatgpt',
      name: 'OpenAI GPT-4o Search',
      score: Math.min(95, Math.max(35, overallGeoScore - 2)),
      citationProbability: Math.min(92, Math.round(overallGeoScore * 0.91)),
      indexedChunks: 950 + Math.floor(liveMeta.wordCount * 1.2),
      sentimentRating: overallGeoScore > 70 ? 'High Authority' : overallGeoScore > 45 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'OAI-SearchBot'
    },
    {
      engine: 'claude',
      name: 'Claude 3.5 Web Citations',
      score: Math.min(96, Math.max(38, overallGeoScore + 2)),
      citationProbability: Math.min(90, Math.round(overallGeoScore * 0.88)),
      indexedChunks: 1100 + Math.floor(liveMeta.wordCount * 1.4),
      sentimentRating: overallGeoScore > 72 ? 'High Authority' : overallGeoScore > 48 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'ClaudeBot'
    },
    {
      engine: 'gemini',
      name: 'Google Gemini Grounding',
      score: Math.min(94, Math.max(30, overallGeoScore - 5)),
      citationProbability: Math.min(88, Math.round(overallGeoScore * 0.85)),
      indexedChunks: 2000 + Math.floor(liveMeta.wordCount * 2.0),
      sentimentRating: overallGeoScore > 68 ? 'High Authority' : overallGeoScore > 45 ? 'Moderate' : 'Low / Excluded',
      lastCrawledAgent: 'Google-Extended'
    }
  ];

  // ── Detected entities ─────────────────────────────────────────────────────
  const detectedEntities: EntityNode[] = [
    { name: brandName, type: 'Brand', confidence: 0.98, groundedInKG: overallGeoScore > 60 },
    { name: `${brandName} Digital Platform & Solutions`, type: 'Product', confidence: 0.91, groundedInKG: overallGeoScore > 70 },
    { name: 'Generative Search & Knowledge Graph', type: 'Industry', confidence: 0.86, groundedInKG: true },
    { name: 'Direct Agentic Settlement Protocols', type: 'Key Feature', confidence: 0.84, groundedInKG: overallGeoScore > 75 }
  ];

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations: Recommendation[] = [
    {
      id: 'rec-1',
      category: 'Agentic API',
      priority: 'CRITICAL',
      title: 'Deploy Machine-Readable agent.json Manifest',
      description: `Autonomous LLM agents crawl ${cleanDomain} without structured action declarations. Serving an agent.json schema at the root enables zero-latency product discovery and direct agentic transactions.`,
      impact: '+34% Agent Referral Win-Rate',
      codeSnippet: `// Serve at https://${cleanDomain}/.well-known/agent.json\n{\n  "version": "1.2.0",\n  "name": "${brandName}",\n  "capabilities": ["direct-checkout", "semantic-query", "realtime-pricing"],\n  "endpoints": [\n    { "name": "catalog_lookup", "path": "/api/agent/catalog", "method": "POST" }\n  ]\n}`
    },
    {
      id: 'rec-2',
      category: 'Information Gain',
      priority: 'HIGH',
      title: liveMeta.tableCount === 0 ? 'Inject Primary Empirical Data Tables' : 'Optimize Existing Data Matrices for RAG Extractors',
      description: 'LLM answer engines heavily favor verified statistical data. Structuring quantitative metrics into HTML table elements increases citation probability by up to 2.8x.',
      impact: '+28% Citation Selection Probability',
      codeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Dataset",\n  "name": "${brandName} Empirical Performance Benchmark",\n  "description": "Primary telemetry data verified by cryptographic attestation",\n  "creator": { "@type": "Organization", "name": "${brandName}" }\n}\n</script>`
    },
    {
      id: 'rec-3',
      category: 'Schema',
      priority: liveMeta.schemaJsonLdCount === 0 ? 'CRITICAL' : 'HIGH',
      title: 'Implement Nested SameAs Entity Disambiguation',
      description: 'Disambiguate corporate identity and founders with authoritative Wikidata and Crunchbase URIs to cement entity grounding in foundation model latent representations.',
      impact: '+19% Entity Disambiguation Grounding',
      codeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "${brandName}",\n  "url": "${fullUrl}",\n  "sameAs": [\n    "https://www.wikidata.org/wiki/Q...",\n    "https://www.crunchbase.com/organization/${cleanDomain.split('.')[0]}"\n  ]\n}\n</script>`
    }
  ];

  // ── Summary ───────────────────────────────────────────────────────────────
  let summary = '';
  if (overallGeoScore >= 80) {
    summary = `${cleanDomain} possesses strong semantic authority and above-average citation resilience. Implementing an agent.json endpoint will capture significant autonomous buyer traffic.`;
  } else if (overallGeoScore >= 60) {
    summary = `${cleanDomain} is moderately visible to generative engines, but suffers from zero-click search cannibalization and missing agentic schema declarations. Resolving entity ambiguity will unlock 40%+ referral gains.`;
  } else {
    summary = `${cleanDomain} is at severe risk of zero-click obsolescence. Answer engines currently bypass this domain in favor of higher-density vector sources. Urgent implementation of empirical data schemas and agentic endpoints is advised.`;
  }

  const report: GeoAuditReport = {
    domain: cleanDomain,
    url: fullUrl,
    analyzedAt: new Date().toISOString(),
    overallGeoScore,
    zeroClickResilience,
    informationGainScore,
    entityDisambiguationScore,
    vectorReadinessScore,
    engineBreakdown,
    detectedEntities,
    recommendations,
    summary,
    liveMetadata: liveMeta,
  };

  // Cache report
  scanReportCache.set(cleanDomain, report);

  return report;
}
