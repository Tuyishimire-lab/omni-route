/**
 * CiteRoute Engine — Recommendation Intelligence
 * ──────────────────────────────────────────────────
 * Enriches static heuristic recommendations with AI-generated,
 * domain-specific advice, personalized code snippets, and effort/impact tags.
 */

import { Recommendation } from './types';
import { generateJson, isAiEngineConfigured } from './openrouter';

interface AiRecommendationEnrichment {
  recommendations: Array<{
    id: string;
    enhancedDescription: string;
    enhancedCodeSnippet?: string;
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    effortImpact: 'QUICK_WIN' | 'STRATEGIC' | 'NICE_TO_HAVE';
  }>;
}

const SYSTEM_PROMPT = `You are CiteRoute's GEO (Generative Engine Optimization) expert. Your task is to enhance static audit recommendations for a specific website.

For each recommendation, you must:
1. Rewrite the description to be specific to THIS domain: reference the actual site content, detected schemas, and real weaknesses
2. Provide a personalized code snippet if applicable (real company name, real URL, accurate Schema.org types)
3. Classify effort: LOW (copy-paste fix, < 1 hour), MEDIUM (requires developer, 1-4 hours), HIGH (architectural change, 1+ days)
4. Classify effort-impact: QUICK_WIN (low effort + high impact), STRATEGIC (high effort + high impact), NICE_TO_HAVE (low impact)

Punctuation rule: Never use em dashes ("—" or "--"). Use commas, periods, colons, or parentheses instead.

Output JSON:
{
  "recommendations": [
    {
      "id": "<original recommendation id>",
      "enhancedDescription": "<domain-specific rewrite of the description>",
      "enhancedCodeSnippet": "<personalized, copy-pasteable code snippet or null>",
      "effort": "LOW | MEDIUM | HIGH",
      "effortImpact": "QUICK_WIN | STRATEGIC | NICE_TO_HAVE"
    }
  ]
}`;

/**
 * Enhance static recommendations using the AI Engine.
 * Falls back silently to the original recommendations if AI is unavailable.
 */
export async function enhanceRecommendationsWithAi(
  recommendations: Recommendation[],
  context: {
    domain: string;
    url: string;
    overallGeoScore: number;
    pageMarkdown?: string;
    detectedSchemas?: string[];
    schemaCount?: number;
    tableCount?: number;
    wordCount?: number;
  }
): Promise<Recommendation[]> {
  if (!isAiEngineConfigured() || recommendations.length === 0) {
    return addDefaultEffortTags(recommendations);
  }

  try {
    const contentExcerpt = context.pageMarkdown
      ? context.pageMarkdown.slice(0, 1500)
      : `Domain: ${context.domain}`;

    // Target top 5 priority recommendations to guarantee lightning-fast completion
    const targetRecs = recommendations.slice(0, 5);

    const prompt = `Enhance these GEO audit recommendations for ${context.domain} (${context.url}):

Site Context:
- GEO Score: ${context.overallGeoScore}/100
- Detected Schemas: ${context.detectedSchemas?.join(', ') || 'None'}
- Schema Count: ${context.schemaCount ?? 0}
- Table Count: ${context.tableCount ?? 0}
- Word Count: ${context.wordCount ?? 0}

Page Content Excerpt:
"""
${contentExcerpt}
"""

Recommendations to enhance:
${targetRecs.map(r => `- [${r.id}] ${r.title} (${r.category}, ${r.priority}): ${r.description}`).join('\n')}

Provide concise enhanced descriptions, personalized code snippets, and effort/impact classifications.`;

    const { data } = await generateJson<AiRecommendationEnrichment>({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.15,
      maxTokens: 1200,
    });

    if (!data?.recommendations || !Array.isArray(data.recommendations)) {
      return addDefaultEffortTags(recommendations);
    }

    // Merge AI enrichments into original recommendations
    return recommendations.map(rec => {
      const enrichment = data.recommendations.find(e => e.id === rec.id);
      if (!enrichment) return { ...rec, ...getDefaultEffortTag(rec) };

      return {
        ...rec,
        description: enrichment.enhancedDescription || rec.description,
        codeSnippet: enrichment.enhancedCodeSnippet || rec.codeSnippet,
        effort: (['LOW', 'MEDIUM', 'HIGH'].includes(enrichment.effort) ? enrichment.effort : getDefaultEffortTag(rec).effort) as Recommendation['effort'],
        effortImpact: (['QUICK_WIN', 'STRATEGIC', 'NICE_TO_HAVE'].includes(enrichment.effortImpact) ? enrichment.effortImpact : getDefaultEffortTag(rec).effortImpact) as Recommendation['effortImpact'],
      };
    });
  } catch (error) {
    console.warn('[CiteRoute Engine] Recommendation enhancement failed:', error);
    return addDefaultEffortTags(recommendations);
  }
}

/** Fallback: deterministic effort/impact tags based on category+priority */
function getDefaultEffortTag(rec: Recommendation): { effort: Recommendation['effort']; effortImpact: Recommendation['effortImpact'] } {
  if (rec.priority === 'CRITICAL' && rec.category === 'Schema') {
    return { effort: 'LOW', effortImpact: 'QUICK_WIN' };
  }
  if (rec.priority === 'CRITICAL' && rec.category === 'Agentic API') {
    return { effort: 'MEDIUM', effortImpact: 'STRATEGIC' };
  }
  if (rec.priority === 'HIGH') {
    return { effort: 'MEDIUM', effortImpact: 'STRATEGIC' };
  }
  return { effort: 'LOW', effortImpact: 'NICE_TO_HAVE' };
}

function addDefaultEffortTags(recommendations: Recommendation[]): Recommendation[] {
  return recommendations.map(rec => ({ ...rec, ...getDefaultEffortTag(rec) }));
}
