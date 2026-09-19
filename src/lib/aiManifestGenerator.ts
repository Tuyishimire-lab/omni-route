/**
 * CiteRoute Engine — Agent Manifest Generator
 * ────────────────────────────────────────────────
 * Auto-generates a production-ready agent.json manifest from live site content
 * using the CiteRoute Engine. Extracts real endpoints, capabilities,
 * products, and descriptions from the crawled page.
 */

import { AgentManifest } from './types';
import { generateJson, isAiEngineConfigured } from './openrouter';

const SYSTEM_PROMPT = `You are CiteRoute's Agent Protocol Specialist. Your task is to generate a production-ready agent.json manifest for a website based on its actual content.

The agent.json manifest enables autonomous AI agents (shopping bots, research agents, price comparison engines) to discover and interact with a website programmatically.

Analyze the provided website content and generate a complete manifest with:
1. Real company/brand information extracted from the site
2. Actual capabilities the site offers (checkout, search, pricing, booking, etc.)
3. Realistic API endpoints that the site SHOULD serve for agents
4. Real products/services if it's an e-commerce or SaaS site
5. Accurate semantic vector configuration

Output JSON matching the AgentManifest schema:
{
  "version": "1.2.0",
  "siteName": "<Brand Name> Agent Gateway",
  "domain": "<domain>",
  "description": "<1-2 sentence description of what agents can do on this site>",
  "organization": {
    "legalName": "<Company legal name>",
    "foundedYear": <year or 2020 if unknown>,
    "headquarters": "<City, Country or 'Not specified'>",
    "contactEmail": "agents@<domain>"
  },
  "capabilities": ["<capability1>", "<capability2>", ...],
  "endpoints": [
    {
      "id": "<unique-id>",
      "name": "<Human readable name>",
      "path": "/api/agent/<action>",
      "method": "GET or POST",
      "description": "<What this endpoint does>",
      "authRequired": false,
      "pricingType": "free"
    }
  ],
  "products": [
    {
      "id": "<sku>",
      "name": "<Product name>",
      "sku": "<SKU>",
      "price": <number>,
      "currency": "USD",
      "category": "<category>",
      "inStock": true,
      "directAgentCheckoutUrl": "https://<domain>/api/agent/checkout?sku=<sku>"
    }
  ],
  "semanticVectors": {
    "embeddingsUrl": "https://<domain>/.well-known/embeddings.json",
    "contextSizeTokens": 8192,
    "lastUpdated": "<ISO date>"
  },
  "accessPolicy": {
    "allowAgentCrawlers": true,
    "allowDirectTransactions": true,
    "rateLimitPerMin": 60
  }
}

Make it realistic and specific to the actual site. Don't invent fake data: infer from the content.
Punctuation rule: Never use em dashes ("—" or "--"). Use commas, periods, colons, or parentheses instead.`;

/**
 * Generate a complete agent.json manifest from a domain's live content.
 */
export async function generateAgentManifestWithAi(
  domain: string,
  siteMarkdown: string,
  siteMeta?: { title?: string; description?: string }
): Promise<AgentManifest | null> {
  if (!isAiEngineConfigured()) {
    return null;
  }

  try {
    const contentExcerpt = siteMarkdown.slice(0, 3500);
    const brandName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

    const prompt = `Generate a complete agent.json manifest for this website:

Domain: ${domain}
Site Title: ${siteMeta?.title || brandName}
Site Description: ${siteMeta?.description || 'Not available'}

Page Content:
"""
${contentExcerpt}
"""

Create a realistic, production-ready agent.json with actual capabilities, endpoints, and products inferred from this site's content.`;

    const { data } = await generateJson<AgentManifest>({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 2500,
    });

    // Validate required fields
    if (!data?.version || !data?.domain || !data?.siteName) {
      console.warn('[CiteRoute Engine] Manifest generation returned incomplete data');
      return null;
    }

    // Ensure domain matches
    data.domain = domain;

    return data;
  } catch (error) {
    console.warn('[CiteRoute Engine] Manifest generation failed:', error);
    return null;
  }
}
