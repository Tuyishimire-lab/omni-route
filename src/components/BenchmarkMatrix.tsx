'use client';

import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart2, ArrowUp } from 'lucide-react';
import { GeoAuditReport } from '../lib/types';

interface BenchmarkMatrixProps {
  reports: GeoAuditReport[];
}

const DOMAIN_COLORS = [
  { stroke: '#05AD98', fill: '#05AD98', bg: 'bg-[#05AD98]' },
  { stroke: '#BBBFBF', fill: '#BBBFBF', bg: 'bg-[#BBBFBF]' },
  { stroke: '#B8A04A', fill: '#B8A04A', bg: 'bg-[#B8A04A]' },
  { stroke: '#6ee7b7', fill: '#6ee7b7', bg: 'bg-emerald-300' },
  { stroke: '#94a3b8', fill: '#94a3b8', bg: 'bg-slate-400' }
];

const METRICS = [
  { key: 'overallGeoScore', label: 'GEO Index', radarLabel: 'GEO\nIndex' },
  { key: 'zeroClickResilience', label: 'Zero-Click Resilience', radarLabel: 'Zero-Click' },
  { key: 'informationGainScore', label: 'Information Gain', radarLabel: 'Info Gain' },
  { key: 'entityDisambiguationScore', label: 'Entity Grounding', radarLabel: 'Entity' },
  { key: 'vectorReadinessScore', label: 'Vector Readiness', radarLabel: 'Vector' }
];

function getScoreColor(score: number) {
  if (score >= 80) return 'text-[#05AD98]';
  if (score >= 60) return 'text-[#B8A04A]';
  return 'text-rose-400';
}

function getWinnerIdx(reports: GeoAuditReport[], key: keyof GeoAuditReport): number {
  let best = -1;
  let bestVal = -1;
  reports.forEach((r, i) => {
    const val = r[key] as number;
    if (val > bestVal) { bestVal = val; best = i; }
  });
  return best;
}

export default function BenchmarkMatrix({ reports }: BenchmarkMatrixProps) {
  const radarData = useMemo(() => {
    return METRICS.map((m) => {
      const entry: Record<string, string | number> = { metric: m.radarLabel };
      reports.forEach((r) => {
        entry[r.domain] = r[m.key as keyof GeoAuditReport] as number;
      });
      return entry;
    });
  }, [reports]);

  const avgCitationByDomain = (r: GeoAuditReport) =>
    Math.round(r.engineBreakdown.reduce((sum, e) => sum + e.citationProbability, 0) / (r.engineBreakdown.length || 1));

  return (
    <div className="space-y-8">
      {/* Radar Chart */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[rgba(187,191,191,0.10)]">
        <h3 className="text-sm font-bold text-white mb-1">Multi-Dimensional Authority Radar</h3>
        <p className="text-xs text-[#878787] mb-5">GEO sub-metric competitive positioning across all dimensions.</p>
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#334155" strokeOpacity={0.6} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
              />
              {reports.map((r, i) => (
                <Radar
                  key={r.domain}
                  name={r.domain}
                  dataKey={r.domain}
                  stroke={DOMAIN_COLORS[i]?.stroke || '#fff'}
                  fill={DOMAIN_COLORS[i]?.fill || '#fff'}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: DOMAIN_COLORS[i]?.stroke }}
                />
              ))}
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9', fontSize: 12 }}
                itemStyle={{ color: '#f1f5f9' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-x-auto">
        <div className="p-5 sm:p-6 border-b border-[rgba(187,191,191,0.10)]">
          <h3 className="text-sm font-bold text-white">Head-to-Head Metric Matrix</h3>
          <p className="text-xs text-[#878787] mt-0.5">Winner badge shown per dimension</p>
        </div>
        <table className="w-full text-xs min-w-[540px]">
          <thead>
            <tr className="border-b border-[rgba(187,191,191,0.10)]">
              <th className="text-left px-5 py-3 text-[#878787] font-semibold uppercase tracking-wider text-[10px] w-44">Metric</th>
              {reports.map((r, i) => (
                <th key={r.domain} className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${DOMAIN_COLORS[i]?.bg || 'bg-white'}`} />
                    <span className="text-white font-bold font-mono truncate max-w-[100px]">{r.domain}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const winnerIdx = getWinnerIdx(reports, m.key as keyof GeoAuditReport);
              return (
                <tr key={m.key} className="border-b border-[rgba(187,191,191,0.10)]/60 hover:bg-[#111514]/30 transition-colors">
                  <td className="px-5 py-3.5 text-[#BBBFBF] font-medium">{m.label}</td>
                  {reports.map((r, i) => {
                    const val = r[m.key as keyof GeoAuditReport] as number;
                    const isWinner = i === winnerIdx;
                    return (
                      <td key={r.domain} className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-lg font-extrabold font-mono ${getScoreColor(val)}`}>{val}</span>
                          {isWinner && (
                            <span className="flex items-center gap-0.5 text-[#B8A04A] text-[10px] font-bold">
                              <BarChart2 className="w-3 h-3" /> Winner
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Citation row */}
            <tr className="border-b border-[rgba(187,191,191,0.10)]/60 hover:bg-[#111514]/30 transition-colors">
              <td className="px-5 py-3.5 text-[#BBBFBF] font-medium">Avg Citation Probability</td>
              {reports.map((r, i) => {
                const val = avgCitationByDomain(r);
                return (
                  <td key={r.domain} className="px-4 py-3.5 text-center">
                    <span className={`text-lg font-extrabold font-mono ${getScoreColor(val)}`}>{val}%</span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Winner Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Overall GEO Leader', key: 'overallGeoScore' },
          { label: 'Zero-Click Champion', key: 'zeroClickResilience' },
          { label: 'Most Entity-Grounded', key: 'entityDisambiguationScore' }
        ].map(({ label, key }) => {
          const winnerIdx = getWinnerIdx(reports, key as keyof GeoAuditReport);
          const winner = reports[winnerIdx];
          if (!winner) return null;
          return (
            <div key={key} className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 text-center space-y-1">
              <ArrowUp className="w-4 h-4 text-[#B8A04A] mx-auto" />
              <p className="text-[10px] uppercase tracking-widest text-amber-300/70 font-semibold">{label}</p>
              <p className="text-base font-extrabold text-white font-mono">{winner.domain}</p>
              <p className={`text-xl font-black font-mono ${getScoreColor(winner[key as keyof GeoAuditReport] as number)}`}>
                {winner[key as keyof GeoAuditReport] as number}
                <span className="text-xs text-[#878787] font-sans"> /100</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
