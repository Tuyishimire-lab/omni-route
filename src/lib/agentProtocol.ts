import { AgentManifest } from './types';

export const defaultSampleManifest: AgentManifest = {
  version: '1.2.0',
  siteName: 'OmniRoute Core Node',
  domain: 'omniroute.network',
  description: 'Autonomous agentic traffic liquidity protocol and real-time GEO citation engine.',
  organization: {
    legalName: 'OmniRoute Systems Inc.',
    foundedYear: 2026,
    headquarters: 'San Francisco, CA',
    contactEmail: 'agents@omniroute.network'
  },
  capabilities: [
    'direct-agent-checkout',
    'realtime-geo-audit',
    'vector-citation-exchange',
    'zero-knowledge-click-attestation'
  ],
  endpoints: [
    {
      id: 'ep-1',
      name: 'Realtime Citation Audit API',
      path: '/api/v1/geo/audit',
      method: 'POST',
      description: 'Accepts domain URL and returns vector density, entity graph and citation win-rate across Perplexity, ChatGPT, Claude, and Gemini.',
      authRequired: false,
      pricingType: 'free'
    },
    {
      id: 'ep-2',
      name: 'Agentic Product Checkout',
      path: '/api/v1/agent/checkout',
      method: 'POST',
      description: 'Allows autonomous buyer agents to execute immediate purchase orders with zero-click escrow.',
      authRequired: true,
      pricingType: 'checkout'
    },
    {
      id: 'ep-3',
      name: 'Semantic Knowledge Embeddings Feed',
      path: '/api/v1/embeddings/stream',
      method: 'GET',
      description: 'Streams verified semantic embeddings and empirical datasets for RAG integration.',
      authRequired: true,
      pricingType: 'subscription'
    }
  ],
  products: [
    {
      id: 'prod-1',
      name: 'GEO Pro Citation Seeder',
      sku: 'OMNI-GEO-PRO',
      price: 299.00,
      currency: 'USD',
      category: 'Software & Infrastructure',
      inStock: true,
      directAgentCheckoutUrl: 'https://omniroute.network/checkout?sku=OMNI-GEO-PRO&agent=direct'
    },
    {
      id: 'prod-2',
      name: 'Enterprise Agentic Tollway Node',
      sku: 'OMNI-NODE-ENT',
      price: 1850.00,
      currency: 'USD',
      category: 'Edge Infrastructure',
      inStock: true,
      directAgentCheckoutUrl: 'https://omniroute.network/checkout?sku=OMNI-NODE-ENT&agent=direct'
    }
  ],
  semanticVectors: {
    embeddingsUrl: 'https://omniroute.network/.well-known/vectors.parquet',
    contextSizeTokens: 32768,
    lastUpdated: new Date().toISOString()
  },
  accessPolicy: {
    allowAgentCrawlers: true,
    allowDirectTransactions: true,
    rateLimitPerMin: 600
  }
};

