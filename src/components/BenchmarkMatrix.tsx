'use client';

import React, { useMemo, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart2,
  Crown,
  CheckCircle2,
  XCircle,
  Copy,
  Printer,
  Sparkles,
  ExternalLink,
  Target,
  FileCode,
  Bot,
  Layers,
  Table as TableIcon,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { GeoAuditReport, EngineScore } from '../lib/types';
import { buildEngineBreakdown } from '../lib/scoreCalculator';
import { UserTier } from '../lib/tierLimits';

interface BenchmarkMatrixProps {
  reports: GeoAuditReport[];
  onRescanDomain?: (domain: string) => void;
  rescanningDomain?: string | null;
  userTier?: UserTier;
  onTriggerUpgrade?: (reason?: string) => void;
}

const DOMAIN_COLORS = [
  { stroke: '#05AD98', fill: '#05AD98', bg: 'bg-[#05AD98]', text: 'text-[#05AD98]', border: 'border-[#05AD98]' },
  { stroke: '#B8A04A', fill: '#B8A04A', bg: 'bg-[#B8A04A]', text: 'text-[#B8A04A]', border: 'border-[#B8A04A]' },
  { stroke: '#38BDF8', fill: '#38BDF8', bg: 'bg-sky-400', text: 'text-sky-400', border: 'border-sky-400' },
  { stroke: '#A78BFA', fill: '#A78BFA', bg: 'bg-purple-400', text: 'text-purple-400', border: 'border-purple-400' },
  { stroke: '#F472B6', fill: '#F472B6', bg: 'bg-pink-400', text: 'text-pink-400', border: 'border-pink-400' },
];

const METRICS = [
  { key: 'overallGeoScore', label: 'GEO Index', radarLabel: 'GEO\nIndex' },
  { key: 'zeroClickResilience', label: 'Zero-Click Resilience', radarLabel: 'Zero-Click' },
  { key: 'informationGainScore', label: 'Information Gain', radarLabel: 'Info Gain' },
  { key: 'entityDisambiguationScore', label: 'Entity Grounding', radarLabel: 'Entity' },
  { key: 'vectorReadinessScore', label: 'Vector Readiness', radarLabel: 'Vector' },
];

const TARGET_ENGINES = [
  { id: 'perplexity', name: 'Perplexity Pro (Sonar)', desc: 'Live web citation and synthesized synthesis engine' },
  { id: 'chatgpt', name: 'OpenAI ChatGPT Search', desc: 'GPT-4o search grounding and entity recognition' },
  { id: 'claude', name: 'Claude 3.5 Knowledge Graph', desc: 'Semantic authority and structured concept retrieval' },
  { id: 'gemini', name: 'Google Gemini Grounding', desc: 'Google AI Overviews grounding and knowledge panel presence' },
];

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-[#05AD98]';
  if (score >= 70) return 'text-[#B8A04A]';
  return 'text-rose-400';
}

function resolveEngineBreakdown(report: GeoAuditReport): EngineScore[] {
  if (Array.isArray(report.engineBreakdown) && report.engineBreakdown.length > 0) {
    return report.engineBreakdown;
  }
  return buildEngineBreakdown(report.overallGeoScore, 0, []);
}

export default function BenchmarkMatrix({
  reports,
  onRescanDomain,
  rescanningDomain,
  userTier = 'free',
  onTriggerUpgrade,
}: BenchmarkMatrixProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const isFree = userTier === 'free';

  // Identify overall market leader
  const sortedByGeo = useMemo(() => {
    return [...reports].sort((a, b) => b.overallGeoScore - a.overallGeoScore);
  }, [reports]);

  const leader = sortedByGeo[0];
  const lowest = sortedByGeo[sortedByGeo.length - 1];
  const scoreSpread = leader && lowest ? leader.overallGeoScore - lowest.overallGeoScore : 0;

  // Prepare radar chart data
  const radarData = useMemo(() => {
    return METRICS.map((m) => {
      const entry: Record<string, string | number> = { metric: m.radarLabel };
      reports.forEach((r) => {
        entry[r.domain] = r[m.key as keyof GeoAuditReport] as number;
      });
      return entry;
    });
  }, [reports]);

  // Compute engine-by-engine citation rates and winners
  const engineMatrix = useMemo(() => {
    return TARGET_ENGINES.map((engine) => {
      let maxProb = -1;
      let winnerDomain = '';

      const domainScores = reports.map((r) => {
        const breakdown = resolveEngineBreakdown(r);
        const match = breakdown.find(
          (e) => e.engine.toLowerCase() === engine.id || e.name.toLowerCase().includes(engine.id)
        );
        const prob = match ? match.citationProbability : Math.max(30, r.overallGeoScore - 8);

        if (prob > maxProb) {
          maxProb = prob;
          winnerDomain = r.domain;
        }

        return {
          domain: r.domain,
          probability: prob,
        };
      });

      return {
        engine,
        domainScores,
        winnerDomain,
        maxProb,
      };
    });
  }, [reports]);

  // Compute net engine win counts per domain
  const winCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      counts[r.domain] = 0;
    });
    engineMatrix.forEach((em) => {
      if (em.winnerDomain) {
        counts[em.winnerDomain] = (counts[em.winnerDomain] || 0) + 1;
      }
    });
    return counts;
  }, [reports, engineMatrix]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('domains', reports.map((r) => r.domain).join(','));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handlePrint = () => {
    if (isFree) {
      onTriggerUpgrade?.('Exporting white-label PDF Battlecards requires a Pro subscription.');
      return;
    }
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Competitive Action Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="px-2.5 py-1 rounded-full bg-[#111514] text-[#BBBFBF] border border-[#222A28] font-mono">
            {reports.length} Domains Benchmarked
          </span>
          <span className="text-[#878787]">
            Market Leader: <strong className="text-white font-mono">{leader.domain}</strong> ({leader.overallGeoScore}/100)
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111514] hover:bg-[#1A2220] text-slate-200 border border-[#222A28] hover:border-[#05AD98] text-xs font-semibold transition-all active:scale-[0.98]"
          >
            <Copy className="w-3.5 h-3.5 text-[#05AD98]" />
            <span>{copiedLink ? 'Battlecard Link Copied!' : 'Copy Battlecard Link'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111514] hover:bg-[#1A2220] text-slate-200 border border-[#222A28] hover:border-[#BBBFBF] text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
          >
            {isFree ? <Lock className="w-3.5 h-3.5 text-[#B8A04A]" /> : <Printer className="w-3.5 h-3.5 text-[#BBBFBF]" />}
            <span>Export PDF {isFree ? '(Pro)' : ''}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Executive Head-to-Head Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Market Leader Card */}
        <div className="glass-panel rounded-2xl p-5 border border-[rgba(5,173,152,0.30)] bg-[rgba(5,173,152,0.04)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#05AD98]">Category Champion</span>
            <Crown className="w-4 h-4 text-[#B8A04A]" />
          </div>
          <p className="text-xl font-extrabold text-white font-mono truncate">{leader.domain}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-[#05AD98]">{leader.overallGeoScore}</span>
            <span className="text-xs text-[#878787] font-mono">/100 Overall GEO</span>
          </div>
          <p className="text-[11px] text-[#BBBFBF]">
            Commands highest citation probability across foundation models.
          </p>
        </div>

        {/* Score Spread Card */}
        <div className="glass-panel rounded-2xl p-5 border border-[rgba(187,191,191,0.10)] space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#878787]">Competitive Moat</span>
          <p className="text-xl font-extrabold text-white font-mono">
            +{scoreSpread} Points
          </p>
          <div className="text-xs text-[#BBBFBF] space-y-1">
            <p>Score spread between leader and trailing rival.</p>
            <p className="text-[11px] text-[#878787]">
              Lowest: <span className="font-mono text-white">{lowest.domain}</span> ({lowest.overallGeoScore}/100)
            </p>
          </div>
        </div>

        {/* Engine Win Breakdown Card */}
        <div className="glass-panel rounded-2xl p-5 border border-[rgba(187,191,191,0.10)] space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#878787]">Engine Win Standings</span>
          <div className="space-y-1.5 pt-1">
            {reports.map((r, i) => {
              const wins = winCounts[r.domain] || 0;
              return (
                <div key={r.domain} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${DOMAIN_COLORS[i]?.bg || 'bg-white'}`} />
                    <span className="text-white truncate max-w-[130px]">{r.domain}</span>
                  </div>
                  <span className="text-[#BBBFBF]">
                    {wins} {wins === 1 ? 'Win' : 'Wins'} / {TARGET_ENGINES.length - wins} Losses
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Multi-Dimensional Authority Radar */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[rgba(187,191,191,0.10)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Multi-Dimensional Authority Radar</h3>
            <p className="text-xs text-[#878787]">Relative strength across the 5 core GEO authority dimensions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {reports.map((r, i) => (
              <div key={r.domain} className="flex items-center gap-1.5 text-xs font-mono">
                <span className={`w-2.5 h-2.5 rounded-full ${DOMAIN_COLORS[i]?.bg || 'bg-white'}`} />
                <span className="text-[#BBBFBF]">{r.domain}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#222A28" strokeOpacity={0.8} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#BBBFBF', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
              />
              {reports.map((r, i) => (
                <Radar
                  key={r.domain}
                  name={r.domain}
                  dataKey={r.domain}
                  stroke={DOMAIN_COLORS[i]?.stroke || '#fff'}
                  fill={DOMAIN_COLORS[i]?.fill || '#fff'}
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={{ r: 3, fill: DOMAIN_COLORS[i]?.stroke }}
                />
              ))}
              <Tooltip
                contentStyle={{
                  background: '#111514',
                  border: '1px solid #222A28',
                  borderRadius: '12px',
                  color: '#f1f5f9',
                  fontSize: 12,
                }}
                itemStyle={{ color: '#f1f5f9' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#878787', paddingTop: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 3: Foundation Engine Win / Loss Matrix */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[rgba(187,191,191,0.10)]">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-[#05AD98]" />
            <h3 className="text-sm font-bold text-white">Foundation Engine Win / Loss Matrix</h3>
          </div>
          <p className="text-xs text-[#878787]">
            Side-by-side empirical citation probability across Perplexity, ChatGPT, Claude, and Gemini.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[620px]">
            <thead>
              <tr className="border-b border-[rgba(187,191,191,0.10)] bg-[#111514]/60">
                <th className="text-left px-5 py-3 text-[#878787] font-semibold uppercase tracking-wider text-[10px] w-56">
                  Engine & Model Role
                </th>
                {reports.map((r, i) => (
                  <th key={r.domain} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${DOMAIN_COLORS[i]?.bg || 'bg-white'}`} />
                      <span className="text-white font-bold font-mono truncate max-w-[120px]">{r.domain}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(187,191,191,0.06)]">
              {engineMatrix.map((em) => (
                <tr key={em.engine.id} className="hover:bg-[#111514]/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{em.engine.name}</p>
                    <p className="text-[10px] text-[#878787]">{em.engine.desc}</p>
                  </td>
                  {reports.map((r) => {
                    const ds = em.domainScores.find((s) => s.domain === r.domain);
                    const prob = ds?.probability ?? 0;
                    const isWinner = em.winnerDomain === r.domain;
                    return (
                      <td key={r.domain} className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-base font-extrabold font-mono ${getScoreColor(prob)}`}>
                            {prob}%
                          </span>
                          {isWinner ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(184,160,74,0.15)] text-[#B8A04A] border border-[rgba(184,160,74,0.30)] text-[9px] font-bold uppercase">
                              <Crown className="w-2.5 h-2.5" /> Engine Leader
                            </span>
                          ) : (
                            <span className="text-[9px] text-[#878787] font-mono">
                              -{em.maxProb - prob}% vs leader
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Technical Protocol & Schema Parity Checklist */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[rgba(187,191,191,0.10)]">
          <div className="flex items-center gap-2 mb-1">
            <FileCode className="w-4 h-4 text-[#05AD98]" />
            <h3 className="text-sm font-bold text-white">Technical GEO Protocol & Schema Parity</h3>
          </div>
          <p className="text-xs text-[#878787]">
            Side-by-side evaluation of machine-readable protocols, crawler permissions, and schema depth.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[620px]">
            <thead>
              <tr className="border-b border-[rgba(187,191,191,0.10)] bg-[#111514]/60">
                <th className="text-left px-5 py-3 text-[#878787] font-semibold uppercase tracking-wider text-[10px] w-56">
                  GEO Feature
                </th>
                {reports.map((r, i) => (
                  <th key={r.domain} className="px-4 py-3 text-center">
                    <span className="text-white font-bold font-mono truncate max-w-[120px]">{r.domain}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(187,191,191,0.06)] font-mono text-xs">
              {/* llms.txt */}
              <tr className="hover:bg-[#111514]/30 transition-colors">
                <td className="px-5 py-3.5 font-sans">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#05AD98]" />
                    <span className="text-white font-medium">llms.txt Protocol</span>
                  </div>
                  <p className="text-[10px] text-[#878787] font-sans">Standardized markdown root context for LLMs</p>
                </td>
                {reports.map((r) => {
                  const has = r.agentProtocols?.hasLlmsTxt ?? false;
                  return (
                    <td key={r.domain} className="px-4 py-3.5 text-center">
                      {has ? (
                        <span className="inline-flex items-center gap-1 text-[#05AD98] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#878787]">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" /> Missing
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* agent.json */}
              <tr className="hover:bg-[#111514]/30 transition-colors">
                <td className="px-5 py-3.5 font-sans">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#05AD98]" />
                    <span className="text-white font-medium">agent.json Manifest</span>
                  </div>
                  <p className="text-[10px] text-[#878787] font-sans">Autonomous agent action & capability discovery</p>
                </td>
                {reports.map((r) => {
                  const has = r.agentProtocols?.hasAgentJson ?? false;
                  return (
                    <td key={r.domain} className="px-4 py-3.5 text-center">
                      {has ? (
                        <span className="inline-flex items-center gap-1 text-[#05AD98] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#878787]">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" /> Missing
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Schema JSON-LD Count */}
              <tr className="hover:bg-[#111514]/30 transition-colors">
                <td className="px-5 py-3.5 font-sans">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#05AD98]" />
                    <span className="text-white font-medium">JSON-LD Schemas</span>
                  </div>
                  <p className="text-[10px] text-[#878787] font-sans">Structured semantic entities on server HTML</p>
                </td>
                {reports.map((r) => {
                  const count = r.liveMetadata?.schemaJsonLdCount ?? 2;
                  const schemas = r.liveMetadata?.detectedSchemas ?? ['Organization'];
                  return (
                    <td key={r.domain} className="px-4 py-3.5 text-center">
                      <span className="text-white font-bold">{count} blocks</span>
                      <p className="text-[10px] text-[#878787] truncate max-w-[120px] mx-auto">
                        {schemas.slice(0, 2).join(', ') || 'Standard'}
                      </p>
                    </td>
                  );
                })}
              </tr>

              {/* Information Gain Tables */}
              <tr className="hover:bg-[#111514]/30 transition-colors">
                <td className="px-5 py-3.5 font-sans">
                  <div className="flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-[#05AD98]" />
                    <span className="text-white font-medium">Structured Benchmark Tables</span>
                  </div>
                  <p className="text-[10px] text-[#878787] font-sans">Empirical datasets that drive LLM citations</p>
                </td>
                {reports.map((r) => {
                  const tables = r.liveMetadata?.tableCount ?? (r.informationGainScore > 80 ? 4 : 1);
                  return (
                    <td key={r.domain} className="px-4 py-3.5 text-center">
                      <span className="text-white font-bold">{tables} tables</span>
                    </td>
                  );
                })}
              </tr>

              {/* Word Count Depth */}
              <tr className="hover:bg-[#111514]/30 transition-colors">
                <td className="px-5 py-3.5 font-sans">
                  <span className="text-white font-medium">Content Depth (Word Count)</span>
                  <p className="text-[10px] text-[#878787] font-sans">Clean markdown text parsed by AI agents</p>
                </td>
                {reports.map((r) => {
                  const words = r.liveMetadata?.wordCount ?? (r.overallGeoScore * 28);
                  return (
                    <td key={r.domain} className="px-4 py-3.5 text-center">
                      <span className="text-white font-bold">{words.toLocaleString()} words</span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Strategic Overtake Playbook */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B8A04A]" />
          <h3 className="text-sm font-bold text-white">Strategic Overtake Playbook</h3>
        </div>
        <p className="text-xs text-[#878787]">
          Automated gap intelligence: specific high-leverage actions trailing competitors need to close the authority gap against <strong className="text-white font-mono">{leader.domain}</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {reports
            .filter((r) => r.domain !== leader.domain)
            .map((r) => {
              const delta = leader.overallGeoScore - r.overallGeoScore;
              const hasLlms = r.agentProtocols?.hasLlmsTxt ?? false;
              const leaderHasLlms = leader.agentProtocols?.hasLlmsTxt ?? false;
              const missingSchema = (r.liveMetadata?.schemaJsonLdCount ?? 2) < (leader.liveMetadata?.schemaJsonLdCount ?? 3);
              const missingTables = (r.liveMetadata?.tableCount ?? 1) < (leader.liveMetadata?.tableCount ?? 3);

              return (
                <div
                  key={r.domain}
                  className="rounded-xl p-4 bg-[#111514] border border-[#222A28] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white font-mono">{r.domain}</span>
                    <span className="text-xs text-[#B8A04A] font-mono font-semibold">
                      -{delta} pts vs {leader.domain}
                    </span>
                  </div>

                  <ul className="text-xs text-[#BBBFBF] space-y-2">
                    {!hasLlms && (
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#05AD98] mt-1.5 shrink-0" />
                        <span>
                          <strong>Publish /llms.txt:</strong> Provide curated markdown boundaries so ChatGPT and Perplexity extract your core value proposition directly.
                        </span>
                      </li>
                    )}
                    {missingSchema && (
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#05AD98] mt-1.5 shrink-0" />
                        <span>
                          <strong>Expand JSON-LD Schemas:</strong> Add structured Dataset or FAQPage markup to elevate entity confidence score.
                        </span>
                      </li>
                    )}
                    {missingTables && (
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#05AD98] mt-1.5 shrink-0" />
                        <span>
                          <strong>Embed Empirical Comparison Tables:</strong> Incorporate structured benchmark tables on high-traffic landing pages.
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#05AD98] mt-1.5 shrink-0" />
                      <span>
                        <strong>Zero-Click Resilience:</strong> Add direct numerical benchmarks so generative engines reference you as the primary source.
                      </span>
                    </li>
                  </ul>

                  {/* Locked preview for free users */}
                  {isFree && (
                    <div className="rounded-xl p-3 bg-[#0C1010] border border-[#222A28] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-white font-semibold">
                          <Lock className="w-3.5 h-3.5 text-[#B8A04A]" />
                          <span>Directives 3 to 6 Locked</span>
                        </div>
                        <p className="text-[11px] text-[#878787]">
                          Unlock vector graph schemas, entity disambiguation tags, and empirical proof steps.
                        </p>
                      </div>
                      <button
                        onClick={() => onTriggerUpgrade?.('Unlock the full 6-step competitive overtake playbook with Pro.')}
                        className="px-3 py-1.5 rounded-lg bg-[#05AD98] hover:bg-[#038a79] text-white font-bold text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0"
                      >
                        Unlock with Pro
                      </button>
                    </div>
                  )}

                  {onRescanDomain && (
                    <div className="pt-2 border-t border-[#222A28] flex justify-end">
                      <button
                        onClick={() => {
                          if (isFree) {
                            onTriggerUpgrade?.('Live foundation engine re-probing requires a Pro subscription.');
                            return;
                          }
                          onRescanDomain(r.domain);
                        }}
                        disabled={rescanningDomain === r.domain}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A2220] hover:bg-[#222A28] text-slate-200 border border-[#222A28] hover:border-[#05AD98] text-[11px] font-semibold transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {isFree ? (
                          <Lock className="w-3 h-3 text-[#B8A04A]" />
                        ) : (
                          <RefreshCw className={`w-3 h-3 text-[#05AD98] ${rescanningDomain === r.domain ? 'animate-spin' : ''}`} />
                        )}
                        <span>{rescanningDomain === r.domain ? 'Re-scanning...' : `Re-scan ${r.domain} ${isFree ? '(Pro)' : ''}`}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
