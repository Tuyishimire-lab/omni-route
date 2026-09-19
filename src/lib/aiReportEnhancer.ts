/**
 * CiteRoute Engine — Report Intelligence Pipeline
 * ────────────────────────────────────────────────────
 * Transforms heuristic GEO audit reports into deep, semantic AI assessments
 * powered by CiteRoute's internal model orchestration layer.
 */

import { GeoAuditReport, AiReportInsights, EngineScore, EngineType } from './types';
import { generateJson, isAiEngineConfigured } from './openrouter';

const SYSTEM_PROMPT = `You are CiteRoute's elite Generative Engine Optimization (GEO) & Autonomous AI Agent Auditor.
Your mission: evaluate how generative answer engines (Perplexity, ChatGPT Browse, Google Gemini, Anthropic Claude) ingest, index, cite, or ignore websites.

Analyze the website domain, audit scores, and live content excerpt to return a deep, actionable GEO assessment in valid JSON.

Output JSON Format:
{
  "executiveSummary": "2-3 sharp, authoritative sentences analyzing this brand's generative visibility, topical footprint, and why search models cite or bypass it.",
  "topicalAuthorityScore": <integer 0-100>,
  "citationRiskFactors": [
    "Specific vulnerability 1 regarding factual density, zero-click cannibalization, or entity ambiguity",
    "Specific vulnerability 2 regarding schema voids or unstructured documentation"
  ],
  "engineBreakdown": [
    {
      "engine": "perplexity",
      "name": "Perplexity Pro / Sonar",
      "score": <integer 0-100 based on factual table density and retrieval suitability>,
      "citationProbability": <integer 0-100>,
      "sentimentRating": "High Authority | Moderate | Low / Excluded",
      "citationSnippet": "Concise 1-sentence diagnostic of how Perplexity answers queries about this brand."
    },
    {
      "engine": "chatgpt",
      "name": "OpenAI GPT-4o Search",
      "score": <integer 0-100 based on brand entity clarity and autonomous agent readiness>,
      "citationProbability": <integer 0-100>,
      "sentimentRating": "High Authority | Moderate | Low / Excluded",
      "citationSnippet": "Concise 1-sentence diagnostic of ChatGPT Search citation presence."
    },
    {
      "engine": "claude",
      "name": "Claude 3.5 Web Citations",
      "score": <integer 0-100 based on passage extraction and empirical depth>,
      "citationProbability": <integer 0-100>,
      "sentimentRating": "High Authority | Moderate | Low / Excluded",
      "citationSnippet": "Concise 1-sentence diagnostic of Claude citation likelihood."
    },
    {
      "engine": "gemini",
      "name": "Google Gemini Grounding",
      "score": <integer 0-100 based on Knowledge Graph entity verification>,
      "citationProbability": <integer 0-100>,
      "sentimentRating": "High Authority | Moderate | Low / Excluded",
      "citationSnippet": "Concise 1-sentence diagnostic of Google Gemini grounding authority."
    }
  ],
  "tailoredSchemas": [
    {
      "type": "Organization | FAQPage | TechArticle | Product | Dataset",
      "title": "Descriptive title for this schema",
      "description": "Why this schema is critical for this specific website",
      "jsonLd": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Organization\\",\\"name\\":\\"Brand\\",\\"url\\":\\"https://domain\\"}"
    }
  ],
  "suggestedAgentManifest": "{\\"schema_version\\":\\"1.2\\",\\"name\\":\\"Brand Agent\\",\\"description\\":\\"Official agent\\",\\"endpoints\\":{\\"chat\\":\\"/api/agent\\"}}",
  "contentRewrites": [
    {
      "originalIssue": "Weak or vague copy pattern detected on page (e.g. fluffy marketing claim)",
      "suggestedCopy": "Empirical, high-information-gain rewrite with concrete metrics and structured formatting",
      "rationale": "Why generative answer engines (e.g. Perplexity Pro) preferentially cite this version"
    }
  ],
  "competitorStrategies": [
    "Tactical step to out-cite niche competitors in AI search results",
    "Tactical step to capture autonomous buyer agent queries"
  ]
}

Ensure all jsonLd and suggestedAgentManifest fields are valid stringified JSON. Keep schemas and manifests concise, accurate, and directly copy-pasteable.
Punctuation rule: Never use em dashes ("—" or "--"). Use commas, periods, colons, or parentheses instead.`;

interface AiEnhancementData extends Omit<AiReportInsights, 'modelUsed' | 'generatedAt'> {
  engineBreakdown?: Array<{
    engine: string;
    name?: string;
    score?: number;
    citationProbability?: number;
    sentimentRating?: string;
    citationSnippet?: string;
  }>;
}

