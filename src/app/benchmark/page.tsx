'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GeoAuditReport } from '../../lib/types';
import {
  Scale,
  Plus,
  X,
  Search,
  Loader2,
  GitCompare,
  ChevronRight,
  Sparkles,
  Zap,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import EmailGateModal from '../../components/EmailGateModal';
import UpgradeModal from '../../components/UpgradeModal';
import { UserTier, normalizeTier } from '../../lib/tierLimits';

const BenchmarkMatrix = dynamic(() => import('../../components/BenchmarkMatrix'), {
  ssr: false,
  loading: () => (
    <div className="glass-panel rounded-2xl p-8 border border-[rgba(187,191,191,0.10)] flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3 text-[#878787]">
        <Loader2 className="w-6 h-6 animate-spin text-[#05AD98]" />
        <span className="text-xs font-mono">Loading competitor comparison battlecard...</span>
      </div>
    </div>
  ),
});

const PRESET_PACKS = [
  { label: 'Fintech Giants', domains: ['stripe.com', 'brex.com', 'mercury.com'] },
  { label: 'SaaS Tools', domains: ['linear.app', 'notion.so', 'vercel.com'] },
  { label: 'Developer Infrastructure', domains: ['supabase.com', 'vercel.com', 'cloudflare.com'] },
  { label: 'E-Commerce Platforms', domains: ['shopify.com', 'bigcommerce.com', 'woocommerce.com'] },
  { label: 'AI Foundation Leaders', domains: ['openai.com', 'anthropic.com', 'mistral.ai'] },
];

interface CompetitorCandidate {
  domain: string;
  category: string;
  latestGeoScore: number;
}

function BenchmarkContent() {
  const searchParams = useSearchParams();

  // Read initial domains from URL query (e.g. ?domains=stripe.com,brex.com)
  const initialFromQuery = searchParams.get('domains');
  const defaultInitial = initialFromQuery
    ? initialFromQuery.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean).slice(0, 5)
    : ['stripe.com', 'brex.com'];

  const [domains, setDomains] = useState<string[]>(defaultInitial.length >= 2 ? defaultInitial : ['stripe.com', 'brex.com']);
  const [inputVal, setInputVal] = useState('');
  const [completedReports, setCompletedReports] = useState<GeoAuditReport[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [emailGateOpen, setEmailGateOpen] = useState(false);
  const [rescanningDomain, setRescanningDomain] = useState<string | null>(null);

  // User Tier & Upgrade Modal State
  const [userTier, setUserTier] = useState<UserTier>('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<{
    title: string;
    message: string;
    targetTier: 'pro' | 'agency' | 'enterprise';
    featureName: string;
  }>({
    title: 'Unlock 5-Way Competitor Arena',
    message: 'Free tier includes head-to-head comparison for 2 domains. Upgrade to Pro to benchmark up to 5 competitors simultaneously.',
    targetTier: 'pro',
    featureName: 'Competitor Benchmark Arena',
  });
  const [tierNotice, setTierNotice] = useState<string | null>(null);

  // Smart competitor auto-suggestions
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<CompetitorCandidate[]>([]);
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);

  // Fetch session to determine tier
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.tier) {
          setUserTier(normalizeTier(data.user.tier));
        }
      })
      .catch(() => {});
  }, []);

  const syncUrlParams = useCallback((activeDomains: string[]) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('domains', activeDomains.join(','));
    window.history.replaceState({}, '', url.toString());
  }, []);

  const runBenchmark = useCallback(async (domainsToRun?: string[], bypassCache = false) => {
    let targetDomains = domainsToRun || domains;
    if (userTier === 'free' && targetDomains.length > 2) {
      targetDomains = targetDomains.slice(0, 2);
    }
    if (targetDomains.length < 2) {
      setGlobalError('Add at least 2 domains to compare.');
      return;
    }
    setGlobalError('');
    setIsRunning(true);
    setHasRun(false);

    try {
      const res = await fetch('/api/v1/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: targetDomains, bypassCache: userTier === 'free' ? false : bypassCache }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EMAIL_REQUIRED') {
          setEmailGateOpen(true);
          return;
        }
        if (data.code === 'TIER_LIMIT_EXCEEDED') {
          setUpgradeReason({
            title: 'Competitor Benchmark Limit Reached',
            message: data.error || 'Free accounts can benchmark 2 competitors. Upgrade to Pro to benchmark up to 5 competitors.',
            targetTier: 'pro',
            featureName: 'Competitor Benchmark Arena',
          });
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(data.error || 'Benchmark execution failed');
      }

      if (data.success && Array.isArray(data.reports)) {
        setCompletedReports(data.reports);
        setHasRun(true);
        syncUrlParams(targetDomains);
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Error executing benchmark');
    } finally {
      setIsRunning(false);
    }
  }, [domains, userTier, syncUrlParams]);

  // Automatically execute on load if query parameters provided
  useEffect(() => {
    if (initialFromQuery && initialFromQuery.split(',').length >= 2) {
      const qDomains = initialFromQuery.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean).slice(0, 5);
      runBenchmark(qDomains);
    }
  }, [initialFromQuery, runBenchmark]);

  // Fetch smart competitor recommendations based on the primary domain
  useEffect(() => {
    if (domains.length === 0) return;
    const primaryDomain = domains[0];

    let isMounted = true;
    fetch(`/api/v1/benchmark?competitorsFor=${encodeURIComponent(primaryDomain)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isMounted || !data?.success) return;
        setDetectedCategory(data.category || null);
        if (Array.isArray(data.competitors)) {
          setSuggestedCompetitors(data.competitors);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [domains]);

  const addDomain = (candidate?: string) => {
    const raw = candidate || inputVal;
    const clean = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean) return;

    if (domains.includes(clean)) return;

    if (userTier === 'free' && domains.length >= 2) {
      setUpgradeReason({
        title: 'Unlock 5-Way Competitor Arena',
        message: 'Free tier allows comparing 2 domains head-to-head. Upgrade to Pro to track and benchmark up to 5 competitors simultaneously.',
        targetTier: 'pro',
        featureName: 'Multi-Competitor Comparison',
      });
      setShowUpgradeModal(true);
      return;
    }

    if (domains.length < 5) {
      const next = [...domains, clean];
      setDomains(next);
      setInputVal('');
      syncUrlParams(next);
    }
  };

  const removeDomain = (d: string) => {
    if (isRunning) return;
    const next = domains.filter((x) => x !== d);
    setDomains(next);
    syncUrlParams(next);
  };

  const loadPreset = (pack: { label: string; domains: string[] }) => {
    if (isRunning) return;
    let selectedDomains = pack.domains;
    if (userTier === 'free' && pack.domains.length > 2) {
      selectedDomains = pack.domains.slice(0, 2);
      setTierNotice(`Loaded top 2 competitors for ${pack.label}. Upgrade to Pro to benchmark all ${pack.domains.length} simultaneously.`);
    } else {
      setTierNotice(null);
    }
    setDomains(selectedDomains);
    setCompletedReports([]);
    setHasRun(false);
    setGlobalError('');
    syncUrlParams(selectedDomains);
    runBenchmark(selectedDomains);
  };

  const handleRescanDomain = async (targetDomain: string) => {
    if (userTier === 'free') {
      setUpgradeReason({
        title: 'Unlock Live Engine Re-Scans',
        message: 'Free tier uses high-speed cached benchmark scores. Upgrade to Pro for live multi-engine re-crawling.',
        targetTier: 'pro',
        featureName: 'Live Competitor Re-Scan',
      });
      setShowUpgradeModal(true);
      return;
    }

    setRescanningDomain(targetDomain);
    try {
      const res = await fetch('/api/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetDomain, bypassCache: true }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCompletedReports((prev) =>
          prev.map((r) => (r.domain === targetDomain ? data.data : r))
        );
      }
    } catch (err) {
      console.error('Failed to rescan domain:', err);
    } finally {
      setRescanningDomain(null);
    }
  };

  const reset = () => {
    setCompletedReports([]);
    setHasRun(false);
    setGlobalError('');
  };

  return (
    <div className="min-h-screen bg-omni-mesh">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(5,173,152,0.25)] bg-[rgba(5,173,152,0.08)] text-[#05AD98] text-xs font-semibold">
            <GitCompare className="w-3.5 h-3.5" />
            Competitive GEO Intelligence Arena
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Competitor <span className="text-[#05AD98]">Benchmark Arena</span>
          </h1>
          <p className="text-sm text-[#878787] leading-relaxed">
            Head-to-head AI citation analysis for 2 to 5 direct market rivals.
            Evaluate win/loss standing across Perplexity, ChatGPT Search, Claude, and Gemini Grounding with automated gap intelligence.
          </p>
        </div>

        {/* Controls Panel */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[rgba(187,191,191,0.10)] space-y-5">
          {/* Preset Packs */}
          <div>
            <p className="text-xs text-[#878787] font-semibold uppercase tracking-wider mb-2.5">
              Curated Market Rivalry Packs
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PACKS.map((pack) => (
                <button
                  key={pack.label}
                  onClick={() => loadPreset(pack)}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.12)] text-xs text-[#BBBFBF] hover:border-[rgba(5,173,152,0.40)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pack.label}
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </div>
          </div>

          {/* Domain Pills & Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#878787] font-semibold uppercase tracking-wider">
                Domains in Arena ({domains.length}/{userTier === 'free' ? '2 (Free)' : '5'})
              </p>
              <span className="text-[11px] text-[#878787] font-mono">
                Indexed in 966+ domain database
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {domains.map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111514] border border-[rgba(187,191,191,0.12)] text-xs text-white font-mono"
                >
                  {d}
                  {!isRunning && domains.length > 2 && (
                    <button
                      onClick={() => removeDomain(d)}
                      className="text-[#878787] hover:text-rose-400 transition-colors"
                      title={`Remove ${d}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {userTier === 'free' && domains.length >= 2 ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111514] border border-[#222A28]">
                <div className="flex items-center gap-2 text-xs text-[#BBBFBF]">
                  <Lock className="w-3.5 h-3.5 text-[#B8A04A]" />
                  <span>Free tier allows 2 domains (1-on-1 comparison).</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeReason({
                      title: 'Unlock 5-Way Competitor Benchmark',
                      message: 'Upgrade to Pro to benchmark up to 5 competitors simultaneously with live engine re-scans.',
                      targetTier: 'pro',
                      featureName: '5-Way Competitor Arena',
                    });
                    setShowUpgradeModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222A28] border border-[#B8A04A] text-xs text-[#B8A04A] hover:bg-[#2A3432] transition-colors font-medium"
                >
                  <Sparkles className="w-3 h-3 text-[#B8A04A]" />
                  + Add up to 5 competitors (Pro)
                </button>
              </div>
            ) : domains.length < 5 && !isRunning ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add competitor domain (e.g. notion.so, brex.com)"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                  className="flex-1 bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-[#878787]/50 focus:outline-none focus:border-[rgba(5,173,152,0.50)] transition-colors"
                />
                <button
                  onClick={() => addDomain()}
                  className="px-4 py-2 rounded-xl bg-[#1A2020] border border-[rgba(187,191,191,0.12)] text-[#BBBFBF] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            ) : null}

            {tierNotice && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#111514] border border-[#222A28] text-xs">
                <span className="text-[#BBBFBF]">{tierNotice}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeReason({
                      title: 'Compare All Curated Rivals',
                      message: 'Upgrade to Pro to benchmark all competitors in this rivalry pack at once.',
                      targetTier: 'pro',
                      featureName: 'Curated Rivalry Packs',
                    });
                    setShowUpgradeModal(true);
                  }}
                  className="text-[#05AD98] hover:underline font-semibold text-xs whitespace-nowrap"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}

            {/* Smart Competitor Auto-Suggestions */}
            {suggestedCompetitors.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-[#878787] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#B8A04A]" />
                  Suggested {detectedCategory ? `${detectedCategory} ` : ''}Rivals:
                </span>
                {suggestedCompetitors.map((rival) => {
                  const isAdded = domains.includes(rival.domain);
                  const isFreeCapped = userTier === 'free' && domains.length >= 2;
                  return (
                    <button
                      key={rival.domain}
                      disabled={isAdded || isRunning}
                      onClick={() => addDomain(rival.domain)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all ${
                        isAdded
                          ? 'bg-[#111514] text-[#878787] border-[#222A28] opacity-50 cursor-not-allowed'
                          : isFreeCapped
                          ? 'bg-[#111514] text-[#BBBFBF] border-[#222A28] hover:border-[#B8A04A] hover:text-[#B8A04A]'
                          : 'bg-[#111514] text-[#BBBFBF] border-[#222A28] hover:border-[#05AD98] hover:text-white active:scale-95'
                      }`}
                    >
                      <span>+ {rival.domain}</span>
                      {isFreeCapped ? (
                        <span className="text-[10px] text-[#B8A04A] font-semibold">(Pro)</span>
                      ) : (
                        <span className="text-[10px] text-[#05AD98] font-bold">({rival.latestGeoScore})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {globalError && <p className="text-rose-400 text-xs font-mono">{globalError}</p>}

          {/* Run / Reset Button */}
          {!hasRun ? (
            <button
              onClick={() => runBenchmark()}
              disabled={isRunning || domains.length < 2}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] bg-[#05AD98] hover:bg-[#038a79] shadow-lg shadow-[rgba(5,173,152,0.20)]"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Competitor Intelligence Battlecard...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-300" />
                  Run Head-to-Head Benchmark ({domains.length} domains)
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (userTier === 'free') {
                    setUpgradeReason({
                      title: 'Unlock Live Multi-Engine Re-Scans',
                      message: 'Live engine re-scans query active AI engines directly. Upgrade to Pro for live refresh across all competitors.',
                      targetTier: 'pro',
                      featureName: 'Live Benchmark Re-Scan',
                    });
                    setShowUpgradeModal(true);
                    return;
                  }
                  runBenchmark(domains, true);
                }}
                disabled={isRunning}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#111514] hover:bg-[#1A2220] border border-[#05AD98] text-[#05AD98] transition-colors flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-[#05AD98]" />
                Live Refresh All ({domains.length} domains){userTier === 'free' ? ' (Pro)' : ''}
              </button>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#878787] border border-[rgba(187,191,191,0.10)] hover:text-white hover:border-[rgba(187,191,191,0.25)] transition-colors"
              >
                Reset Arena
              </button>
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {isRunning && (
          <div className="glass-panel rounded-2xl p-8 border border-[rgba(187,191,191,0.10)] flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#05AD98]" />
            <p className="text-xs font-mono text-white">Synthesizing multi-model authority matrix across {domains.join(', ')}...</p>
            <p className="text-[11px] text-[#878787]">Comparing citation win rates, protocol parity, and vector readiness.</p>
          </div>
        )}

        {/* Completed Battlecard Matrix */}
        {!isRunning && hasRun && completedReports.length >= 2 && (
          <div>
            <BenchmarkMatrix
              reports={completedReports}
              onRescanDomain={handleRescanDomain}
              rescanningDomain={rescanningDomain}
              userTier={userTier}
              onTriggerUpgrade={(reason) => {
                setUpgradeReason({
                  title: reason || 'Upgrade to Pro',
                  message: 'Unlock full technical playbooks, 5-way competitor comparisons, and PDF battlecards with Pro.',
                  targetTier: 'pro',
                  featureName: reason || 'Competitor Intelligence',
                });
                setShowUpgradeModal(true);
              }}
            />
          </div>
        )}

        {/* Empty State */}
        {!isRunning && !hasRun && (
          <div className="glass-panel rounded-2xl p-10 text-center border border-dashed border-[rgba(187,191,191,0.12)] space-y-3">
            <Scale className="w-8 h-8 text-[#878787]/40 mx-auto" />
            <p className="text-sm text-[#878787]">
              Select a curated rivalry pack or add your competitors above, then click{' '}
              <strong className="text-[#BBBFBF]">Run Head-to-Head Benchmark</strong>.
            </p>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 text-xs text-[#05AD98] font-semibold hover:underline"
            >
              <Search className="w-3.5 h-3.5" /> Or run a single domain audit
            </Link>
          </div>
        )}

        <EmailGateModal
          open={emailGateOpen}
          onClose={() => setEmailGateOpen(false)}
          onVerified={() => {
            setEmailGateOpen(false);
            runBenchmark();
          }}
          title="Unlock Benchmark Arena"
          subtitle="Multi-domain competitor comparisons require email verification. Verify your email to unlock 10 free monthly scans and side-by-side matrices."
        />

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title={upgradeReason.title}
          message={upgradeReason.message}
          targetTier={upgradeReason.targetTier}
          featureName={upgradeReason.featureName}
        />
      </div>
    </div>
  );
}

export default function BenchmarkPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-[#878787] text-xs font-mono">
          Loading Competitive GEO Intelligence Arena...
        </div>
      }
    >
      <BenchmarkContent />
    </Suspense>
  );
}