export const INDUSTRY_TEMPLATES: Record<string, { label: string; description: string; manifest: AgentManifest }> = {
  saas: {
    label: 'B2B SaaS / Developer API',
    description: 'Optimized for developer platforms, cloud infra, and subscription SaaS products.',
    manifest: {
      version: '1.2.0',
      siteName: 'DevPlatform Cloud',
      domain: 'devplatform.io',
      description: 'Developer infrastructure, programmatic API tokens, and automated deployment pipelines.',
      organization: {
        legalName: 'DevPlatform Inc.',
        foundedYear: 2024,
        headquarters: 'San Francisco, CA',
        contactEmail: 'agents@devplatform.io'
      },
      capabilities: ['direct-agent-checkout', 'semantic-api-query', 'automated-provisioning'],
      endpoints: [
        {
          id: 'ep-saas-1',
          name: 'API Key Provisioning',
          path: '/api/v1/agent/keys',
          method: 'POST',
          description: 'Allows autonomous agents to generate scoped API keys programmatically.',
          authRequired: true,
          pricingType: 'subscription'
        },
        {
          id: 'ep-saas-2',
          name: 'Documentation Semantic Search',
          path: '/api/v1/docs/search',
          method: 'POST',
          description: 'Vector-grounded technical documentation queries for LLM reasoning loops.',
          authRequired: false,
          pricingType: 'free'
        }
      ],
      products: [
        {
          id: 'prod-saas-1',
          name: 'Pro Developer Seat (Monthly)',
          sku: 'DEV-PRO-M',
          price: 49.00,
          currency: 'USD',
          category: 'Software Subscription',
          inStock: true,
          directAgentCheckoutUrl: 'https://devplatform.io/checkout?plan=pro&agent=true'
        }
      ],
      semanticVectors: {
        embeddingsUrl: 'https://devplatform.io/.well-known/vectors.parquet',
        contextSizeTokens: 32768,
        lastUpdated: new Date().toISOString()
      },
      accessPolicy: {
        allowAgentCrawlers: true,
        allowDirectTransactions: true,
        rateLimitPerMin: 1200
      }
    }
  },
  ecommerce: {
    label: 'E-Commerce & Digital Store',
    description: 'Designed for retail shops, digital merchandise, and immediate zero-click checkout.',
    manifest: {
      version: '1.2.0',
      siteName: 'HyperStore Retail',
      domain: 'hyperstore.shop',
      description: 'Next-generation commerce platform with direct autonomous buyer agent fulfillment.',
      organization: {
        legalName: 'HyperStore Commerce LLC',
        foundedYear: 2025,
        headquarters: 'New York, NY',
        contactEmail: 'buyer-agents@hyperstore.shop'
      },
      capabilities: ['direct-agent-checkout', 'realtime-inventory-lookup', 'escrow-settlement'],
      endpoints: [
        {
          id: 'ep-ecom-1',
          name: 'Live Catalog & Inventory Feed',
          path: '/api/agent/catalog',
          method: 'GET',
          description: 'Streams real-time stock levels, pricing, and variant availability.',
          authRequired: false,
          pricingType: 'free'
        },
        {
          id: 'ep-ecom-2',
          name: 'Instant Order Execution',
          path: '/api/agent/orders/create',
          method: 'POST',
          description: 'Executes direct purchases on behalf of verified human principals.',
          authRequired: true,
          pricingType: 'checkout'
        }
      ],
      products: [
        {
          id: 'prod-ecom-1',
          name: 'Wireless Studio Headphones X1',
          sku: 'HDPH-X1-BLK',
          price: 249.99,
          currency: 'USD',
          category: 'Electronics',
          inStock: true,
          directAgentCheckoutUrl: 'https://hyperstore.shop/agent-pay?sku=HDPH-X1-BLK'
        },
        {
          id: 'prod-ecom-2',
          name: 'Minimalist Aluminum Laptop Stand',
          sku: 'STND-AL-01',
          price: 79.00,
          currency: 'USD',
          category: 'Accessories',
          inStock: true,
          directAgentCheckoutUrl: 'https://hyperstore.shop/agent-pay?sku=STND-AL-01'
        }
      ],
      semanticVectors: {
        embeddingsUrl: 'https://hyperstore.shop/.well-known/catalog.parquet',
        contextSizeTokens: 16384,
        lastUpdated: new Date().toISOString()
      },
      accessPolicy: {
        allowAgentCrawlers: true,
        allowDirectTransactions: true,
        rateLimitPerMin: 800
      }
    }
  },
  ai_rag: {
    label: 'AI & Knowledge Provider',
    description: 'Engineered for research labs, data brokers, and empirical benchmark feeds.',
    manifest: {
      version: '1.2.0',
      siteName: 'Synthetix Research',
      domain: 'synthetix.ai',
      description: 'Primary empirical benchmarks, research datasets, and verified semantic vectors.',
      organization: {
        legalName: 'Synthetix Intelligence Inc.',
        foundedYear: 2026,
        headquarters: 'Boston, MA',
        contactEmail: 'research@synthetix.ai'
      },
      capabilities: ['vector-citation-exchange', 'dataset-licensing', 'semantic-grounding'],
      endpoints: [
        {
          id: 'ep-rag-1',
          name: 'Empirical Datasets Stream',
          path: '/api/v1/datasets/query',
          method: 'POST',
          description: 'High-density tabular research matrices formatted for LLM answer engines.',
          authRequired: false,
          pricingType: 'free'
        }
      ],
      products: [
        {
          id: 'prod-rag-1',
          name: 'Enterprise Citation License',
          sku: 'LIC-ENTERPRISE-2026',
          price: 1200.00,
          currency: 'USD',
          category: 'Data & Licensing',
          inStock: true,
          directAgentCheckoutUrl: 'https://synthetix.ai/checkout?sku=LIC-ENTERPRISE-2026'
        }
      ],
      semanticVectors: {
        embeddingsUrl: 'https://synthetix.ai/.well-known/research-vectors.parquet',
        contextSizeTokens: 65536,
        lastUpdated: new Date().toISOString()
      },
      accessPolicy: {
        allowAgentCrawlers: true,
        allowDirectTransactions: true,
        rateLimitPerMin: 2000
      }
    }
  }
};

export function generateCloudflareWorkerScript(manifest: AgentManifest): string {
  const jsonString = JSON.stringify(manifest, null, 2);
  return `/**
 * OmniRoute Edge Agent Manifest & Gateway Worker
 * Deploy on Cloudflare Workers to serve /.well-known/agent.json globally.
 */

const AGENT_MANIFEST = ${jsonString};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve agent.json manifest directly
    if (url.pathname === "/.well-known/agent.json" || url.pathname === "/agent.json") {
      return new Response(JSON.stringify(AGENT_MANIFEST, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
          "X-OmniRoute-Protocol": "agent-v1.2",
          "X-Agent-Transactions": "supported"
        }
      });
    }

    // Pass through all other web traffic to origin
    return fetch(request);
  }
};`;
}