export async function enhanceAuditReportWithAi(
  report: GeoAuditReport,
  pageMarkdownContent?: string
): Promise<GeoAuditReport> {
  if (!isAiEngineConfigured()) {
    return report;
  }

  try {
    const meta = report.liveMetadata;
    const contentExcerpt = pageMarkdownContent
      ? pageMarkdownContent.slice(0, 1500)
      : `Title: ${meta?.extractedTitle || report.domain}\nDescription: ${meta?.extractedDescription || 'N/A'}`;

    const prompt = `Analyze this domain for Generative Engine Optimization (GEO):
Domain: ${report.domain}
URL: ${report.url}
Overall GEO Score: ${report.overallGeoScore}/100
Zero-Click Resilience: ${report.zeroClickResilience}/100
Information Gain Score: ${report.informationGainScore}/100
Entity Disambiguation: ${report.entityDisambiguationScore}/100
Vector Readiness: ${report.vectorReadinessScore}/100

Extracted Metadata:
- Page Title: ${meta?.extractedTitle || 'N/A'}
- Meta Description: ${meta?.extractedDescription || 'N/A'}
- Schema JSON-LD Count: ${meta?.schemaJsonLdCount ?? 0} (Detected: ${meta?.detectedSchemas?.join(', ') || 'None'})
- Structure: ${meta?.h1Count ?? 0} H1s, ${meta?.h2Count ?? 0} H2s, ${meta?.tableCount ?? 0} Tables, ${meta?.wordCount ?? 0} Words

Live Page Text Excerpt:
"""
${contentExcerpt}
"""

Generate the complete, high-precision GEO assessment, tailored schemas, and foundation model diagnostics in the requested JSON structure. Keep responses punchy, concise, and production-ready.`;

    const { data, modelUsed } = await generateJson<AiEnhancementData>({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.15,
      maxTokens: 2200,
    });

    const aiInsights: AiReportInsights = {
      modelUsed,
      generatedAt: new Date().toISOString(),
      executiveSummary: data.executiveSummary || report.summary,
      topicalAuthorityScore: typeof data.topicalAuthorityScore === 'number' ? data.topicalAuthorityScore : report.overallGeoScore,
      citationRiskFactors: Array.isArray(data.citationRiskFactors) ? data.citationRiskFactors : [],
      tailoredSchemas: Array.isArray(data.tailoredSchemas) ? data.tailoredSchemas : [],
      suggestedAgentManifest: data.suggestedAgentManifest,
      contentRewrites: Array.isArray(data.contentRewrites) ? data.contentRewrites : [],
      competitorStrategies: Array.isArray(data.competitorStrategies) ? data.competitorStrategies : [],
    };

    const liveEngineBreakdown: EngineScore[] = Array.isArray(data.engineBreakdown) && data.engineBreakdown.length > 0
      ? data.engineBreakdown.map(e => ({
          engine: (['perplexity', 'chatgpt', 'claude', 'gemini'].includes(e.engine) ? e.engine : 'perplexity') as EngineType,
          name: e.name || (e.engine === 'perplexity' ? 'Perplexity Pro / Sonar' : e.engine === 'chatgpt' ? 'OpenAI GPT-4o Search' : e.engine === 'claude' ? 'Claude 3.5 Web Citations' : 'Google Gemini Grounding'),
          score: Math.min(100, Math.max(0, typeof e.score === 'number' ? e.score : report.overallGeoScore)),
          citationProbability: Math.min(100, Math.max(0, typeof e.citationProbability === 'number' ? e.citationProbability : Math.round(report.overallGeoScore * 0.9))),
          sentimentRating: (['High Authority', 'Moderate', 'Low / Excluded'].includes(e.sentimentRating || '') ? e.sentimentRating : (report.overallGeoScore > 75 ? 'High Authority' : report.overallGeoScore > 50 ? 'Moderate' : 'Low / Excluded')) as EngineScore['sentimentRating'],
          isLiveQuery: true,
          citationSnippet: e.citationSnippet || undefined,
        }))
      : report.engineBreakdown;

    return {
      ...report,
      aiInsights,
      engineBreakdown: liveEngineBreakdown,
      // If AI produced a more authoritative summary, elevate the overall report summary
      summary: aiInsights.executiveSummary || report.summary,
    };
  } catch (error) {
    console.warn('[CiteRoute Engine] Enhancement failed:', error);
    // Return original report without breaking the user experience
    return report;
  }
}
