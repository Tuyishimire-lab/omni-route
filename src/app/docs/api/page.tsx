import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Code, Terminal, Key, Shield, Zap, ArrowRight, ExternalLink,
  Layers, CheckCircle2, Copy, Globe, AlertCircle, RefreshCw
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'REST API Reference | CiteRoute Developer Platform',
  description: 'Complete API reference for CiteRoute. Query GEO audits, vector readiness, citation rates, and AI crawler traffic programmatically.',
};

export default function ApiDocsPage() {
  return (
    <div className="space-y-16 max-w-5xl mx-auto py-4">
      {/* Hero Section */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Terminal className="w-3.5 h-3.5" />
          <span>API Reference v1</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          CiteRoute <span className="gradient-text">REST API</span>
        </h1>

        <p className="text-sm sm:text-base text-[#BBBFBF] leading-relaxed max-w-3xl">
          Integrate CiteRoute&apos;s Generative Engine Optimization (GEO) scoring, vector readiness assessments,
          and real-time autonomous agent crawler tracking directly into your CI/CD pipelines, dashboards, and developer workflows.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/api-keys"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-xs font-bold shadow-lg shadow-[rgba(5,173,152,0.20)] transition-all"
          >
            <Key className="w-4 h-4" />
            <span>Get Your API Key</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="px-3.5 py-2 rounded-xl bg-[#0D1512] border border-[rgba(187,191,191,0.12)] font-mono text-xs text-[#05AD98]">
            Base URL: https://www.citeroute.com/api/v1
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
            <Key className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Authentication</h2>
            <p className="text-xs text-[#878787]">All requests to protected endpoints require an HTTP Bearer token header.</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">
          CiteRoute API keys use the prefix <code className="text-[#05AD98] font-mono font-semibold">or-live_</code> followed by 48 hex characters of cryptographically secure entropy.
          Pass your key via the standard <code className="text-white font-mono bg-[#060908] px-2 py-0.5 rounded border border-white/10">Authorization: Bearer &lt;key&gt;</code> request header.
        </p>

        <div className="bg-[#060A08] rounded-2xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#05AD98]">
          <span className="text-[#878787]"># Example Request Header</span>
          <br />
          <span className="text-white">Authorization:</span> Bearer or-live_9f83a7c641b029e8432a10d8ef92bc71...
        </div>

        <div className="p-4 rounded-2xl bg-[rgba(184,160,74,0.08)] border border-[rgba(184,160,74,0.20)] text-xs text-[#BBBFBF] flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#B8A04A] shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Security Recommendation:</strong> Never commit API keys to client-side code repositories or public frontend bundles. Always query CiteRoute through environment variables in backend services.
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
            <Zap className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Rate Limits & Quotas</h2>
            <p className="text-xs text-[#878787]">Request quotas enforced per subscription tier.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#090D0C] border border-[rgba(187,191,191,0.08)] space-y-1.5">
            <span className="text-xs font-bold text-[#05AD98] uppercase">Pro Tier</span>
            <p className="text-2xl font-mono font-extrabold text-white">500 <span className="text-xs text-[#878787]">req/day</span></p>
            <p className="text-[11px] text-[#878787]">Burst limit: 1,000 req/hr.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#090D0C] border border-[rgba(187,191,191,0.08)] space-y-1.5">
            <span className="text-xs font-bold text-[#05AD98] uppercase">Agency Tier</span>
            <p className="text-2xl font-mono font-extrabold text-white">10,000 <span className="text-xs text-[#878787]">req/day</span></p>
            <p className="text-[11px] text-[#878787]">Burst limit: 5,000 req/hr.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#090D0C] border border-[rgba(187,191,191,0.08)] space-y-1.5">
            <span className="text-xs font-bold text-[#B8A04A] uppercase">Enterprise Tier</span>
            <p className="text-2xl font-mono font-extrabold text-white">Unlimited</p>
            <p className="text-[11px] text-[#878787]">Dedicated cluster with SLA.</p>
          </div>
        </div>

        <p className="text-xs text-[#878787]">
          Every API response includes standard HTTP headers: <code className="text-white font-mono">X-RateLimit-Limit</code>,{' '}
          <code className="text-white font-mono">X-RateLimit-Remaining</code>, and <code className="text-white font-mono">Retry-After</code> on status 429.
        </p>
      </section>

      {/* Endpoints Reference */}
      <section className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Core Endpoints</h2>
          <p className="text-xs text-[#878787] mt-1">Direct REST routes available on the CiteRoute platform.</p>
        </div>

        {/* 1. POST /api/v1/scan */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(5,173,152,0.15)] text-[#05AD98] border border-[rgba(5,173,152,0.3)] font-mono text-xs font-bold">
                POST
              </span>
              <code className="text-base font-bold font-mono text-white">/api/v1/scan</code>
            </div>
            <span className="text-xs text-[#878787] font-mono">Requires Bearer Key (or Free Quota)</span>
          </div>

          <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">
            Crawls, parses, and evaluates a target URL against generative AI search engine criteria (Perplexity, ChatGPT, Claude, Gemini). Returns comprehensive GEO audit metrics, zero-click resilience, vector readiness, and actionable fixes.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Request Body (JSON)</h4>
            <div className="bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#BBBFBF]">
              <pre>{`{
  "url": "https://stripe.com",      // (Required) Fully qualified URL or hostname
  "bypassCache": false             // (Optional) Force fresh live crawl
}`}</pre>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Response (200 OK)</h4>
            <div className="bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#05AD98] overflow-x-auto max-h-80">
              <pre>{`{
  "success": true,
  "data": {
    "domain": "stripe.com",
    "overallGeoScore": 94,
    "citationRate": 92,
    "zeroClickResilience": 89,
    "infoGainScore": 90,
    "vectorReadiness": 95,
    "status": "OPTIMAL",
    "engineBreakdown": [
      { "engine": "Perplexity", "citationProbability": 94, "status": "OPTIMAL" },
      { "engine": "ChatGPT Search", "citationProbability": 91, "status": "OPTIMAL" },
      { "engine": "Claude", "citationProbability": 93, "status": "OPTIMAL" },
      { "engine": "Google Gemini", "citationProbability": 90, "status": "OPTIMAL" }
    ],
    "recommendations": [
      {
        "id": "rec-1",
        "title": "Publish machine-readable agent manifest",
        "priority": "HIGH",
        "category": "VECTOR_READINESS",
        "codeSnippet": "..."
      }
    ]
  }
}`}</pre>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Example cURL</h4>
            <div className="bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#BBBFBF] overflow-x-auto">
              <pre>{`curl -X POST https://www.citeroute.com/api/v1/scan \\
  -H "Authorization: Bearer or-live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://stripe.com"}'`}</pre>
            </div>
          </div>
        </div>

        {/* 2. GET /api/v1/leaderboard */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono text-xs font-bold">
                GET
              </span>
              <code className="text-base font-bold font-mono text-white">/api/v1/leaderboard</code>
            </div>
            <span className="text-xs text-[#878787] font-mono">Public / Authenticated</span>
          </div>

          <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">
            Retrieves the global AI-visibility leaderboard rankings across all indexed domains, with category filtering and score metrics.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Query Parameters</h4>
            <div className="bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#BBBFBF]">
              <div><strong className="text-white">category:</strong> (Optional) Filter by category: Fintech, AI & Frontier, Developer Tools, SaaS, etc.</div>
              <div className="mt-1"><strong className="text-white">limit:</strong> (Optional) Number of results to return (default: 50, max: 200).</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Example cURL</h4>
            <div className="bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#BBBFBF] overflow-x-auto">
              <pre>{`curl -X GET "https://www.citeroute.com/api/v1/leaderboard?category=Fintech&limit=10"`}</pre>
            </div>
          </div>
        </div>

        {/* 3. GET /api/v1/leaderboard/history */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono text-xs font-bold">
                GET
              </span>
              <code className="text-base font-bold font-mono text-white">/api/v1/leaderboard/history</code>
            </div>
            <span className="text-xs text-[#878787] font-mono">Public / Authenticated</span>
          </div>

          <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">
            Fetches 14-day historical GEO score trends for a comma-separated list of domains to generate sparklines and comparative competitive charts.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Example cURL</h4>
            <div className="bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#BBBFBF] overflow-x-auto">
              <pre>{`curl -X GET "https://www.citeroute.com/api/v1/leaderboard/history?domains=stripe.com,linear.app&days=14"`}</pre>
            </div>
          </div>
        </div>

        {/* 4. POST /api/indexnow */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(5,173,152,0.15)] text-[#05AD98] border border-[rgba(5,173,152,0.3)] font-mono text-xs font-bold">
                POST
              </span>
              <code className="text-base font-bold font-mono text-white">/api/indexnow</code>
            </div>
            <span className="text-xs text-[#878787] font-mono">IndexNow Protocol</span>
          </div>

          <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">
            Notifies the IndexNow network (Bing, Yandex, Seznam, Naver) that URLs have been created or updated on your domain, triggering instant search bot discovery.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Example cURL</h4>
            <div className="bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#BBBFBF] overflow-x-auto">
              <pre>{`curl -X POST https://www.citeroute.com/api/indexnow \\
  -H "Content-Type: application/json" \\
  -d '{"urls": ["https://www.citeroute.com/docs", "https://www.citeroute.com/pricing"]}'`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="glass-panel-glow rounded-3xl p-8 border border-[rgba(5,173,152,0.3)] text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Ready to build on CiteRoute?</h3>
        <p className="text-xs sm:text-sm text-[#BBBFBF] max-w-lg mx-auto">
          Generate your secret API key from your developer portal and start querying live GEO metrics today.
        </p>
        <div className="pt-2">
          <Link
            href="/api-keys"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] text-xs font-bold text-white shadow-lg shadow-[rgba(5,173,152,0.25)] hover:opacity-95 transition-all"
          >
            <span>Manage API Keys</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
