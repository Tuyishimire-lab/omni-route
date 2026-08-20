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

export function generateCloudflareWorkerScript(manifest: AgentManifest): string {
  const jsonString = JSON.stringify(manifest, null, 2);
  return `/**
 * OmniRoute Edge Agent Manifest & Gateway Worker
 * Deploy this on Cloudflare Workers / Fastly Compute to automatically serve
 * the machine-readable /.well-known/agent.json protocol on your domain.
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

    // Pass through all other web traffic to original origin server
    return fetch(request);
  }
};
`;
}
