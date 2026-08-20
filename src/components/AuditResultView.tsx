'use client';

import React, { useState } from 'react';
import { GeoAuditReport, Recommendation } from '../lib/types';
import { saveWatchedDomain } from '../lib/storage';
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
  CheckCheck
} from 'lucide-react';

interface AuditResultViewProps {
  report: GeoAuditReport;
}

export default function AuditResultView({ report }: AuditResultViewProps) {
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [isSavedToWatchlist, setIsSavedToWatchlist] = useState(false);

  const handleCopyCode = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleSaveWatchlist = () => {
    saveWatchedDomain(report);
    setIsSavedToWatchlist(true);
    setTimeout(() => setIsSavedToWatchlist(false), 2500);
  };

  const handlePrintPdf = () => {
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

  const filteredRecommendations =
    activeCategoryFilter === 'ALL'
      ? report.recommendations
      : report.recommendations.filter((r) => r.category === activeCategoryFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:space-y-4">
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

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111514] hover:bg-slate-850 text-slate-200 border border-slate-750 text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#05AD98]" />
            <span>Export Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Live Scanned DOM Metadata Strip */}
      {report.liveMetadata?.isLiveScanned && (
        <div className="glass-card rounded-2xl p-4 border border-[rgba(5,173,152,0.20)] bg-emerald-950/10 space-y-2 text-xs">
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
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[rgba(187,191,191,0.10)] relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[rgba(5,173,152,0.10)] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[rgba(5,173,152,0.08)] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Main Score Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#111514]/60 rounded-2xl border border-[rgba(187,191,191,0.10)] text-center">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-[#878787]">
              Generative Engine Optimization (GEO) Index
            </span>

            <div className="relative my-4 sm:my-6 flex items-center justify-center">
              {/* Outer Score Circle */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-[rgba(187,191,191,0.10)] flex items-center justify-center relative shadow-inner">
                <div
                  className="absolute inset-0 rounded-full border-4 border-[#05AD98] border-t-transparent animate-spin"
                  style={{ animationDuration: '18s' }}
                />
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
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
                ? 'High AI Visibility'
                : report.overallGeoScore >= 60
                ? 'Moderate AI Citation'
                : 'High Zero-Click Risk'}
            </div>

            <p className="text-xs text-[#878787] mt-3 sm:mt-4">
              Scanned domain: <span className="text-[#05AD98] font-mono font-medium">{report.domain}</span>
            </p>
          </div>

          {/* Granular Sub-indices */}
          <div className="lg:col-span-8 space-y-5 sm:space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98] shrink-0" />
                  AI Synthesis & Zero-Click Resilience Breakdown
                </h2>
                <span className="text-[11px] text-[#878787]">Updated: {new Date(report.analyzedAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs sm:text-sm text-[#BBBFBF] mt-2 leading-relaxed">{report.summary}</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#111514]/40 border border-[rgba(187,191,191,0.10)]">
                <span className="text-[10px] sm:text-[11px] text-[#878787] font-medium block">Zero-Click Resilience</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-[#05AD98] mt-1 block">
                  {report.zeroClickResilience}%
                </span>
                <div className="w-full bg-slate-850 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: `${report.zeroClickResilience}%` }}
                  />
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl bg-[#111514]/40 border border-[rgba(187,191,191,0.10)]">
                <span className="text-[10px] sm:text-[11px] text-[#878787] font-medium block">Information Gain</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-[#05AD98] mt-1 block">
                  {report.informationGainScore}%
                </span>
                <div className="w-full bg-slate-850 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full"
                    style={{ width: `${report.informationGainScore}%` }}
                  />
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl bg-[#111514]/40 border border-[rgba(187,191,191,0.10)]">
                <span className="text-[10px] sm:text-[11px] text-[#878787] font-medium block">Entity Grounding</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-[#05AD98] mt-1 block">
                  {report.entityDisambiguationScore}%
                </span>
                <div className="w-full bg-slate-850 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full"
                    style={{ width: `${report.entityDisambiguationScore}%` }}
                  />
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl bg-[#111514]/40 border border-[rgba(187,191,191,0.10)]">
                <span className="text-[10px] sm:text-[11px] text-[#878787] font-medium block">Vector Readiness</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-purple-400 mt-1 block">
                  {report.vectorReadinessScore}%
                </span>
                <div className="w-full bg-slate-850 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full"
                    style={{ width: `${report.vectorReadinessScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engine-by-Engine Performance Breakdown */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98]" />
          Foundation Model & Generative Answer Engine Diagnostics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {report.engineBreakdown.map((engine) => (
            <div key={engine.engine} className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs sm:text-sm text-white">{engine.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getScoreColor(engine.score)}`}>
                  {engine.score}/100
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#BBBFBF]">
                <div className="flex justify-between">
                  <span className="text-[#878787]">Citation Probability:</span>
                  <span className="font-mono font-semibold text-[#05AD98]">{engine.citationProbability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#878787]">Indexed Embeddings:</span>
                  <span className="font-mono text-slate-200">{engine.indexedChunks.toLocaleString()} chunks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#878787]">Authority Tier:</span>
                  <span className="font-medium text-slate-200">{engine.sentimentRating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#878787]">Active Crawler:</span>
                  <span className="font-mono text-[11px] text-[#878787]">{engine.lastCrawledAgent}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detected Entity Knowledge Graph Anchor */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-[rgba(187,191,191,0.10)]">
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
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98]" />
              Targeted Protocol Patches & Recommendations
            </h3>
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
            <div key={rec.id} className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityBadge(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  <h4 className="font-semibold text-white text-sm sm:text-base">{rec.title}</h4>
                </div>
                <span className="text-xs font-semibold text-[#05AD98] bg-[rgba(5,173,152,0.10)] px-2.5 py-0.5 sm:py-1 rounded-full border border-[rgba(5,173,152,0.20)] self-start sm:self-auto">
                  {rec.impact}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">{rec.description}</p>

              {rec.codeSnippet && (
                <div className="mt-3 rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] p-3 relative group">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-850 text-xs text-[#878787] font-mono">
                    <span className="text-[11px]">Target Deployment Patch</span>
                    <button
                      onClick={() => handleCopyCode(rec.codeSnippet!, rec.id)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1A2020] hover:bg-slate-700 text-slate-200 text-xs transition-colors print:hidden"
                    >
                      {copiedSnippetId === rec.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#05AD98]" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="mt-2 text-xs font-mono text-[#05AD98] overflow-x-auto p-1 leading-normal">
                    <code>{rec.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
