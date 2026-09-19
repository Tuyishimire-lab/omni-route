'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GeoAuditReport, Recommendation, EngineScore } from '../lib/types';
import { buildCalibratedEngineBreakdown } from '../lib/scoreCalculator';
import { cleanSnippetText } from '../lib/citationProber';
import { saveWatchedDomain, getWatchedDomains } from '../lib/storage';
import UpgradeModal from './UpgradeModal';
import ScanTerminalStream from './ScanTerminalStream';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Shield,
  Layers,
  Cpu,
  ArrowUpRight,
  ExternalLink,
  Code2,
  Printer,
  Bookmark,
  Globe,
  FileCode,
  CheckCheck,
  Share2,
  Key,
  Zap,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Building2,
  Sparkles,
  Bot,
  RefreshCw,
  FolderGit2,
  Terminal,
  Search,
  Send,
} from 'lucide-react';
import Sparkline from './Sparkline';

export interface PatchDeploymentGuide {
  targetFile: string;
  locationType: string;
  frameworkNote: string;
  steps: string[];
}

export function getPatchDeploymentGuide(rec: Recommendation, domain: string): PatchDeploymentGuide {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const title = (rec.title || '').toLowerCase();
  const category = (rec.category || '').toLowerCase();
  const snippet = (rec.codeSnippet || '').toLowerCase();

  if (category.includes('agent') || title.includes('agent.json') || snippet.includes('agent.json')) {
    return {
      targetFile: 'public/.well-known/agent.json',
      locationType: 'Static Public Assets / Well-Known Protocol Route',
      frameworkNote: 'Next.js App/Pages Router, Vite, Nuxt, Astro, or root static hosting',
      steps: [
        `Create directory .well-known in your project's public folder: public/.well-known/agent.json`,
        `Paste this JSON manifest and verify it resolves at https://${cleanDomain}/.well-known/agent.json`,
        `Ensure your server or CDN serves this file with Content-Type: application/json and Access-Control-Allow-Origin: * so autonomous agents (OpenAI Operator, Perplexity, Claude) discover it without CORS errors.`,
      ],
    };
  }

  if (category.includes('schema') || title.includes('schema') || title.includes('sameas') || snippet.includes('schema.org') || snippet.includes('organization')) {
    return {
      targetFile: 'app/layout.tsx (or pages/_document.tsx / index.html)',
      locationType: 'Document <head> Template (Server-Rendered HTML)',
      frameworkNote: 'Next.js App Router (app/layout.tsx), Pages Router (_document.tsx), Vite (index.html), or CMS Head injection',
      steps: [
        `Open your root document template (e.g. app/layout.tsx in Next.js or index.html in Vite/SPA).`,
        `Embed this JSON-LD schema inside the <head> element wrapped in a <script type="application/ld+json"> tag.`,
        `Confirm that the schema is present in the initial server-rendered HTML (via curl -s https://${cleanDomain} | grep schema.org) so AI crawlers parse it without running client JavaScript.`,
      ],
    };
  }

  if (category.includes('information gain') || title.includes('table') || title.includes('statistic') || snippet.includes('dataset')) {
    return {
      targetFile: 'app/page.tsx (or content/*.mdx / key landing templates)',
      locationType: 'Primary Content Container (<main> or <article>)',
      frameworkNote: 'Next.js pages, MDX content, WordPress templates, or Astro components',
      steps: [
        `Identify key high-traffic templates or landing pages on ${cleanDomain}.`,
        `Embed structured empirical tables or this Dataset schema in the core content zone above the fold.`,
        `Ensure numeric benchmarks use explicit empirical units (%, ms, $, ratios) so generative engines extract your statistics as primary citations.`,
      ],
    };
  }

  if (category.includes('vector') || title.includes('semantic') || snippet.includes('<article') || snippet.includes('<section')) {
    return {
      targetFile: 'components/ProductOverview.tsx (or pages/index.tsx)',
      locationType: 'Semantic HTML5 Markup (<article>, <section>, <aside>)',
      frameworkNote: 'React / Next.js components, Vue/Svelte templates, or static HTML',
      steps: [
        `Replace generic nested <div> wrappers with semantic HTML5 tags (<article>, <section>, <aside>).`,
        `Assign unique id and aria-labelledby attributes to each semantic section.`,
        `This creates unambiguous semantic chunk boundaries for LLM RAG pipelines (Perplexity, ChatGPT, Claude) during passage vector retrieval.`,
      ],
    };
  }

  if (title.includes('robots.txt') || snippet.includes('user-agent:')) {
    return {
      targetFile: 'public/robots.txt (or app/robots.ts)',
      locationType: 'Crawl Control Root Configuration',
      frameworkNote: 'Root public folder or Next.js Metadata Route',
      steps: [
        `Save to public/robots.txt so it resolves at https://${cleanDomain}/robots.txt.`,
        `Ensure crawl access is granted to verified AI agent user-agents (GPTBot, PerplexityBot, ClaudeBot, Google-Extended).`,
        `Explicitly declare your sitemap reference: Sitemap: https://${cleanDomain}/sitemap.xml.`,
      ],
    };
  }

  return {
    targetFile: 'app/layout.tsx (or public/ project root)',
    locationType: 'Site Root Configuration / HTML Metadata',
    frameworkNote: 'Next.js, Vite, Nuxt, or Web Server configuration',
    steps: [
      `Review your project root or main layout template.`,
      `Apply this protocol patch according to your framework's recommended static asset or metadata configuration.`,
      `Rescan ${cleanDomain} on CiteRoute to verify immediate GEO index elevation.`,
    ],
  };
}

