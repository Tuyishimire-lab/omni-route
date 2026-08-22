'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { GeoAuditReport } from '../../lib/types';
import { Scale, Plus, X, Search, Loader2, GitCompare, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

// recharts (~200KB) is lazy-loaded — only fetched when comparison results render
const BenchmarkMatrix = dynamic(() => import('../../components/BenchmarkMatrix'), {
  ssr: false,
  loading: () => (
    <div className="glass-panel rounded-2xl p-8 border border-[rgba(187,191,191,0.10)] flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3 text-[#878787]">
        <Loader2 className="w-6 h-6 animate-spin text-[#05AD98]" />
        <span className="text-xs">Loading comparison chart…</span>
      </div>
    </div>
  ),
});

const PRESET_PACKS = [
  { label: 'Fintech Giants',   domains: ['stripe.com', 'brex.com', 'mercury.com'] },
  { label: 'SaaS Tools',       domains: ['linear.app', 'notion.so', 'vercel.com'] },
  { label: 'E-Commerce',       domains: ['shopify.com', 'bigcommerce.com', 'woocommerce.com'] },
  { label: 'AI Leaders',       domains: ['openai.com', 'anthropic.com', 'mistral.ai'] },
];

type DomainStatus = 'pending' | 'scanning' | 'done' | 'error';

interface DomainState {
  domain: string;
  status: DomainStatus;
  report?: GeoAuditReport;
  error?: string;
}

async function scanDomain(domain: string): Promise<GeoAuditReport> {
  const res = await fetch('/api/v1/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: domain }),
  });
  if (!res.ok) throw new Error(`Scan failed (${res.status})`);
  const json = await res.json();
  return json.data as GeoAuditReport;
}

const STATUS_ICON: Record<DomainStatus, React.ReactNode> = {
  pending:  <span className="w-2 h-2 rounded-full bg-[#878787]" />,
  scanning: <Loader2 className="w-3.5 h-3.5 text-[#05AD98] animate-spin" />,
  done:     <CheckCircle2 className="w-3.5 h-3.5 text-[#05AD98]" />,
  error:    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
};

const STATUS_LABEL: Record<DomainStatus, string> = {
  pending:  'Queued',
  scanning: 'Scanning via Jina...',
  done:     'Complete',
  error:    'Failed',
};

