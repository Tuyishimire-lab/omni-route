'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GeoAuditReport } from '../../lib/types';
import AuditResultView from '../../components/AuditResultView';
import { Search, Globe2, Info, RefreshCw, Radio } from 'lucide-react';

function AuditContent() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get('url') || searchParams.get('domain') || 'stripe.com';
  
  const [domainInput, setDomainInput] = useState(initialDomain);
  const [activeReport, setActiveReport] = useState<GeoAuditReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'live' | 'instant'>('live');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);

  const fetchScan = async (target: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setRateLimitRetryAfter(null);
    try {
      const res = await fetch('/api/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveReport(data.data);
      } else if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
        setRateLimitRetryAfter(Number.isFinite(retryAfter) ? retryAfter : 60);
      } else {
        setErrorMessage(data.error || 'Failed to scan domain');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error executing scan');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const urlDomain = searchParams.get('url') || searchParams.get('domain') || 'stripe.com';
    const t = setTimeout(() => {
      setDomainInput(urlDomain);
      fetchScan(urlDomain);
    }, 0);
    return () => clearTimeout(t);
  }, [searchParams]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    fetchScan(domainInput.trim());
  };

  const samplePresets = [
    { name: 'Stripe (Fintech)', domain: 'stripe.com' },
    { name: 'Shopify (E-Commerce)', domain: 'shopify.com' },
    { name: 'Linear (B2B SaaS)', domain: 'linear.app' },
    { name: 'Notion (Productivity)', domain: 'notion.so' },
    { name: 'Vercel (Dev Platform)', domain: 'vercel.com' }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Scanner */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] text-xs font-semibold text-[#05AD98] mb-2">
              <Info className="w-3.5 h-3.5" />
              <span>Real-Time Generative Engine Optimization Scanner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              AI Visibility & Live Citation Audit
            </h1>
            <p className="text-xs sm:text-sm text-[#878787] mt-1">
              Live crawler inspection analyzing how Perplexity, ChatGPT, Claude, and Gemini perceive, index, and cite your digital property.
            </p>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#0A0E0E] rounded-xl border border-[rgba(187,191,191,0.10)]">
            <Globe2 className="w-5 h-5 text-[#878787]" />
            <input
              type="text"
              placeholder="Enter live website URL (e.g. stripe.com or https://yourbrand.com)"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[rgba(5,173,152,0.25)] transition-all disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Crawling Live DOM & LLM Latent Space...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Run Live GEO Scan</span>
              </>
            )}
          </button>
        </form>

        {rateLimitRetryAfter !== null && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center justify-between gap-3">
            <span>
              Scan limit reached - free scans are capped at 30/minute. Try again in{' '}
              <strong className="font-mono">{rateLimitRetryAfter}s</strong>, or create an API key for higher limits.
            </span>
            <a href="/register" className="shrink-0 underline hover:text-amber-200">Get free key</a>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs pt-1">
          <span className="text-[#878787] font-medium text-[11px]">Quick Benchmarks:</span>
          {samplePresets.map((preset) => (
            <button
              key={preset.domain}
              onClick={() => {
                setDomainInput(preset.domain);
                fetchScan(preset.domain);
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-lg border text-xs font-mono transition-all ${
                activeReport?.domain === preset.domain
                  ? 'bg-[rgba(5,173,152,0.20)] text-[#05AD98] border-[rgba(5,173,152,0.4)] font-semibold'
                  : 'bg-[#111514]/60 text-[#878787] border-[rgba(187,191,191,0.10)] hover:text-white'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Diagnostic Breakdown */}
      {isScanning && !activeReport && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-[rgba(187,191,191,0.10)] space-y-4">
          <div className="w-8 h-8 border-3 border-[#05AD98] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-white">Inspecting Live Web Page & Entity Disambiguation...</p>
          <p className="text-xs text-[#878787]">Extracting JSON-LD schemas, heading hierarchies, and testing foundation model citation probabilities.</p>
        </div>
      )}

      {activeReport && <AuditResultView report={activeReport} />}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#878787]">Loading Live GEO Ingestion Engine...</div>}>
      <AuditContent />
    </Suspense>
  );
}