// ── Connect Engines Callout ────────────────────────────────────────────────
// Shown below the engine breakdown cards when no live API data is available.
// Explains that the engine works independently and optionally supports API keys.
function ConnectEnginesCallout({ domain }: { domain: string }) {
  const [dismissed, setDismissed] = React.useState(() => {
    try { return localStorage.getItem('citeroute_engines_callout_dismissed') === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem('citeroute_engines_callout_dismissed', '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div className="mt-4 rounded-2xl border border-[rgba(5,173,152,0.20)] bg-[rgba(5,173,152,0.04)] p-4 flex items-start gap-3 print:hidden">
      <div className="w-8 h-8 rounded-xl bg-[rgba(5,173,152,0.12)] flex items-center justify-center shrink-0">
        <Key className="w-4 h-4 text-[#05AD98]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-[#05AD98]" />
          CiteRoute&apos;s engine is running independently
        </p>
        <p className="text-[11px] text-[#878787] leading-relaxed">
          The scores above are derived from CiteRoute&apos;s own structural analysis of{' '}
          <span className="text-[#BBBFBF] font-mono">{domain}</span> - live crawl signals,
          schema density, entity clarity, and semantic structure. No external API keys are required.
          <br />
          <span className="text-[#BBBFBF]">
            Optionally, connect your Perplexity, OpenAI, Anthropic, or Gemini API keys to layer
            real per-engine citation data directly on top of these scores.
          </span>
        </p>
        <a
          href="/dashboard/engine-settings"
          className="inline-flex items-center gap-1 mt-2 text-[11px] text-[#05AD98] hover:underline font-semibold"
        >
          Connect engine API keys <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-[#878787] hover:text-white transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Score History Panel ─────────────────────────────────────────────────────
// Fetches real ScanEvent history from the DB and renders a trend sparkline.
function ScoreHistoryPanel({ domain, isWhiteLabel }: { domain: string; isWhiteLabel?: boolean }) {
  const [history, setHistory] = useState<{ date: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    fetch(`/api/v1/leaderboard/history?domains=${encodeURIComponent(cleanDomain)}&days=14`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.history?.[cleanDomain]) {
          setHistory(data.history[cleanDomain]);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [domain]);

  if (loading) return null;

  const hasHistory = history.length >= 2;
  const delta = hasHistory ? history[history.length - 1].score - history[0].score : 0;
  const firstDate = hasHistory ? history[0].date : null;
  const lastDate = hasHistory ? history[history.length - 1].date : null;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] print-break-avoid">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#05AD98]" />
          Score History
        </h3>
        {hasHistory && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#878787] font-mono">
              {firstDate} → {lastDate}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              delta > 0
                ? 'bg-[rgba(5,173,152,0.10)] text-[#05AD98] border-[rgba(5,173,152,0.25)]'
                : delta < 0
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                : 'bg-slate-500/10 text-[#878787] border-slate-500/20'
            }`}>
              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {delta > 0 ? `+${delta}` : delta === 0 ? '±0' : delta} pts
            </span>
          </div>
        )}
      </div>

      {hasHistory ? (
        <div className="w-full">
          <Sparkline
            data={history}
            width={600}
            height={64}
            showDots={true}
          />
          <p className="text-[10px] text-[#878787] mt-2">
            {isWhiteLabel
              ? `${history.length} data points over 14 days, updated by automated rescan pipeline.`
              : `${history.length} data points over 14 days, updated by CiteRoute's automated rescan pipeline.`}
          </p>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-[#878787]">
            First scan. Trend data will appear after the next rescan cycle.
          </p>
          <p className="text-[10px] text-[#878787] mt-1">
            {isWhiteLabel
              ? 'Domains are rescanned every 7 days automatically.'
              : 'CiteRoute rescans domains every 7 days automatically.'}
          </p>
        </div>
      )}
    </div>
  );
}

interface AuditResultViewProps {
  report: GeoAuditReport;
  isVerified?: boolean;
  onRequireEmail?: () => void;
}

export default function AuditResultView({ report: initialReport, isVerified, onRequireEmail }: AuditResultViewProps) {
  const [report, setReport] = useState<GeoAuditReport>(initialReport);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<number>(0);

  useEffect(() => {
    setReport(initialReport);
  }, [initialReport]);

  const handleEnhanceWithAi = async () => {
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const res = await fetch('/api/v1/audit/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setReport(data.data);
      } else {
        setEnhanceError(data.error || 'Failed to enhance report with AI');
      }
    } catch (err: unknown) {
      setEnhanceError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsEnhancing(false);
    }
  };

  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [isSavedToWatchlist, setIsSavedToWatchlist] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // White-label detection for Agency & Enterprise tiers
  const [user, setUser] = useState<{ tier?: string; role?: string; name?: string } | null>(null);
  const [customAgencyName, setCustomAgencyName] = useState('');
  const [showAgencyCustomizer, setShowAgencyCustomizer] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          const savedAgency = typeof window !== 'undefined' ? localStorage.getItem('citeroute_agency_brand_name') : null;
          if (savedAgency) {
            setCustomAgencyName(savedAgency);
          } else if (data.user.name && (data.user.tier === 'agency' || data.user.tier === 'enterprise' || data.user.role === 'admin')) {
            setCustomAgencyName(data.user.name);
          }
        }
      })
      .catch(() => {});
  }, []);

  const isWhiteLabel = Boolean(user?.role === 'admin' || user?.tier === 'agency' || user?.tier === 'enterprise');

  const handleAgencyNameChange = (val: string) => {
    setCustomAgencyName(val);
    try {
      localStorage.setItem('citeroute_agency_brand_name', val);
    } catch {}
  };

  const cleanDomain = report.domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/audit/${cleanDomain}` : `https://www.citeroute.com/audit/${cleanDomain}`;

  const handleShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleCopyCode = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleSaveWatchlist = () => {
    const current = getWatchedDomains();
    const alreadySaved = current.some((d) => d.domain === report.domain);
    if (!alreadySaved && current.length >= 3) {
      setShowUpgradeModal(true);
      return;
    }
    saveWatchedDomain(report);
    setIsSavedToWatchlist(true);
    setTimeout(() => setIsSavedToWatchlist(false), 2500);
  };

  const handlePrintPdf = () => {
    if (!user && !isVerified) {
      if (onRequireEmail) {
        onRequireEmail();
        return;
      }
    }
    window.print();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#05AD98] border-[rgba(5,173,152,0.25)] bg-[rgba(5,173,152,0.10)]';
    if (score >= 60) return 'text-[#B8A04A] border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getPriorityBadge = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-[rgba(5,173,152,0.15)] text-[#05AD98] border-[rgba(5,173,152,0.3)]';
    }
  };

  const getEffortImpactLabel = (ei?: Recommendation['effortImpact']) => {
    switch (ei) {
      case 'QUICK_WIN':
        return { label: 'Quick Win', cls: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25' };
      case 'STRATEGIC':
        return { label: 'Strategic', cls: 'bg-sky-500/12 text-sky-300 border-sky-500/25' };
      case 'NICE_TO_HAVE':
        return { label: 'Nice-to-have', cls: 'bg-slate-500/12 text-slate-300 border-slate-500/25' };
      default:
        return null;
    }
  };

  const SCORE_TOOLTIPS: Record<string, { what: string; why: string; how: string }> = {
    'zeroClick': {
      what: 'Measures how resilient your content is against zero-click search, where answer engines answer queries directly without linking to your site.',
      why: 'Higher resilience means your content is rich enough that AI engines still cite you as a source, rather than just summarizing you away.',
      how: 'Add unique data tables, proprietary statistics, and expert quotes that AI can\'t summarize without attribution.',
    },
    'infoGain': {
      what: 'Measures the unique informational value your content provides: data, statistics, and insights that aren\'t available elsewhere.',
      why: 'AI engines preferentially cite sources that contribute novel information. Low info gain = easily replaceable by other sources.',
      how: 'Publish original research, add empirical benchmarks, include comparison tables, and quantify claims with real numbers.',
    },
    'entity': {
      what: 'Measures how well AI engines can identify and disambiguate your brand, products, and key entities from similarly-named competitors.',
      why: 'Strong entity grounding means AI engines link searches about your brand to YOUR site, not a competitor with a similar name.',
      how: 'Deploy Organization/Product schema with sameAs links to Wikidata, Crunchbase, and official social profiles.',
    },
    'vector': {
      what: 'Measures how well your content is structured for RAG (Retrieval-Augmented Generation) vector extraction by AI crawlers.',
      why: 'AI engines chunk your content into vector embeddings. Better structure = more accurate retrieval = higher citation probability.',
      how: 'Use semantic HTML (article, section), clear H2 headings, and structured FAQ blocks that map to natural language queries.',
    },
  };

  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null);
  const [customProbeQuery, setCustomProbeQuery] = React.useState('');
  const [isProbing, setIsProbing] = React.useState(false);
  const [probedEngines, setProbedEngines] = React.useState<EngineScore[] | null>(null);
  const [probeError, setProbeError] = React.useState<string | null>(null);

  // Reset probed engines and custom query whenever the target domain changes
  React.useEffect(() => {
    setProbedEngines(null);
    setCustomProbeQuery('');
    setProbeError(null);
    setIsProbing(false);
  }, [cleanDomain]);

  const displayedEngines = report.engineBreakdown && report.engineBreakdown.length > 0
    ? report.engineBreakdown
    : buildCalibratedEngineBreakdown({
        overallGeoScore: report.overallGeoScore,
        zeroClickResilience: report.zeroClickResilience,
        informationGainScore: report.informationGainScore,
        entityDisambiguationScore: report.entityDisambiguationScore,
        vectorReadinessScore: report.vectorReadinessScore,
        domain: report.domain,
      });

  const activeEngines = probedEngines || displayedEngines;

  const handleRunProbe = async (overrideQuery?: string) => {
    const queryToRun = (overrideQuery ?? customProbeQuery).trim();
    setIsProbing(true);
    setProbeError(null);

    try {
      const res = await fetch('/api/v1/engine-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: cleanDomain,
          query: queryToRun || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute citation probe');
      }

      if (Array.isArray(data.engines) && data.engines.length > 0) {
        setProbedEngines(data.engines);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Probe execution failed';
      setProbeError(msg);
    } finally {
      setIsProbing(false);
    }
  };

  const filteredRecommendations =
    activeCategoryFilter === 'ALL'
      ? report.recommendations
      : report.recommendations.filter((r) => r.category === activeCategoryFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:space-y-4">
      {/* Executive Report Header - Visible only in Print/PDF */}
      <div className="hidden print:flex flex-col border-b border-[rgba(5,173,152,0.35)] pb-4 mb-2 print-break-avoid">
        {isWhiteLabel ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(184,160,74,0.15)] border border-[rgba(184,160,74,0.35)] flex items-center justify-center font-bold text-[#B8A04A] tracking-wider">
                <span className="font-mono text-xs font-extrabold uppercase">
                  {customAgencyName ? customAgencyName.slice(0, 2).toUpperCase() : 'GEO'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-wider uppercase">
                    {customAgencyName || 'Executive GEO & Citation Visibility Audit'}
                  </span>
                  {customAgencyName && (
                    <>
                      <span className="text-slate-600 text-xs">/</span>
                      <span className="text-xs font-semibold text-[#BBBFBF]">Client Intelligence Deliverable</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-[#878787]">
                  Generative Engine Optimization (GEO) &amp; Autonomous Agent Discovery Assessment
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-bold text-[#B8A04A]">{cleanDomain}</div>
              <div className="text-[10px] text-[#878787]">
                Prepared: {new Date(report.analyzedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(5,173,152,0.15)] border border-[rgba(5,173,152,0.35)] flex items-center justify-center font-bold text-white tracking-wider">
                <span className="text-[#05AD98] font-mono text-sm font-extrabold">CR</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-wider">CITE<span className="text-[#05AD98]">ROUTE</span></span>
                  <span className="text-slate-600 text-xs">/</span>
                  <span className="text-xs font-semibold text-[#BBBFBF]">Executive GEO &amp; Citation Visibility Audit</span>
                </div>
                <p className="text-[10px] text-[#878787]">
                  Generative Engine Optimization Inspection &amp; Autonomous Agent Citation Report
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-bold text-[#05AD98]">{cleanDomain}</div>
              <div className="text-[10px] text-[#878787]">
                Audited: {new Date(report.analyzedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        )}

        {/* Executive Metadata Sub-bar in Print */}
        <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t border-[rgba(187,191,191,0.12)] text-[10px]">
          <div>
            <span className="text-[#878787] block text-[9px] uppercase tracking-wider font-semibold">Target Domain</span>
            <span className="font-mono font-bold text-white text-xs">{cleanDomain}</span>
          </div>
          <div>
            <span className="text-[#878787] block text-[9px] uppercase tracking-wider font-semibold">Overall GEO Score</span>
            <span className="font-mono font-bold text-[#05AD98] text-xs">{report.overallGeoScore}/100</span>
          </div>
          <div>
            <span className="text-[#878787] block text-[9px] uppercase tracking-wider font-semibold">Citation Status</span>
            <span className="font-bold text-white text-xs">
              {report.overallGeoScore >= 80 ? 'High Citation Visibility' : report.overallGeoScore >= 60 ? 'Moderate Visibility' : 'Zero-Click Risk'}
            </span>
          </div>
          <div>
            <span className="text-[#878787] block text-[9px] uppercase tracking-wider font-semibold">Verification</span>
            <span className="font-bold text-[#05AD98] text-xs">Live Edge Crawler Ingested</span>
          </div>
        </div>
      </div>

      {/* Top Action Bar (Print & Save) */}
      <div className="flex items-center justify-between gap-3 pb-1 print:hidden">
        <div className="flex items-center gap-2">
          {report.liveMetadata?.isLiveScanned ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.20)] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Server-Side Crawler Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)] text-xs font-semibold">
              <Info className="w-3.5 h-3.5" />
              Latent Semantic Model Estimation
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareLink}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111514] hover:bg-slate-850 text-slate-200 border border-[rgba(5,173,152,0.3)] hover:border-[#05AD98] text-xs font-semibold transition-all shadow-sm"
          >
            {copiedShareLink ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-[#05AD98]" />
                <span className="text-[#05AD98]">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#05AD98]" />
                <span>Share Public Report</span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveWatchlist}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111514] hover:bg-slate-850 text-slate-200 border border-slate-750 text-xs font-semibold transition-all"
          >
            {isSavedToWatchlist ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-[#05AD98]" />
                <span className="text-[#05AD98]">Saved to Watchlist!</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-[#05AD98]" />
                <span>Save to Watchlist</span>
              </>
            )}
          </button>

          {isWhiteLabel ? (
            <button
              onClick={() => setShowAgencyCustomizer(!showAgencyCustomizer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(184,160,74,0.12)] hover:bg-[rgba(184,160,74,0.20)] border border-[rgba(184,160,74,0.30)] text-xs font-bold text-[#B8A04A] transition-all"
              title="Click to customize Agency Name on PDF export"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>White-Label Active</span>
              {customAgencyName && <span className="text-white text-[10px] font-normal hidden sm:inline">({customAgencyName})</span>}
            </button>
          ) : (
            <Link
              href="/pricing"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111514] hover:bg-slate-850 text-slate-400 hover:text-white border border-[rgba(187,191,191,0.12)] text-xs font-semibold transition-all"
              title="Agency plan includes unbranded, white-label client PDF exports"
            >
              <Building2 className="w-3.5 h-3.5 text-[#B8A04A]" />
              <span>White-Label PDF</span>
            </Link>
          )}

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111514] hover:bg-slate-850 text-slate-200 border border-slate-750 text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#05AD98]" />
            <span>Export Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Agency White-Label Name Customizer Drawer */}
      {showAgencyCustomizer && isWhiteLabel && (
        <div className="p-3.5 rounded-2xl bg-[#0D1211] border border-[rgba(184,160,74,0.25)] flex items-center justify-between flex-wrap gap-3 text-xs print:hidden animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Building2 className="w-4 h-4 text-[#B8A04A] shrink-0" />
            <span className="text-[#BBBFBF] font-semibold whitespace-nowrap">Agency / Firm Name:</span>
            <input
              type="text"
              value={customAgencyName}
              onChange={(e) => handleAgencyNameChange(e.target.value)}
              placeholder="e.g. Acme Digital Growth Agency"
              className="w-full max-w-sm px-3 py-1.5 rounded-xl bg-[#070A0A] border border-[rgba(187,191,191,0.15)] text-white text-xs outline-none focus:border-[#B8A04A]"
            />
          </div>
          <button
            onClick={() => setShowAgencyCustomizer(false)}
            className="px-3 py-1.5 rounded-xl bg-[rgba(184,160,74,0.15)] text-[#B8A04A] hover:bg-[rgba(184,160,74,0.25)] font-bold text-xs"
          >
            Save &amp; Close
          </button>
        </div>
      )}

      {/* Live Scanned DOM Metadata Strip */}
      {report.liveMetadata?.isLiveScanned && (
        <div className="glass-card rounded-2xl p-4 border border-[rgba(5,173,152,0.20)] bg-emerald-950/10 space-y-2 text-xs print-break-avoid">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#05AD98]" />
              Live Ingested Web Data
            </span>
            <span className="text-[#878787] font-mono text-[11px]">HTTP {report.liveMetadata.httpStatus || 200} OK</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-[#BBBFBF]">
            <div>
              <span className="text-[#878787] block">Page Title:</span>
              <span className="font-semibold text-white truncate block">{report.liveMetadata.extractedTitle || 'Extracted'}</span>
            </div>
            <div>
              <span className="text-[#878787] block">JSON-LD Schemas:</span>
              <span className="font-semibold text-[#05AD98] block">
                {report.liveMetadata.schemaJsonLdCount} detected{' '}
                {report.liveMetadata.detectedSchemas.length > 0 && `(${report.liveMetadata.detectedSchemas.slice(0, 2).join(', ')})`}
              </span>
            </div>
            <div>
              <span className="text-[#878787] block">Headings Structure:</span>
              <span className="font-semibold text-white block">
                {report.liveMetadata.h1Count} H1 / {report.liveMetadata.h2Count} H2
              </span>
            </div>
            <div>
              <span className="text-[#878787] block">Word & Table Count:</span>
              <span className="font-semibold text-[#05AD98] block">
                {report.liveMetadata.wordCount.toLocaleString()} words / {report.liveMetadata.tableCount} tables
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Overview Banner */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 print:p-4 border border-[rgba(187,191,191,0.10)] relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[rgba(5,173,152,0.10)] rounded-full blur-3xl pointer-events-none print:hidden" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[rgba(5,173,152,0.08)] rounded-full blur-3xl pointer-events-none print:hidden" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-6 sm:gap-8 print:gap-4 items-center">
          {/* Main Score Gauge */}
          <div className="lg:col-span-4 print:col-span-4 flex flex-col items-center justify-center p-4 sm:p-6 print:p-3 bg-[#111514]/60 rounded-2xl border border-[rgba(187,191,191,0.10)] text-center">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-[#878787]">
              Generative Engine Optimization (GEO) Index
            </span>

            <div className="relative my-4 sm:my-6 print:my-2 flex items-center justify-center">
              {/* Outer Score Circle */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 print:w-28 print:h-28 rounded-full border-4 border-[rgba(187,191,191,0.10)] flex items-center justify-center relative shadow-inner">
                <div
                  className="absolute inset-0 rounded-full border-4 border-[#05AD98] border-t-transparent animate-spin print:border-t-[#05AD98] print:animate-none"
                  style={{ animationDuration: '18s' }}
                />
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl print:text-2xl font-extrabold tracking-tight text-white font-mono">
                    {report.overallGeoScore}
                  </span>
                  <span className="text-[10px] sm:text-xs text-[#878787] block font-sans">/ 100</span>
                </div>
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${getScoreColor(report.overallGeoScore)}`}>
              {report.overallGeoScore >= 80 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#05AD98]" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-[#B8A04A]" />
              )}
              {report.overallGeoScore >= 80
                ? 'High Citation Visibility'
                : report.overallGeoScore >= 60
                ? 'Moderate Citation Visibility'
                : 'High Zero-Click Risk'}
            </div>

            <p className="text-xs text-[#878787] mt-3 sm:mt-4 print:mt-1.5">
              Scanned domain: <span className="text-[#05AD98] font-mono font-medium">{report.domain}</span>
            </p>

            {/* Data source badge */}
            <div className="mt-2 print:mt-1">
              {report.dataSource === 'live_crawl' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.20)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Crawl
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25" title="Live crawl was not available. Score is derived from structural domain analysis.">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Structural Estimate
                </span>
              )}
            </div>
          </div>

          {/* Granular Sub-indices */}
          <div className="lg:col-span-8 print:col-span-8 space-y-4 sm:space-y-6 print:space-y-2.5">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className="text-lg sm:text-xl print:text-base font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98] shrink-0" />
                  {isWhiteLabel
                    ? (customAgencyName ? `${customAgencyName} Intelligence Synthesis & Zero-Click Breakdown` : 'GEO Intelligence Synthesis & Zero-Click Breakdown')
                    : 'CiteRoute Engine Synthesis & Zero-Click Resilience Breakdown'}
                </h2>
                <span className="text-[11px] text-[#878787]">Updated: {new Date(report.analyzedAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs sm:text-sm print:text-xs text-[#BBBFBF] mt-2 print:mt-1 leading-relaxed">{report.summary}</p>
            </div>

            {/* Metrics Grid - Uniform, fixed-height cards that never get out of shape */}
            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2.5 sm:gap-3 print:gap-2">
              {[
                { key: 'zeroClick', label: 'Zero-Click Resilience', value: report.zeroClickResilience, barColor: 'bg-emerald-400', textColor: 'text-[#05AD98]' },
                { key: 'infoGain', label: 'Information Gain', value: report.informationGainScore, barColor: 'bg-sky-400', textColor: 'text-sky-400' },
                { key: 'entity', label: 'Entity Grounding', value: report.entityDisambiguationScore, barColor: 'bg-indigo-400', textColor: 'text-indigo-400' },
                { key: 'vector', label: 'Vector Readiness', value: report.vectorReadinessScore, barColor: 'bg-purple-400', textColor: 'text-purple-400' },
              ].map(metric => {
                const isSelected = activeTooltip === metric.key;
                return (
                  <button
                    key={metric.key}
                    type="button"
                    onClick={() => setActiveTooltip(isSelected ? null : metric.key)}
                    className={`p-3 sm:p-3.5 print:p-2 rounded-xl text-left transition-all duration-200 relative group cursor-pointer focus:outline-none flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#05AD98]/10 border-2 border-[#05AD98] shadow-[0_0_20px_rgba(5,173,152,0.18)]'
                        : 'bg-[#111514]/40 border border-[rgba(187,191,191,0.10)] hover:border-[rgba(5,173,152,0.30)] hover:bg-[#111514]/70'
                    }`}
                    aria-label={`Toggle details for ${metric.label}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] sm:text-[11px] print:text-[10px] font-medium block truncate ${isSelected ? 'text-white' : 'text-[#878787]'}`}>
                          {metric.label}
                        </span>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors print:hidden ${
                          isSelected ? 'bg-[#05AD98] text-[#0A0E0E]' : 'bg-[rgba(187,191,191,0.08)] text-[#878787] group-hover:text-white'
                        }`}>
                          <Info className="w-2.5 h-2.5" />
                        </div>
                      </div>
                      <span className={`text-lg sm:text-xl print:text-base font-bold font-mono ${metric.textColor} mt-1 block`}>
                        {metric.value}%
                      </span>
                    </div>

                    <div className="w-full mt-2 print:mt-1">
                      <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`${metric.barColor} h-full rounded-full transition-all duration-700`}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[9px] print:hidden">
                        <span className={isSelected ? 'text-[#05AD98] font-semibold' : 'text-[#878787]/70 group-hover:text-[#878787]'}>
                          {isSelected ? 'Details active' : 'Click to learn'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expandable Score Deep Dive Panel - Spans full width without deforming cards (Screen Only) */}
            {activeTooltip && SCORE_TOOLTIPS[activeTooltip] && (() => {
              const METRIC_META: Record<string, { label: string; value: number; tag: string; badge: string }> = {
                'zeroClick': { label: 'Zero-Click Resilience', value: report.zeroClickResilience, tag: 'Measures resistance against zero-click answer synthesis', badge: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
                'infoGain': { label: 'Information Gain', value: report.informationGainScore, tag: 'Novel proprietary research, statistics, and empirical data', badge: 'border-sky-500/30 text-sky-400 bg-sky-500/10' },
                'entity': { label: 'Entity Grounding', value: report.entityDisambiguationScore, tag: 'Brand disambiguation and knowledge graph grounding', badge: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' },
                'vector': { label: 'Vector Readiness', value: report.vectorReadinessScore, tag: 'Semantic chunking, RAG ingestion, and embedding suitability', badge: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
              };
              const activeMeta = METRIC_META[activeTooltip] || { label: 'Metric', value: 0, tag: '', badge: '' };
              const data = SCORE_TOOLTIPS[activeTooltip];

              return (
                <div className="mt-3.5 p-4 sm:p-5 rounded-2xl bg-[#0C1111] border border-[rgba(5,173,152,0.25)] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 print:hidden relative overflow-hidden">
                  {/* Background glow accent */}
                  <div className="absolute top-0 right-0 w-72 h-72 bg-[#05AD98]/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Header Bar */}
                  <div className="flex items-center justify-between border-b border-[rgba(187,191,191,0.08)] pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[rgba(5,173,152,0.12)] border border-[rgba(5,173,152,0.25)] flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-[#05AD98]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                            {activeMeta.label}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-mono font-semibold ${activeMeta.badge}`}>
                            {activeMeta.value}%
                          </span>
                        </div>
                        <p className="text-[11px] text-[#878787] mt-0.5">
                          {activeMeta.tag}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTooltip(null)}
                      className="w-7 h-7 rounded-lg bg-[#161B1B] hover:bg-slate-700 text-[#878787] hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Close details"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 3-Column Structured Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#111514]/70 border border-[rgba(187,191,191,0.08)] flex flex-col justify-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#878787] flex items-center gap-1.5 mb-1.5">
                        <Info className="w-3.5 h-3.5 text-[#05AD98]" />
                        What It Measures
                      </span>
                      <p className="text-xs text-[#BBBFBF] leading-relaxed">
                        {data.what}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#111514]/70 border border-[rgba(5,173,152,0.18)] flex flex-col justify-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#05AD98] flex items-center gap-1.5 mb-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#05AD98]" />
                        Why It Matters
                      </span>
                      <p className="text-xs text-[#BBBFBF] leading-relaxed">
                        {data.why}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#111514]/70 border border-[rgba(56,189,248,0.18)] flex flex-col justify-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-1.5">
                        <Zap className="w-3.5 h-3.5 text-sky-400" />
                        How To Improve
                      </span>
                      <p className="text-xs text-[#BBBFBF] leading-relaxed">
                        {data.how}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── CiteRoute Engine Intelligence Suite ── */}
      {report.aiInsights ? (
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-[rgba(5,173,152,0.30)] bg-gradient-to-br from-[rgba(5,173,152,0.06)] via-transparent to-[rgba(99,102,241,0.04)] relative overflow-hidden space-y-6 print-break-avoid">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(187,191,191,0.10)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[rgba(5,173,152,0.15)] flex items-center justify-center text-[#05AD98]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {isWhiteLabel
                    ? (customAgencyName ? `${customAgencyName}: Deep Citation Intelligence` : 'Executive Deep Citation Intelligence')
                    : 'CiteRoute Engine: Deep Citation Intelligence'}
                </h3>
                <p className="text-[11px] text-[#878787]">
                  Semantic analysis of your domain&apos;s citability, entity grounding, and agentic readiness
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#111514] text-[#05AD98] border border-[rgba(5,173,152,0.3)] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#05AD98] animate-pulse" />
                {isWhiteLabel ? 'Verified Engine v2.0' : 'CiteRoute Engine v2.0'}
              </span>
              <button
                onClick={handleEnhanceWithAi}
                disabled={isEnhancing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111514] hover:bg-slate-800 text-slate-300 hover:text-white border border-[rgba(187,191,191,0.15)] text-[11px] font-medium transition-all disabled:opacity-50"
                title="Regenerate engine analysis"
              >
                <RefreshCw className={`w-3 h-3 ${isEnhancing ? 'animate-spin text-[#05AD98]' : ''}`} />
                <span>{isEnhancing ? 'Analyzing...' : 'Re-analyze'}</span>
              </button>
            </div>
          </div>

          {/* Executive Synthesis */}
          <div className="p-4 rounded-xl bg-[#0D1211]/80 border border-[rgba(5,173,152,0.15)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#05AD98] block mb-1">
              Executive Citation Synthesis
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {report.aiInsights.executiveSummary}
            </p>
          </div>

          {/* Vulnerabilities vs Opportunities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Citation Risk Factors */}
            {report.aiInsights.citationRiskFactors.length > 0 && (
              <div className="p-4 rounded-xl bg-[#111514]/60 border border-rose-500/20 space-y-2.5">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Citation Risk Factors &amp; Extraction Voids
                </span>
                <ul className="space-y-2 text-xs text-[#BBBFBF]">
                  {report.aiInsights.citationRiskFactors.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold text-sm leading-none mt-0.5">•</span>
                      <span className="leading-snug">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Competitor Disruption Strategies */}
            {report.aiInsights.competitorStrategies.length > 0 && (
              <div className="p-4 rounded-xl bg-[#111514]/60 border border-[rgba(5,173,152,0.20)] space-y-2.5">
                <span className="text-xs font-bold text-[#05AD98] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  Citation Stealing &amp; Competitive Disruption
                </span>
                <ul className="space-y-2 text-xs text-[#BBBFBF]">
                  {report.aiInsights.competitorStrategies.map((strat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#05AD98] font-bold text-sm leading-none mt-0.5">•</span>
                      <span className="leading-snug">{strat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tailored Schemas Playground */}
          {((report.aiInsights.tailoredSchemas && report.aiInsights.tailoredSchemas.length > 0) || report.aiInsights.suggestedAgentManifest) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#05AD98]" />
                  Tailored Implementation Schemas (Production-Ready)
                </h4>
                <span className="text-[10px] text-[#878787]">Personalized for {report.domain}</span>
              </div>

              {/* Screen Mode: Interactive Single Tab Switcher */}
              <div className="print:hidden space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  {report.aiInsights.tailoredSchemas.map((schema, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSchemaTab(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        activeSchemaTab === idx
                          ? 'bg-[#05AD98] text-black shadow-sm'
                          : 'bg-[#111514] text-[#878787] hover:text-white border border-[rgba(187,191,191,0.12)]'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      {schema.type}
                    </button>
                  ))}
                  {report.aiInsights.suggestedAgentManifest && (
                    <button
                      onClick={() => setActiveSchemaTab(999)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        activeSchemaTab === 999
                          ? 'bg-purple-500 text-white shadow-sm'
                          : 'bg-[#111514] text-[#878787] hover:text-white border border-[rgba(187,191,191,0.12)]'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      agent.json
                    </button>
                  )}
                </div>

                {/* Active Schema Code Box */}
                {activeSchemaTab === 999 && report.aiInsights.suggestedAgentManifest ? (
                  <div className="rounded-xl bg-[#070A0A] border border-purple-500/20 p-4 space-y-3">
                    <div className="p-2.5 rounded-lg bg-[#111514] border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-[#878787]">Target File:</span>
                        <code className="text-[11px] font-mono font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          public/.well-known/agent.json
                        </code>
                      </div>
                      <span className="text-[10px] text-[#878787]">
                        Static Public Assets / Well-Known Agent Protocol Route
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                      <span className="font-semibold text-purple-300">
                        {isWhiteLabel
                          ? '/.well-known/agent.json (Autonomous Agent Protocol v1.2)'
                          : '/.well-known/agent.json (CiteRoute Autonomous Protocol v1.2)'}
                      </span>
                      <button
                        onClick={() => handleCopyCode(report.aiInsights!.suggestedAgentManifest!, 'schema-agent-manifest')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A2020] hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                      >
                        {copiedSnippetId === 'schema-agent-manifest' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#05AD98]" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy agent.json
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-purple-200/90 overflow-x-auto p-2 leading-relaxed max-h-72">
                      {report.aiInsights.suggestedAgentManifest}
                    </pre>
                  </div>
                ) : report.aiInsights.tailoredSchemas[activeSchemaTab] ? (
                  <div className="rounded-xl bg-[#070A0A] border border-[rgba(5,173,152,0.20)] p-4 space-y-3">
                    <div className="p-2.5 rounded-lg bg-[#111514] border border-[rgba(5,173,152,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-3.5 h-3.5 text-[#05AD98] shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-[#878787]">Target File:</span>
                        <code className="text-[11px] font-mono font-semibold text-emerald-300 bg-[rgba(5,173,152,0.10)] px-2 py-0.5 rounded border border-[rgba(5,173,152,0.20)]">
                          app/layout.tsx (or pages/_document.tsx / index.html)
                        </code>
                      </div>
                      <span className="text-[10px] text-[#878787]">
                        Document &lt;head&gt; / Server-Rendered JSON-LD
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                      <div>
                        <span className="font-semibold text-white block">
                          {report.aiInsights.tailoredSchemas[activeSchemaTab].title}
                        </span>
                        <span className="text-[10px] text-[#878787]">
                          {report.aiInsights.tailoredSchemas[activeSchemaTab].description}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(report.aiInsights!.tailoredSchemas[activeSchemaTab].jsonLd, `schema-${activeSchemaTab}`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A2020] hover:bg-slate-700 text-slate-200 text-xs transition-colors shrink-0"
                      >
                        {copiedSnippetId === `schema-${activeSchemaTab}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#05AD98]" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy JSON-LD
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-300/90 overflow-x-auto p-2 leading-relaxed max-h-72">
                      {report.aiInsights.tailoredSchemas[activeSchemaTab].jsonLd}
                    </pre>
                  </div>
                ) : null}
              </div>

              {/* Print Mode: Complete Sequential Schemas & Protocol Appendix */}
              <div className="hidden print:block space-y-3 pt-1">
                {report.aiInsights.tailoredSchemas.map((schema, idx) => (
                  <div key={idx} className="rounded-xl bg-[#070A0A] border border-[rgba(5,173,152,0.25)] p-3.5 space-y-1.5 print-break-avoid">
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                      <span className="font-bold text-white text-xs">{schema.title}</span>
                      <span className="text-[9px] font-mono text-[#05AD98] bg-[rgba(5,173,152,0.10)] px-2 py-0.5 rounded border border-[rgba(5,173,152,0.20)]">
                        {schema.type} &bull; app/layout.tsx
                      </span>
                    </div>
                    <p className="text-[10px] text-[#BBBFBF]">{schema.description}</p>
                    <pre className="text-[8pt] font-mono text-emerald-300/95 p-2 bg-[#0A0E0E] rounded border border-slate-850 whitespace-pre-wrap break-all leading-normal">
                      <code>{schema.jsonLd}</code>
                    </pre>
                  </div>
                ))}
                {report.aiInsights.suggestedAgentManifest && (
                  <div className="rounded-xl bg-[#070A0A] border border-purple-500/25 p-3.5 space-y-1.5 print-break-avoid">
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                      <span className="font-bold text-purple-300 text-xs">
                        {isWhiteLabel ? '/.well-known/agent.json (Autonomous Agent Protocol v1.2)' : '/.well-known/agent.json (CiteRoute Autonomous Protocol v1.2)'}
                      </span>
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        public/.well-known/agent.json
                      </span>
                    </div>
                    <p className="text-[10px] text-[#BBBFBF]">Autonomous agent discovery manifest for LLMs, bots, and commerce crawlers.</p>
                    <pre className="text-[8pt] font-mono text-purple-200/95 p-2 bg-[#0A0E0E] rounded border border-slate-850 whitespace-pre-wrap break-all leading-normal">
                      <code>{report.aiInsights.suggestedAgentManifest}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empirical Copy Rewrites */}
          {report.aiInsights.contentRewrites && report.aiInsights.contentRewrites.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#05AD98]" />
                Information Gain &amp; Citation Copy Optimization
              </h4>
              <div className="space-y-3">
                {report.aiInsights.contentRewrites.map((rw, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#0E1312] border border-[rgba(187,191,191,0.12)] space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/15">
                        <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">
                          Detected Weak Citation Signal:
                        </span>
                        <p className="text-slate-300 italic">&ldquo;{rw.originalIssue}&rdquo;</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-[10px] uppercase font-bold text-[#05AD98] block mb-1">
                          Optimized Empirical Rewrite:
                        </span>
                        <p className="text-white font-medium">&ldquo;{rw.suggestedCopy}&rdquo;</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#878787] italic">
                      <span className="text-slate-400 font-semibold not-italic">Why answer engines cite this:</span> {rw.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CiteRoute Engine Activation Callout */
        <div className="glass-panel rounded-2xl p-5 border border-[rgba(5,173,152,0.25)] bg-gradient-to-r from-[rgba(5,173,152,0.06)] to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(5,173,152,0.15)] flex items-center justify-center text-[#05AD98] shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {isWhiteLabel ? 'Unlock Deep Citation Intelligence' : 'Unlock CiteRoute Engine Intelligence'}
              </h4>
              <p className="text-xs text-[#878787] mt-0.5">
                {isWhiteLabel
                  ? 'Run the intelligence engine to generate tailored JSON-LD schemas, a custom agent.json manifest, empirical copy rewrites, and a competitive citation playbook for this domain.'
                  : 'Run CiteRoute Engine to generate tailored JSON-LD schemas, a custom agent.json manifest, empirical copy rewrites, and a competitive citation playbook for this domain.'}
              </p>
              {enhanceError && (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {enhanceError}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleEnhanceWithAi}
            disabled={isEnhancing}
            className="px-4 py-2 rounded-xl bg-[#05AD98] hover:bg-[#049481] text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-[rgba(5,173,152,0.3)] shrink-0 disabled:opacity-60"
          >
            {isEnhancing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>{isWhiteLabel ? 'Engine Analyzing...' : 'CiteRoute Engine Analyzing...'}</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4 text-black" />
                <span>{isWhiteLabel ? 'Run Engine Analysis' : 'Run CiteRoute Engine'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Score History - real trend data from cron rescans */}
      <ScoreHistoryPanel domain={report.domain} isWhiteLabel={isWhiteLabel} />

      {/* Foundation Model & Generative Answer Engine Diagnostics */}
      <div className="print-break-avoid space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98]" />
              Foundation Model Citation Prober &amp; Engine Diagnostics
            </h3>
            <p className="text-xs text-[#878787] mt-0.5">
              Empirical multi-model probes dispatched via OpenRouter to measure if live answer engines cite <span className="font-mono text-[#BBBFBF]">{cleanDomain}</span>.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.25)] self-start sm:self-auto">
            <span className={`w-1.5 h-1.5 rounded-full ${activeEngines[0]?.isLiveQuery ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
            {activeEngines[0]?.isLiveQuery ? 'OpenRouter Live Verified' : 'CiteRoute Engine Calibrated'}
          </span>
        </div>

        {/* Live Probe Command Prompt Telemetry Stream */}
        {isProbing && (
          <div className="animate-fadeIn print:hidden">
            <ScanTerminalStream
              domain={cleanDomain}
              mode="probe"
              title="FOUNDATION MODEL EMPIRICAL PROBER"
              customQuery={customProbeQuery}
            />
          </div>
        )}

        {/* 4 Engine Live Diagnostic Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {activeEngines.map((engine) => {
            const status =
              engine.citationStatus ||
              (engine.isCited ? (engine.score >= 80 ? 'actively_cited' : 'entity_recognized') : 'omitted');

            return (
              <div key={engine.engine} className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(5,173,152,0.30)] flex flex-col justify-between space-y-3 print-break-avoid">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-xs sm:text-sm text-white block">{engine.name}</span>
                      <span className="text-[9px] font-medium text-[#878787] uppercase tracking-wider block mt-0.5">
                        {engine.modelRole || (engine.engine === 'perplexity' ? 'Live Web Retrieval' : 'Entity Knowledge Graph')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${engine.isLiveQuery ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getScoreColor(engine.score)}`}>
                        {engine.score}/100
                      </span>
                    </div>
                  </div>

                  {/* Empirical Citation Verdict Badge (3-Tier) */}
                  <div className="flex items-center justify-between py-1 border-y border-[rgba(187,191,191,0.08)]">
                    <span className="text-[10px] uppercase font-bold text-[#878787]">Citation Verdict:</span>
                    {status === 'actively_cited' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                        Actively Cited
                      </span>
                    )}
                    {status === 'entity_recognized' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/25">
                        Entity Recognized
                      </span>
                    )}
                    {status === 'omitted' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/25">
                        Citation Void / Omitted
                      </span>
                    )}
                  </div>

                  {/* Dispatched Probe Prompt */}
                  {engine.probeQuery && (
                    <div className="p-2 rounded-lg bg-[#070A0A] border border-slate-850 text-[10px] space-y-0.5">
                      <span className="text-[#878787] block font-mono text-[9px] uppercase tracking-wider">Probe Query:</span>
                      <p className="text-slate-300 italic line-clamp-2">&ldquo;{cleanSnippetText(engine.probeQuery)}&rdquo;</p>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-[#BBBFBF]">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#878787]">Citation Probability:</span>
                      <span className="font-mono font-semibold text-[#05AD98]">{engine.citationProbability}%</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#878787]">Authority Tier:</span>
                      <span className="font-medium text-slate-200">{engine.sentimentRating}</span>
                    </div>
                  </div>

                  {engine.citationSnippet && (
                    <div className="p-2.5 rounded-lg bg-[rgba(5,173,152,0.06)] border border-[rgba(5,173,152,0.15)] text-[10px] text-[#BBBFBF] leading-relaxed italic">
                      &ldquo;{cleanSnippetText(engine.citationSnippet)}&rdquo;
                    </div>
                  )}
                </div>

                {/* Source link & latency footer */}
                <div className="flex items-center justify-between text-[9px] text-[#878787] pt-2 border-t border-slate-850">
                  {engine.citationUrl ? (
                    <a
                      href={engine.citationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#05AD98] hover:underline inline-flex items-center gap-0.5 font-medium"
                    >
                      <span>Source Verified</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span>Direct Model Retrieval</span>
                  )}
                  {engine.latencyMs ? <span>{engine.latencyMs}ms</span> : <span>Model Verified</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Custom Query Citation Tester Box */}
        <div className="p-4 rounded-2xl bg-[#080C0C] border border-[rgba(5,173,152,0.25)] space-y-3 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[rgba(5,173,152,0.15)] flex items-center justify-center text-[#05AD98] shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Test Live Search Probes via OpenRouter
                </h4>
                <p className="text-[11px] text-[#878787]">
                  Send custom queries to Perplexity Sonar and foundation models to observe real citation win-rates.
                </p>
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const q = `What are the core capabilities and verified offerings of ${cleanDomain}?`;
                  setCustomProbeQuery(q);
                  handleRunProbe(q);
                }}
                className="px-2 py-0.5 rounded-lg bg-[#111616] hover:bg-[#1A2222] border border-[rgba(187,191,191,0.12)] text-[10px] text-slate-300 transition-colors"
              >
                Brand Authority
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = `Who are the leading providers and solutions in the ${cleanDomain} space?`;
                  setCustomProbeQuery(q);
                  handleRunProbe(q);
                }}
                className="px-2 py-0.5 rounded-lg bg-[#111616] hover:bg-[#1A2222] border border-[rgba(187,191,191,0.12)] text-[10px] text-slate-300 transition-colors"
              >
                Topical Leader
              </button>
            </div>
          </div>

          {/* Interactive Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunProbe();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={customProbeQuery}
                onChange={(e) => setCustomProbeQuery(e.target.value)}
                placeholder={`Enter custom query to test live citation (e.g. "What makes ${cleanDomain} unique?")`}
                className="w-full px-3.5 py-2 rounded-xl bg-[#040606] border border-[rgba(187,191,191,0.15)] text-white text-xs outline-none focus:border-[#05AD98] transition-colors placeholder:text-slate-600"
              />
            </div>
            <button
              type="submit"
              disabled={isProbing}
              className="px-4 py-2 rounded-xl bg-[#05AD98] hover:bg-[#049481] text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 disabled:opacity-60"
            >
              {isProbing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Probing OpenRouter Models...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Live Probe</span>
                </>
              )}
            </button>
          </form>

          {probeError && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {probeError}
            </p>
          )}
        </div>
      </div>


      {/* Detected Entity Knowledge Graph Anchor */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-[rgba(187,191,191,0.10)] print-break-avoid">
        <h3 className="text-sm sm:text-md font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#05AD98]" />
          Recognized Knowledge Graph Entities (Vector Disambiguation)
        </h3>
        <p className="text-xs text-[#878787] mb-3 sm:mb-4">
          These semantic entities are currently mapped to your domain inside LLM latent spaces:
        </p>

        <div className="flex flex-wrap gap-2">
          {report.detectedEntities.map((entity, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#111514]/80 border border-[rgba(187,191,191,0.10)] text-[11px] sm:text-xs text-slate-200"
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-400" />
              <span className="font-medium">{entity.name}</span>
              <span className="text-[9px] sm:text-[10px] text-[#05AD98] font-mono px-1.5 py-0.5 rounded bg-[rgba(5,173,152,0.08)]">
                {entity.type}
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#878787] font-mono">
                {(entity.confidence * 100).toFixed(0)}% conf
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* High-Impact Actionable GEO Recommendations */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98]" />
                Targeted Protocol Patches & Recommendations
              </h3>
              {report.aiInsights && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#05AD98] bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.25)] px-2 py-0.5 rounded-full">
                  <Cpu className="w-2.5 h-2.5" />
                  {isWhiteLabel ? 'Engine Synthesized' : 'CiteRoute Synthesized'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#878787]">
              Apply these structural schema patches to immediately boost citation win-rates and agentic routing.
            </p>
          </div>

          {/* Horizontally Scrollable Filter Pills on Mobile */}
          <div className="overflow-x-auto pb-1 max-w-full print:hidden">
            <div className="flex items-center gap-1.5 bg-[#111514]/80 p-1 rounded-xl border border-[rgba(187,191,191,0.10)] shrink-0">
              {['ALL', 'Agentic API', 'Information Gain', 'Schema', 'Vector Density'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeCategoryFilter === cat
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-[#878787] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {filteredRecommendations.map((rec) => (
            <div key={rec.id} className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] space-y-3 print-break-avoid">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityBadge(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  {rec.effortImpact && (() => {
                    const eiLabel = getEffortImpactLabel(rec.effortImpact);
                    return eiLabel ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${eiLabel.cls}`}>
                        {eiLabel.label}
                      </span>
                    ) : null;
                  })()}
                  {report.aiInsights && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#05AD98] bg-[rgba(5,173,152,0.08)] border border-[rgba(5,173,152,0.20)] px-1.5 py-0.5 rounded">
                      <Cpu className="w-2.5 h-2.5" />
                      Engine Tailored
                    </span>
                  )}
                  <h4 className="font-semibold text-white text-sm sm:text-base">{rec.title}</h4>
                </div>
                <span className="text-xs font-semibold text-[#05AD98] bg-[rgba(5,173,152,0.10)] px-2.5 py-0.5 sm:py-1 rounded-full border border-[rgba(5,173,152,0.20)] self-start sm:self-auto">
                  {rec.impact}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">{rec.description}</p>

              {rec.codeSnippet && (() => {
                const guide = getPatchDeploymentGuide(rec, cleanDomain);
                const isPathCopied = copiedSnippetId === `path-${rec.id}`;

                return (
                  <div className="mt-3 rounded-xl bg-[#080C0C] border border-[rgba(187,191,191,0.12)] p-3.5 sm:p-4 space-y-3 relative group print-break-avoid">
                    {/* Project Deployment Guide Bar */}
                    <div className="p-3 rounded-lg bg-[#111615] border border-[rgba(5,173,152,0.22)] space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FolderGit2 className="w-4 h-4 text-[#05AD98] shrink-0" />
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#878787]">
                            Apply In Project:
                          </span>
                          <code className="text-xs font-mono font-semibold text-emerald-300 bg-[rgba(5,173,152,0.12)] px-2 py-0.5 rounded border border-[rgba(5,173,152,0.25)]">
                            {guide.targetFile}
                          </code>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(guide.targetFile.split(' ')[0], `path-${rec.id}`)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A2020] hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors print:hidden"
                            title="Copy file path"
                          >
                            {isPathCopied ? (
                              <>
                                <Check className="w-3 h-3 text-[#05AD98]" /> Copied Path
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Path
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#BBBFBF] flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-[rgba(187,191,191,0.08)]">
                        <div>
                          <span className="text-[#878787]">Scope:</span>{' '}
                          <span className="text-slate-200 font-medium">{guide.locationType}</span>
                        </div>
                        <div>
                          <span className="text-[#878787]">Frameworks:</span>{' '}
                          <span className="text-slate-300">{guide.frameworkNote}</span>
                        </div>
                      </div>

                      {/* Step-by-step guidance */}
                      <div className="pt-2 border-t border-[rgba(187,191,191,0.08)] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                          Implementation Steps:
                        </span>
                        <ol className="list-decimal list-inside text-xs text-[#BBBFBF] space-y-1 pl-0.5">
                          {guide.steps.map((step, sIdx) => (
                            <li key={sIdx} className="leading-relaxed">
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Target Deployment Patch Code */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-850 text-xs text-[#878787] font-mono">
                        <span className="text-[11px] flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-[#05AD98]" />
                          <span className="font-semibold text-slate-300">Code Patch Payload</span>
                          {report.aiInsights && (
                            <span className="text-[9px] text-[#05AD98] font-mono">
                              • Tailored for {cleanDomain}
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => handleCopyCode(rec.codeSnippet!, rec.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A2020] hover:bg-slate-700 text-slate-200 text-xs transition-colors print:hidden"
                        >
                          {copiedSnippetId === rec.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#05AD98]" /> Copied Patch!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Code Patch
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-xs font-mono text-[#05AD98] overflow-x-auto p-2 bg-[#050808] rounded-lg border border-[rgba(187,191,191,0.08)] leading-normal">
                        <code>{rec.codeSnippet}</code>
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* Executive Report Footer - Visible only in Print/PDF */}
      <div className="hidden print:flex items-center justify-between border-t border-[rgba(187,191,191,0.20)] pt-4 mt-6 text-[10px] text-[#878787] print-break-avoid">
        {isWhiteLabel ? (
          <>
            <span>
              Confidential Client Deliverable &bull; Prepared for <strong className="text-white">{cleanDomain}</strong>
              {customAgencyName ? ` by ${customAgencyName}` : ''}
            </span>
            <span>Autonomous Agent &amp; Generative Engine Visibility Intelligence</span>
          </>
        ) : (
          <>
            <span>Generated by CiteRoute Platform &bull; <strong className="text-[#05AD98]">https://www.citeroute.com</strong></span>
            <span>Confidential &amp; Proprietary &bull; Page Intelligence &amp; Autonomous Agent Observability</span>
          </>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade Watchlist Capacity"
        message="Free tier includes tracking up to 3 domains in your watchlist. Upgrade to Pro to track up to 20 domains."
        targetTier="pro"
        currentLimit={3}
        featureName="Watchlist Domains"
      />
    </div>
  );
}
