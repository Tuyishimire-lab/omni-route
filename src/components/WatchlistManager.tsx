'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WatchedDomain } from '../lib/types';
import { getWatchedDomains, removeWatchedDomain } from '../lib/storage';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import {
  Bookmark,
  TrendingUp,
  TrendingDown,
  Trash2,
  Search,
  ArrowRight
} from 'lucide-react';

function Sparkline({ data }: { data: { date: string; score: number }[] }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data.map((d) => d.score));
  const max = Math.max(...data.map((d) => d.score));
  const trend = data[data.length - 1].score - data[0].score;
  const strokeColor = trend >= 0 ? '#34d399' : '#f87171';

  return (
    <div className="w-full h-12">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="score"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={true}
          />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: 10,
              padding: '4px 8px',
              color: '#f1f5f9'
            }}
            itemStyle={{ color: strokeColor, fontSize: 10 }}
            labelStyle={{ color: '#64748b', fontSize: 9 }}
            formatter={(value) => [`${(value as number | string) ?? '-'}`, 'GEO'] as [string, string]}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function getStatusBadge(status: WatchedDomain['status']) {
  switch (status) {
    case 'OPTIMAL': return 'bg-[rgba(5,173,152,0.15)] text-[#05AD98] border-[rgba(5,173,152,0.25)]';
    case 'MODERATE': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    default: return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  }
}

export default function WatchlistManager() {
  const [domains, setDomains] = useState<WatchedDomain[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Deferred: localStorage isn't available during SSR, and sync setState
    // in an effect body causes cascading renders.
    const t = setTimeout(() => {
      setIsClient(true);
      setDomains(getWatchedDomains());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const handleRemove = (id: string) => {
    const updated = removeWatchedDomain(id);
    setDomains(updated);
  };

  if (!isClient) return null;

  const optimalCount = domains.filter(d => d.status === 'OPTIMAL').length;
  const atRiskCount = domains.filter(d => d.status === 'AT_RISK').length;
  const avgScore = domains.length > 0
    ? Math.round(domains.reduce((s, d) => s + d.lastGeoScore, 0) / domains.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[rgba(187,191,191,0.10)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
              <Bookmark className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Monitored Domains ({domains.length})</h2>
              <p className="text-[11px] sm:text-xs text-[#878787]">Track historical GEO citation authority across your brand portfolio.</p>
            </div>
          </div>
          <Link
            href="/audit"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-xs font-semibold shadow-md shadow-[rgba(5,173,152,0.20)] self-start sm:self-auto"
          >
            <Search className="w-3.5 h-3.5" /> Scan New Domain
          </Link>
        </div>

        {/* Summary Stats */}
        {domains.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[rgba(187,191,191,0.10)]">
            <div className="text-center">
              <p className="text-xl font-extrabold text-white font-mono">{avgScore}</p>
              <p className="text-[10px] text-[#878787]">Avg GEO Score</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-[#05AD98] font-mono">{optimalCount}</p>
              <p className="text-[10px] text-[#878787]">Optimal Domains</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-rose-400 font-mono">{atRiskCount}</p>
              <p className="text-[10px] text-[#878787]">At Risk</p>
            </div>
          </div>
        )}
      </div>

      {/* Domain Cards */}
      {domains.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-[rgba(187,191,191,0.12)] space-y-3">
          <Bookmark className="w-8 h-8 mx-auto" style={{ color: '#878787' }} />
          <p className="text-sm text-[#878787]">No domains in your watchlist yet.</p>
          <Link href="/audit" className="inline-flex items-center gap-1 text-xs text-[#05AD98] font-semibold hover:underline">
            Scan a domain to add it <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((item) => {
            const scoreDelta = item.previousGeoScore !== undefined
              ? item.lastGeoScore - item.previousGeoScore
              : null;
            return (
              <div key={item.id} className="glass-card rounded-2xl p-5 border border-[rgba(187,191,191,0.10)] space-y-3 group">
                {/* Domain Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <span className="font-bold text-white text-sm block font-mono truncate">{item.domain}</span>
                    <span className="text-[10px] text-[#878787]">Added {item.addedAt}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ml-2 ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                {/* Score Metrics */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-[#111514]/80 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-[#878787] uppercase tracking-wider block">GEO Index</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-extrabold text-white font-mono">{item.lastGeoScore}</span>
                      <span className="text-xs text-[#878787]">/100</span>
                    </div>
                    {scoreDelta !== null && (
                      <span className={`text-[10px] font-semibold flex items-center gap-0.5 mt-0.5 ${scoreDelta >= 0 ? 'text-[#05AD98]' : 'text-rose-400'}`}>
                        {scoreDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-[#111514]/80 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-[#878787] uppercase tracking-wider block">Citation Rate</span>
                    <span className="text-2xl font-extrabold text-[#05AD98] font-mono mt-1 block">{item.citationProbability}%</span>
                    <span className="text-[10px] text-[#878787] block mt-0.5">Perplexity/OAI</span>
                  </div>
                </div>

                {/* Sparkline */}
                {item.scoreHistory && item.scoreHistory.length > 1 && (
                  <div className="pt-1">
                    <p className="text-[10px] text-[#878787] mb-1">7-day GEO trend</p>
                    <Sparkline data={item.scoreHistory} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-xs">
                  <Link
                    href={`/audit?domain=${item.domain}`}
                    className="inline-flex items-center gap-1.5 text-[#05AD98] hover:text-[#05AD98] font-semibold"
                  >
                    <Search className="w-3.5 h-3.5" /> Run Diagnostic
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/badge/${item.domain}`}
                      className="text-[#878787] hover:text-[#BBBFBF] transition-colors text-[10px] font-medium"
                    >
                      Get Badge
                    </Link>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
