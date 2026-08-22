'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Search, ArrowRight, Crown, RefreshCw, Sparkles } from 'lucide-react';
import Sparkline from './Sparkline';

import { DEFAULT_LEADERBOARD_ENTRIES, LeaderboardEntry } from '../lib/defaultLeaderboard';

export type { LeaderboardEntry };

const CATEGORIES = ['All', 'AI/Tech', 'Fintech', 'SaaS/Tools', 'SaaS/Design', 'Developer', 'E-Commerce'];

function getScoreBarColor(score: number) {
  if (score >= 90) return 'from-[#05AD98] to-emerald-400';
  if (score >= 75) return 'from-[#05AD98] to-[#05AD98]';
  if (score >= 60) return 'from-amber-500 to-amber-400';
  return 'from-rose-500 to-rose-400';
}

function getRankStyle(rank: number) {
  if (rank === 1) return 'text-[#B8A04A] font-black';
  if (rank === 2) return 'text-[#BBBFBF] font-black';
  if (rank === 3) return 'text-amber-600 font-black';
  return 'text-[#878787] font-bold';
}

export default function LeaderboardTable({
  initialEntries = [],
  onStatsUpdate
}: {
  initialEntries?: LeaderboardEntry[];
  onStatsUpdate?: (stats: { domainsRanked: number; avgGeoIndex: number; totalScans: number }) => void;
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(
    initialEntries && initialEntries.length > 0 ? initialEntries : DEFAULT_LEADERBOARD_ENTRIES
  );
  const [isLoading, setIsLoading] = useState(false);
  const [historyMap, setHistoryMap] = useState<Record<string, { date: string; score: number }[]>>({});

  // Sync initialEntries if provided — deferred so it doesn't fire synchronously
  // inside the effect body (avoids cascading-render lint error).
  useEffect(() => {
    if (initialEntries && initialEntries.length > 0 && entries.length === 0) {
      const t = setTimeout(() => setEntries(initialEntries), 0);
      return () => clearTimeout(t);
    }
  }, [initialEntries, entries.length]);

  // Fetch live from Turso database via /api/v1/leaderboard
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/leaderboard?category=${encodeURIComponent(activeCategory)}`);
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.entries && Array.isArray(json.entries)) {
            setEntries(json.entries);
            // Fetch sparkline history for all domains in the result
            const domainList = json.entries.map((e: LeaderboardEntry) => e.domain).slice(0, 20);
            if (domainList.length > 0) {
              fetch(`/api/v1/leaderboard/history?domains=${domainList.join(',')}&days=14`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                  if (data?.history && isMounted) setHistoryMap(data.history);
                })
                .catch(() => {});
            }
          }
          if (json.stats && onStatsUpdate) {
            onStatsUpdate(json.stats);
          }
        }
      } catch (e) {
        console.warn('Could not fetch dynamic leaderboard:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [activeCategory, onStatsUpdate]);

  const filtered = entries.filter((e) => {
    const matchesSearch = !searchQuery || e.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeCategory === cat
                  ? 'bg-[rgba(5,173,152,0.20)] text-[#05AD98] border-[rgba(5,173,152,0.4)] shadow-sm'
                  : 'bg-[#111514] text-[#878787] border-[rgba(187,191,191,0.10)] hover:text-white hover:border-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#878787] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111514] border border-[rgba(187,191,191,0.15)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#878787] focus:outline-none focus:border-[#05AD98]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        {/* Table Head */}
        <div className="grid grid-cols-[48px_1fr_80px_120px_80px] sm:grid-cols-[56px_1fr_96px_130px_80px_120px_80px] gap-x-2 px-5 py-3 border-b border-[rgba(187,191,191,0.10)] bg-[#111514]/60 text-[10px] text-[#878787] uppercase tracking-wider font-semibold">
          <span className="text-center">#</span>
          <span>Domain</span>
          <span className="text-center">GEO Score</span>
          <span className="text-center hidden sm:block">Score Bar</span>
          <span className="text-center hidden sm:block">Citation Win</span>
          <span className="text-center hidden sm:block">History</span>
          <span className="text-center">Trend</span>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-8 text-center text-[#878787] flex items-center justify-center gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-[#05AD98]" />
            Loading live verified rankings...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-[#878787] text-xs space-y-2">
            <p>No domains found matching your criteria.</p>
            <Link href="/audit" className="text-[#05AD98] hover:underline font-semibold">Scan and add a new domain →</Link>
          </div>
        )}

        {/* Rows */}
        {!isLoading && filtered.map((entry, idx) => (
          <div
            key={entry.domain}
            className="grid grid-cols-[48px_1fr_80px_120px_80px] sm:grid-cols-[56px_1fr_96px_130px_80px_120px_80px] gap-x-2 px-5 py-3.5 border-b border-[rgba(187,191,191,0.10)]/60 hover:bg-[#111514]/30 transition-colors items-center group"
          >
            {/* Rank */}
            <div className="text-center">
              {idx < 3 ? (
                <Crown className={`w-4 h-4 mx-auto ${idx === 0 ? 'text-[#B8A04A]' : idx === 1 ? 'text-[#BBBFBF]' : 'text-amber-600'}`} />
              ) : (
                <span className={`text-sm font-mono ${getRankStyle(idx + 1)}`}>{idx + 1}</span>
              )}
            </div>

            {/* Domain Info */}
            <div className="min-w-0 flex items-center justify-between pr-2">
              <div className="truncate">
                <Link
                  href={`/audit?url=${encodeURIComponent(entry.domain)}`}
                  className="text-sm font-bold text-white font-mono truncate hover:text-[#05AD98] transition-colors flex items-center gap-1.5"
                >
                  {entry.domain}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#05AD98]" />
                </Link>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A2020] text-[#878787] border border-[rgba(187,191,191,0.12)] font-medium">
                  {entry.category}
                </span>
                {entry.isLiveScanned !== undefined && (
                  <span
                    title={entry.isLiveScanned ? 'Score from a live crawl of the site' : 'Estimated score — site could not be live-crawled'}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${
                      entry.isLiveScanned
                        ? 'bg-[rgba(5,173,152,0.12)] text-[#05AD98] border-[rgba(5,173,152,0.25)]'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}
                  >
                    {entry.isLiveScanned ? 'Live' : 'Est.'}
                  </span>
                )}
              </div>
            </div>

            {/* GEO Score */}
            <div className="text-center">
              <span className={`text-base font-extrabold font-mono ${entry.geoScore >= 90 ? 'text-[#05AD98]' : entry.geoScore >= 75 ? 'text-[#05AD98]' : 'text-[#B8A04A]'}`}>
                {entry.geoScore}
              </span>
            </div>

            {/* Score Bar (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-[#1A2020] overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(entry.geoScore)} transition-all duration-700`}
                  style={{ width: `${entry.geoScore}%` }}
                />
              </div>
              <span className="text-[10px] text-[#878787] font-mono w-8">{entry.geoScore}%</span>
            </div>

            {/* Citation % (hidden on mobile) */}
            <div className="hidden sm:block text-center">
              <span className="text-sm text-[#05AD98] font-mono font-semibold">{entry.citationWinRate}%</span>
            </div>

            {/* Sparkline History (hidden on mobile) */}
            <div className="hidden sm:flex items-center justify-center">
              <Sparkline
                data={historyMap[entry.domain] || []}
                width={110}
                height={28}
                showDots={true}
              />
            </div>

            {/* Trend */}
            <div className="flex items-center justify-center gap-1">
              {entry.trend === 'up' && (
                <span className="flex items-center gap-0.5 text-[#05AD98] text-[11px] font-bold font-mono">
                  <TrendingUp className="w-3.5 h-3.5" />+{entry.trendDelta || 1}
                </span>
              )}
              {entry.trend === 'down' && (
                <span className="flex items-center gap-0.5 text-rose-400 text-[11px] font-bold font-mono">
                  <TrendingDown className="w-3.5 h-3.5" />{entry.trendDelta || -1}
                </span>
              )}
              {entry.trend === 'flat' && (
                <span className="flex items-center gap-0.5 text-[#878787] text-[11px] font-mono">
                  <Minus className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Bottom Bar */}
      <div className="text-center space-y-3">
        <Link
          href="/audit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold shadow-lg shadow-[rgba(5,173,152,0.25)] transition-all transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4 text-emerald-300" />
          Audit & Add My Domain to Leaderboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
