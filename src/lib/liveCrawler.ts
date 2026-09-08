import { GeoAuditReport, LiveExtractionMetadata } from './types';
import { validateAndSanitizeUrl, scanReportCache } from './security';
import { getCachedScanReport } from './db';
import {
  computeLiveGeoSubscores,
  buildEngineBreakdown,
  buildDetectedEntities,
  buildRecommendations,
  buildScoreSummary,
} from './scoreCalculator';

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

  // ── GEO Score computation via unified scoreCalculator ────────────────────
  const subscores = computeLiveGeoSubscores(liveMeta, cleanDomain);
  const engineBreakdown = buildEngineBreakdown(subscores.overallGeoScore, liveMeta.wordCount);
  const detectedEntities = buildDetectedEntities(brandName, subscores.overallGeoScore);
  const recommendations = buildRecommendations({
    cleanDomain,
    brandName,
    fullUrl,
    tableCount: liveMeta.tableCount,
    schemaJsonLdCount: liveMeta.schemaJsonLdCount,
  });
  const summary = buildScoreSummary(cleanDomain, subscores.overallGeoScore);

  const report: GeoAuditReport = {
    domain: cleanDomain,
    url: fullUrl,
    analyzedAt: new Date().toISOString(),
    ...subscores,
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
