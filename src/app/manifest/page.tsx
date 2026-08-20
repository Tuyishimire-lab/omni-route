import React from 'react';
import AgentJsonEditor from '../../components/AgentJsonEditor';
import { Cpu, Info, CheckCircle2, Code, Globe2 } from 'lucide-react';

export default function ManifestPage() {
  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.08)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Cpu className="w-3.5 h-3.5" />
          <span>Machine-Readable Web Standards for AI Agents</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Universal <code className="text-[#05AD98] font-mono">agent.json</code> Protocol Studio
        </h1>
        <p className="text-xs sm:text-sm text-[#BBBFBF] max-w-3xl leading-relaxed">
          Just as <code>robots.txt</code> governed search engine crawlers in 1994 and <code>sitemap.xml</code> guided Google in 2005, <strong className="text-white">agent.json</strong> is the 2026 open standard that allows autonomous buyer agents (OpenAI Operator, Claude Computer Use, Perplexity Commerce) to understand your actions, catalog, and direct checkout endpoints with zero human friction.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3 bg-[#111514]/60 rounded-xl border border-[rgba(187,191,191,0.10)] text-xs flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[rgba(5,173,152,0.10)] text-[#05AD98]">
              <Globe2 className="w-4 h-4" />
            </span>
            <div>
              <span className="font-semibold text-white block">Standard Location</span>
              <span className="text-[#878787] font-mono text-[11px]">/.well-known/agent.json</span>
            </div>
          </div>

          <div className="p-3 bg-[#111514]/60 rounded-xl border border-[rgba(187,191,191,0.10)] text-xs flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[rgba(5,173,152,0.08)] text-[#05AD98]">
              <Code className="w-4 h-4" />
            </span>
            <div>
              <span className="font-semibold text-white block">Zero-Latency Edge</span>
              <span className="text-[#878787] text-[11px]">Cloudflare / Fastly Worker</span>
            </div>
          </div>

          <div className="p-3 bg-[#111514]/60 rounded-xl border border-[rgba(187,191,191,0.10)] text-xs flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[rgba(5,173,152,0.10)] text-[#05AD98]">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <span className="font-semibold text-white block">Autonomous Checkout</span>
              <span className="text-[#878787] text-[11px]">Zero-Click Escrow APIs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Component */}
      <React.Suspense fallback={<div className="p-8 text-center text-xs text-[#878787]">Loading Protocol Studio...</div>}>
        <AgentJsonEditor />
      </React.Suspense>
    </div>
  );
}