export default function BenchmarkPage() {
  const [domains, setDomains]     = useState<string[]>(['stripe.com', 'brex.com', 'mercury.com']);
  const [inputVal, setInputVal]   = useState('');
  const [domainStates, setDomainStates] = useState<DomainState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun]       = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Completed reports — streams in as each domain finishes
  const completedReports = domainStates
    .filter((s) => s.status === 'done' && s.report)
    .map((s) => s.report!);

  const addDomain = () => {
    const clean = inputVal.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (clean && !domains.includes(clean) && domains.length < 5) {
      setDomains([...domains, clean]);
      setInputVal('');
    }
  };

  const removeDomain = (d: string) => {
    if (isRunning) return;
    setDomains(domains.filter((x) => x !== d));
  };

  const loadPreset = (pack: { domains: string[] }) => {
    if (isRunning) return;
    setDomains(pack.domains);
    setDomainStates([]);
    setHasRun(false);
    setGlobalError('');
  };

  const runBenchmark = async () => {
    if (domains.length < 2) { setGlobalError('Add at least 2 domains to compare.'); return; }
    setGlobalError('');
    setHasRun(false);
    setIsRunning(true);

    // Initialize all domains as pending
    const initial: DomainState[] = domains.map((d) => ({ domain: d, status: 'pending' }));
    setDomainStates(initial);

    // Scan each domain sequentially so Jina isn't hammered in parallel
    // Results appear one by one as they complete
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];

      // Mark as scanning
      setDomainStates((prev) =>
        prev.map((s) => s.domain === domain ? { ...s, status: 'scanning' } : s)
      );

      try {
        const report = await scanDomain(domain);
        setDomainStates((prev) =>
          prev.map((s) => s.domain === domain ? { ...s, status: 'done', report } : s)
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setDomainStates((prev) =>
          prev.map((s) => s.domain === domain ? { ...s, status: 'error', error: msg } : s)
        );
      }
    }

    setIsRunning(false);
    setHasRun(true);
  };

  const reset = () => {
    setDomainStates([]);
    setHasRun(false);
    setGlobalError('');
  };

  const isScanning = isRunning;
  const doneCount  = domainStates.filter((s) => s.status === 'done').length;
  const totalCount = domainStates.length;

  return (
    <div className="min-h-screen bg-omni-mesh">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

        {/* Page Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(5,173,152,0.25)] bg-[rgba(5,173,152,0.08)] text-[#05AD98] text-xs font-semibold">
            <GitCompare className="w-3.5 h-3.5" />
            Competitive GEO Intelligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Domain <span className="text-gradient">Benchmark Arena</span>
          </h1>
          <p className="text-sm text-[#878787] leading-relaxed">
            Compare 2–5 domains head-to-head across every GEO citation authority dimension.
            Each domain is live-crawled via Jina Reader for real scores.
          </p>
        </div>

        {/* Controls Panel */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[rgba(187,191,191,0.10)] space-y-5">

          {/* Preset Packs */}
          <div>
            <p className="text-xs text-[#878787] font-semibold uppercase tracking-wider mb-2.5">Quick Compare Packs</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PACKS.map((pack) => (
                <button
                  key={pack.label}
                  onClick={() => loadPreset(pack)}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.12)] text-xs text-[#BBBFBF] hover:border-[rgba(5,173,152,0.40)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pack.label}
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </div>
          </div>

          {/* Domain Pills */}
          <div>
            <p className="text-xs text-[#878787] font-semibold uppercase tracking-wider mb-2.5">
              Domains to Compare ({domains.length}/5)
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {domains.map((d) => (
                <span key={d} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111514] border border-[rgba(187,191,191,0.12)] text-xs text-white font-mono">
                  {d}
                  {!isScanning && (
                    <button onClick={() => removeDomain(d)} className="text-[#878787] hover:text-rose-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {domains.length < 5 && !isScanning && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add domain (e.g. notion.so)"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                  className="flex-1 bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-[#878787]/50 focus:outline-none focus:border-[rgba(5,173,152,0.50)] transition-colors"
                />
                <button
                  onClick={addDomain}
                  className="px-4 py-2 rounded-xl bg-[#1A2020] border border-[rgba(187,191,191,0.12)] text-[#BBBFBF] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            )}
          </div>

          {globalError && <p className="text-rose-400 text-xs">{globalError}</p>}

          {/* Run / Reset Button */}
          {!hasRun ? (
            <button
              onClick={runBenchmark}
              disabled={isScanning || domains.length < 2}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #05AD98, #038a79)', boxShadow: '0 2px 16px rgba(5,173,152,0.20)' }}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scanning {doneCount}/{totalCount} domains via Jina Reader...
                </>
              ) : (
                <>
                  <GitCompare className="w-3.5 h-3.5" />
                  Run GEO Benchmark ({domains.length} domains)
                </>
              )}
            </button>
          ) : (
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-[#878787] border border-[rgba(187,191,191,0.10)] hover:text-white hover:border-[rgba(187,191,191,0.25)] transition-colors"
            >
              Reset &amp; Run Again
            </button>
          )}
        </div>

        {/* Live Per-Domain Progress Feed */}
        {domainStates.length > 0 && (
          <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[rgba(187,191,191,0.10)] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Scan Progress</span>
              {isScanning && (
                <span className="text-[10px] text-[#878787]">
                  {doneCount} of {totalCount} complete
                </span>
              )}
            </div>
            <div className="divide-y divide-[rgba(187,191,191,0.06)]">
              {domainStates.map((s) => (
                <div key={s.domain} className="flex items-center gap-3 px-5 py-3 text-xs">
                  {/* Status icon */}
                  <div className="w-5 flex justify-center flex-shrink-0">
                    {STATUS_ICON[s.status]}
                  </div>

                  {/* Domain name */}
                  <span className={`font-mono font-semibold flex-1 ${s.status === 'error' ? 'text-rose-400' : 'text-white'}`}>
                    {s.domain}
                  </span>

                  {/* GEO score (once done) */}
                  {s.status === 'done' && s.report && (
                    <span className="font-black font-mono text-sm text-[#05AD98]">
                      {s.report.overallGeoScore}
                      <span className="text-[10px] text-[#878787] font-sans">/100</span>
                    </span>
                  )}

                  {/* Status label */}
                  <span className={`text-[10px] font-semibold w-36 text-right ${
                    s.status === 'scanning' ? 'text-[#05AD98]' :
                    s.status === 'error'    ? 'text-rose-400' :
                    s.status === 'done'     ? 'text-[#BBBFBF]' :
                    'text-[#878787]'
                  }`}>
                    {s.status === 'error' ? s.error ?? STATUS_LABEL[s.status] : STATUS_LABEL[s.status]}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {isScanning && (
              <div className="h-0.5 bg-[#111514]">
                <div
                  className="h-full bg-[#05AD98] transition-all duration-500"
                  style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Results — stream in as reports arrive */}
        {completedReports.length >= 2 && (
          <div>
            {isScanning && (
              <p className="text-xs text-[#878787] mb-4 text-center">
                Showing results for {completedReports.length} completed domains. More will appear as scans finish.
              </p>
            )}
            <BenchmarkMatrix reports={completedReports} />
          </div>
        )}

        {completedReports.length === 1 && isScanning && (
          <div className="glass-card rounded-2xl p-8 text-center border border-dashed border-[rgba(187,191,191,0.12)] space-y-2">
            <Loader2 className="w-6 h-6 text-[#05AD98] animate-spin mx-auto" />
            <p className="text-sm text-[#878787]">Waiting for at least 2 domains to complete before showing comparison...</p>
          </div>
        )}

        {/* Empty state */}
        {!isScanning && !hasRun && domainStates.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-[rgba(187,191,191,0.12)] space-y-3">
            <Scale className="w-8 h-8 text-[#878787]/40 mx-auto" />
            <p className="text-sm text-[#878787]">
              Select a quick compare pack or add your domains above, then click{' '}
              <strong className="text-[#BBBFBF]">Run GEO Benchmark</strong>.
            </p>
            <Link href="/audit" className="inline-flex items-center gap-1.5 text-xs text-[#05AD98] font-semibold hover:underline">
              <Search className="w-3.5 h-3.5" /> Or run a single domain audit
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