export function generateNextJsRouteHandler(manifest: AgentManifest): string {
  const jsonString = JSON.stringify(manifest, null, 2);
  return `// app/.well-known/agent.json/route.ts (Next.js 14 / 15 / 16 App Router)
import { NextResponse } from 'next/server';

const AGENT_MANIFEST = ${jsonString};

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

export async function GET() {
  return NextResponse.json(AGENT_MANIFEST, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-OmniRoute-Protocol': 'agent-v1.2',
    },
  });
}`;
}

export function generateFastApiSnippet(manifest: AgentManifest): string {
  const jsonString = JSON.stringify(manifest, null, 2);
  return `# main.py (FastAPI / Python)
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

AGENT_MANIFEST = ${jsonString}

@app.get("/.well-known/agent.json")
def get_agent_manifest():
    return JSONResponse(
        content=AGENT_MANIFEST,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
            "X-OmniRoute-Protocol": "agent-v1.2"
        }
    )
`;
}

// ─── Edge Worker with Bot Detection & Telemetry ──────────────────────────────

export function generateEdgeWorkerWithBotDetection(
  manifest: AgentManifest,
  omnirouteApiKey: string = 'YOUR_OMNIROUTE_API_KEY'
): string {
  const jsonString = JSON.stringify(manifest, null, 2);
  const domain = manifest.domain || 'example.com';

  return `// Cloudflare Worker - Bot Detection + agent.json + OmniRoute Telemetry
// Deploy via: wrangler deploy

const AGENT_MANIFEST = ${jsonString};

// Known AI bot User-Agent signatures
const AI_BOT_PATTERNS = [
  { pattern: /PerplexityBot/i,      name: 'Perplexity Pro Sonar',       type: 'AI_CITATION' },
  { pattern: /GPTBot/i,             name: 'OpenAI GPTBot',              type: 'AI_CITATION' },
  { pattern: /OAI-SearchBot/i,      name: 'OpenAI SearchBot',           type: 'AI_CITATION' },
  { pattern: /ChatGPT-User/i,       name: 'ChatGPT Browse',             type: 'AI_CITATION' },
  { pattern: /ClaudeBot/i,          name: 'Anthropic ClaudeBot',         type: 'AI_CITATION' },
  { pattern: /anthropic-ai/i,       name: 'Anthropic Crawler',           type: 'AI_CITATION' },
  { pattern: /Google-Extended/i,    name: 'Google Gemini Extended',      type: 'AI_CITATION' },
  { pattern: /GoogleOther/i,        name: 'Google Other Crawler',        type: 'GEO_INDEX_PING' },
  { pattern: /Applebot-Extended/i,  name: 'Apple Intelligence Bot',      type: 'AI_CITATION' },
  { pattern: /cohere-ai/i,          name: 'Cohere Crawler',              type: 'AI_CITATION' },
  { pattern: /Bytespider/i,         name: 'ByteDance Crawler',           type: 'GEO_INDEX_PING' },
  { pattern: /CCBot/i,              name: 'Common Crawl (AI Training)',   type: 'GEO_INDEX_PING' },
  { pattern: /meta-externalagent/i, name: 'Meta AI Agent',               type: 'AGENT_TX' },
];

const OMNIROUTE_TELEMETRY_URL = 'https://omniroute.vercel.app/api/v1/analytics';
const OMNIROUTE_API_KEY = '${omnirouteApiKey}';
const DOMAIN = '${domain}';

function detectBot(userAgent) {
  for (const bot of AI_BOT_PATTERNS) {
    if (bot.pattern.test(userAgent)) {
      return { name: bot.name, type: bot.type };
    }
  }
  return null;
}

async function reportToOmniRoute(event) {
  try {
    await fetch(OMNIROUTE_TELEMETRY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${OMNIROUTE_API_KEY}\`,
      },
      body: JSON.stringify(event),
    });
  } catch (e) {
    // Fire-and-forget - don't block the response
    console.error('[OmniRoute Telemetry] Failed to report:', e);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // 1. Serve agent.json at well-known path
    if (url.pathname === '/.well-known/agent.json') {
      // Always report agent.json requests as telemetry
      const bot = detectBot(userAgent);
      if (bot) {
        reportToOmniRoute({
          type: bot.type,
          source: bot.name,
          domain: DOMAIN,
          destinationUrl: url.toString(),
          intent: 'agent.json protocol discovery',
          geoScoreAtTime: 85,
          userAgent: userAgent.slice(0, 200),
        });
      }

      return new Response(JSON.stringify(AGENT_MANIFEST, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'X-OmniRoute-Protocol': 'agent-v1.2',
          'X-Bot-Detected': bot ? bot.name : 'none',
        },
      });
    }

    // 2. Detect AI bots on ANY page and report telemetry
    const bot = detectBot(userAgent);
    if (bot) {
      reportToOmniRoute({
        type: bot.type,
        source: bot.name,
        domain: DOMAIN,
        destinationUrl: url.toString(),
        intent: \`Page crawl: \${url.pathname}\`,
        geoScoreAtTime: 85,
        userAgent: userAgent.slice(0, 200),
      });
    }

    // 3. Pass through all traffic to origin
    return fetch(request);
  },
};`;
}
