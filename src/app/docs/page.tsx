import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Book, Code, Globe, Shield, Cpu, ArrowRight, CheckCircle2, Layers, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'agent.json Specification & Documentation | OmniRoute',
  description: 'Complete technical reference for the agent.json protocol — the machine-readable standard that enables AI search engines and autonomous buyer agents to discover, query, and transact with your website.',
};

const SCHEMA_FIELDS = [
  { field: 'version', type: 'string', required: true, description: 'Protocol version (e.g. "1.2.0"). Used by crawlers to determine feature support.' },
  { field: 'siteName', type: 'string', required: true, description: 'Human-readable name of your site or platform.' },
  { field: 'domain', type: 'string', required: true, description: 'Primary domain hostname (e.g. "stripe.com").' },
  { field: 'description', type: 'string', required: true, description: 'Semantic description optimized for LLM context windows. Include key capabilities and differentiators.' },
  { field: 'organization', type: 'object', required: true, description: 'Publisher metadata: legalName, foundedYear, headquarters, contactEmail.' },
  { field: 'capabilities', type: 'string[]', required: true, description: 'Array of supported agent capabilities: "direct-agent-checkout", "semantic-api-query", "realtime-geo-audit", etc.' },
  { field: 'endpoints', type: 'Endpoint[]', required: true, description: 'Array of service endpoints that autonomous agents can invoke. Each has: id, name, path, method, description, authRequired, pricingType.' },
  { field: 'products', type: 'Product[]', required: false, description: 'Optional product catalog for direct agent checkout. Each has: id, name, sku, price, currency, category, inStock, directAgentCheckoutUrl.' },
  { field: 'semanticVectors', type: 'object', required: false, description: 'Links to pre-computed embeddings (embeddingsUrl, contextSizeTokens, lastUpdated) for RAG integration.' },
  { field: 'accessPolicy', type: 'object', required: true, description: 'Controls: allowAgentCrawlers (boolean), allowDirectTransactions (boolean), rateLimitPerMin (number).' },
];

export default function DocsPage() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Hero */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Book className="w-3.5 h-3.5" />
          <span>Protocol Documentation v1.2</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          agent.json <span className="gradient-text">Specification</span>
        </h1>

        <p className="text-sm sm:text-base text-[#BBBFBF] leading-relaxed max-w-3xl">
          The <code className="text-[#05AD98] font-mono">agent.json</code> protocol is a machine-readable standard deployed at
          {' '}<code className="text-[#05AD98] font-mono">/.well-known/agent.json</code> that enables AI search engines and
          autonomous buyer agents to discover, query, and transact with your website — without human intermediary lag.
        </p>

        {/* Quick install link */}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/docs/install"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold shadow-lg shadow-[rgba(5,173,152,0.20)] transition-all"
          >
            Install Tracking Snippet
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/manifest"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[rgba(187,191,191,0.15)] bg-[#111514] hover:border-[rgba(5,173,152,0.30)] text-white text-sm font-semibold transition-all"
          >
            agent.json Studio
          </Link>
        </div>
      </section>

      {/* Overview */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#05AD98]" />
          What Is agent.json?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Cpu, title: 'Machine-Readable API', desc: 'Transforms any website into an autonomous agent endpoint. AI assistants can discover your capabilities, products, and pricing programmatically.' },
            { icon: Shield, title: 'Controlled Access', desc: 'Define rate limits, auth requirements, and which agent crawlers are allowed. You stay in full control of who accesses your data.' },
            { icon: Zap, title: 'Zero-Click Transactions', desc: 'Personal AI buyer agents can discover products and execute checkout orders in milliseconds — no human browsing needed.' },
          ].map((item, i) => (
            <div key={i} className="glass-card rounded-xl p-5 border border-[rgba(187,191,191,0.08)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] flex items-center justify-center text-[#05AD98]">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{item.title}</h3>
              <p className="text-xs text-[#878787] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Schema Reference */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Code className="w-5 h-5 text-[#05AD98]" />
          Schema Reference
        </h2>

        <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[160px_90px_60px_1fr] gap-2 px-5 py-3 bg-[#111514]/60 border-b border-[rgba(187,191,191,0.10)] text-[10px] uppercase tracking-wider font-semibold text-[#878787]">
            <span>Field</span>
            <span>Type</span>
            <span>Required</span>
            <span>Description</span>
          </div>

          {/* Table Rows */}
          {SCHEMA_FIELDS.map((field) => (
            <div
              key={field.field}
              className="grid grid-cols-[160px_90px_60px_1fr] gap-2 px-5 py-3 border-b border-[rgba(187,191,191,0.06)] hover:bg-[#111514]/30 transition-colors items-start"
            >
              <code className="text-xs font-mono text-[#05AD98] font-semibold">{field.field}</code>
              <span className="text-xs font-mono text-[#B8A04A]">{field.type}</span>
              <span className="text-xs">
                {field.required ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#05AD98]" />
                ) : (
                  <span className="text-[#878787]">—</span>
                )}
              </span>
              <span className="text-xs text-[#BBBFBF] leading-relaxed">{field.description}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Minimal Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#05AD98]" />
          Minimal Example
        </h2>
        <pre className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] text-xs text-[#05AD98] font-mono overflow-x-auto leading-relaxed">
{`{
  "version": "1.2.0",
  "siteName": "Your Brand",
  "domain": "yourbrand.com",
  "description": "Your brand's agent-friendly description for LLM context.",
  "organization": {
    "legalName": "Your Brand Inc.",
    "foundedYear": 2024,
    "headquarters": "San Francisco, CA",
    "contactEmail": "agents@yourbrand.com"
  },
  "capabilities": ["direct-agent-checkout", "semantic-api-query"],
  "endpoints": [
    {
      "id": "ep-1",
      "name": "Product Catalog API",
      "path": "/api/agent/catalog",
      "method": "GET",
      "description": "Returns full product catalog for autonomous buyer agents.",
      "authRequired": false,
      "pricingType": "free"
    }
  ],
  "accessPolicy": {
    "allowAgentCrawlers": true,
    "allowDirectTransactions": true,
    "rateLimitPerMin": 600
  }
}`}
        </pre>
      </section>

      {/* Deployment Guide */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <h2 className="text-xl font-bold text-white">Deployment Guide</h2>
        <div className="space-y-4 text-sm text-[#BBBFBF]">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] text-xs font-bold shrink-0">1</span>
            <p>Use the <Link href="/manifest" className="text-[#05AD98] hover:underline font-semibold">agent.json Studio</Link> to generate your manifest with the Visual Builder.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] text-xs font-bold shrink-0">2</span>
            <p>Copy the deployment snippet for your platform (Next.js, Cloudflare Worker, FastAPI, or the Edge Worker with bot detection).</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] text-xs font-bold shrink-0">3</span>
            <p>Deploy and verify at <code className="text-[#05AD98] font-mono text-xs">https://yourdomain.com/.well-known/agent.json</code></p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] text-xs font-bold shrink-0">4</span>
            <p>Run a <Link href="/audit" className="text-[#05AD98] hover:underline font-semibold">GEO Audit</Link> to verify AI engines can discover your manifest.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-4">
        <Link
          href="/manifest"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold shadow-lg shadow-[rgba(5,173,152,0.25)] transition-all"
        >
          Open agent.json Studio
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
