'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ArrowRight,
  Crown,
  RefreshCw,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import Sparkline from './Sparkline';

import { DEFAULT_LEADERBOARD_ENTRIES, LeaderboardEntry } from '../lib/defaultLeaderboard';

export type { LeaderboardEntry };

const CATEGORIES = ['All', 'AI/Tech', 'Fintech', 'SaaS/Tools', 'SaaS/Design', 'Developer', 'E-Commerce'];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return '-';
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getScoreBarColor(score: number) {
  if (score >= 90) return 'bg-[#05AD98]';
  if (score >= 75) return 'bg-[#05AD98]';
  if (score >= 60) return 'bg-[#B8A04A]';
  return 'bg-[#A04040]';
}

function getRankStyle(rank: number) {
  if (rank === 1) return 'text-[#B8A04A] font-black';
  if (rank === 2) return 'text-[#BBBFBF] font-black';
  if (rank === 3) return 'text-amber-600 font-black';
  return 'text-[#878787] font-bold';
}

function getPaginationRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', total];
  }
  if (current >= total - 3) {
    return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

export default function LeaderboardTable({
  initialEntries = [],
  onStatsUpdate,
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
  const [isDefaultData, setIsDefaultData] = useState(
    !initialEntries || initialEntries.length === 0
  );
  const [historyMap, setHistoryMap] = useState<Record<string, { date: string; score: number }[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const tableTopRef = useRef<HTMLDivElement>(null);

  // Sync initialEntries if provided
  useEffect(() => {
    if (initialEntries && initialEntries.length > 0 && entries.length === 0) {
      const t = setTimeout(() => setEntries(initialEntries), 0);
      return () => clearTimeout(t);
    }
  }, [initialEntries, entries.length]);

  // Reset to first page when changing category or search query
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, pageSize]);

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
            setIsDefaultData(json.entries.length === 0);
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
    return () => {
      isMounted = false;
    };
  }, [activeCategory, onStatsUpdate]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((e) => e.domain.toLowerCase().includes(query));
  }, [entries, searchQuery]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);
  const paginatedEntries = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  // Batch fetch sparkline history for currently visible domains
  useEffect(() => {
    const unvisited = paginatedEntries
      .map((e) => e.domain)
      .filter((d) => !historyMap[d]);
    if (unvisited.length === 0) return;

    const chunk = unvisited.slice(0, 50);
    fetch(`/api/v1/leaderboard/history?domains=${encodeURIComponent(chunk.join(','))}&days=14`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.history) {
          setHistoryMap((prev) => ({ ...prev, ...data.history }));
        }
      })
      .catch(() => {});
  }, [paginatedEntries, historyMap]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (tableTopRef.current) {
      tableTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const paginationRange = getPaginationRange(safePage, totalPages);

  return (
    <div ref={tableTopRef} className="space-y-6">
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

      {/* Sample data notice */}
      {isDefaultData && !isLoading && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs bg-amber-500/8 border border-amber-500/20 text-amber-300">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Sample data</strong>: showing representative benchmark domains while live rankings load.
            Rankings update automatically as live audits complete.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        {/* Table Head */}
        <div className="grid grid-cols-[38px_1fr_64px_54px] sm:grid-cols-[56px_1fr_96px_130px_80px_120px_80px_80px] gap-x-2 px-3.5 sm:px-5 py-3 border-b border-[rgba(187,191,191,0.10)] bg-[#111514]/60 text-[10px] text-[#878787] uppercase tracking-wider font-semibold">
          <span className="text-center">#</span>
          <span>Domain</span>
          <span className="text-center">GEO Score</span>
          <span className="text-center hidden sm:block">Score Bar</span>
          <span className="text-center hidden sm:block">Citation Win</span>
          <span className="text-center hidden sm:block">History</span>
          <span className="text-center hidden sm:block">Scanned</span>
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
            <Link href="/audit" className="text-[#05AD98] hover:underline font-semibold">
              Scan and add a new domain
            </Link>
          </div>
        )}

        {/* Rows */}
        {!isLoading &&
          paginatedEntries.map((entry, idx) => {
            const globalRank = entry.rank || (startIndex + idx + 1);

            return (
              <div
                key={entry.domain}
                className="grid grid-cols-[38px_1fr_64px_54px] sm:grid-cols-[56px_1fr_96px_130px_80px_120px_80px_80px] gap-x-2 px-3.5 sm:px-5 py-3.5 border-b border-[rgba(187,191,191,0.10)]/60 hover:bg-[#111514]/30 transition-colors items-center group"
              >
                {/* Rank */}
                <div className="text-center">
                  {globalRank <= 3 ? (
                    <Crown
                      className={`w-4 h-4 mx-auto ${
                        globalRank === 1 ? 'text-[#B8A04A]' : globalRank === 2 ? 'text-[#BBBFBF]' : 'text-amber-600'
                      }`}
                    />
                  ) : (
                    <span className={`text-sm font-mono ${getRankStyle(globalRank)}`}>{globalRank}</span>
                  )}
                </div>

                {/* Domain Info */}
                <div className="min-w-0 flex items-center justify-between pr-2">
                  <div className="truncate flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/audit?url=${encodeURIComponent(entry.domain)}`}
                      className="text-sm font-bold text-white font-mono truncate hover:text-[#05AD98] transition-colors flex items-center gap-1"
                    >
                      {entry.domain}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#05AD98]" />
                    </Link>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A2020] text-[#878787] border border-[rgba(187,191,191,0.12)] font-medium">
                      {entry.category}
                    </span>
                    {entry.isLiveScanned !== undefined && (
                      <span
                        title={
                          entry.isLiveScanned
                            ? 'Score from a live crawl of the site'
                            : 'Estimated score: site could not be live-crawled'
                        }
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
                  <span
                    className={`text-base font-extrabold font-mono ${
                      entry.geoScore >= 90
                        ? 'text-[#05AD98]'
                        : entry.geoScore >= 75
                        ? 'text-[#05AD98]'
                        : 'text-[#B8A04A]'
                    }`}
                  >
                    {entry.geoScore}
                  </span>
                </div>

                {/* Score Bar (hidden on mobile) */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[#1A2020] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getScoreBarColor(entry.geoScore)} transition-all duration-700`}
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

                {/* Last Scanned (hidden on mobile) */}
                <div className="hidden sm:flex items-center justify-center">
                  <span className="text-[10px] text-[#878787] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(entry.lastScanned)}
                  </span>
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
                      <Minus className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalFiltered > 0 && (
        <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Summary */}
          <div className="text-[#878787] font-mono text-center sm:text-left">
            Showing <span className="text-white font-semibold">{startIndex + 1}</span> to{' '}
            <span className="text-white font-semibold">{endIndex}</span> of{' '}
            <span className="text-[#05AD98] font-bold">{totalFiltered}</span> domains
            {searchQuery.trim() && (
              <span className="text-[#878787] ml-1">
                (filtered from {entries.length})
              </span>
            )}
          </div>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-[#878787] font-mono">
              <span className="hidden md:inline">Per page:</span>
              <div className="flex items-center gap-1 bg-[#111514] p-1 rounded-xl border border-[rgba(187,191,191,0.10)]">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                      pageSize === size
                        ? 'bg-[#05AD98] text-white'
                        : 'text-[#878787] hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={safePage === 1}
                title="First Page"
                className="p-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white hover:border-[#222A28] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                title="Previous Page"
                className="p-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white hover:border-[#222A28] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Number Chips */}
              <div className="hidden sm:flex items-center gap-1">
                {paginationRange.map((item, i) => {
                  if (item === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${i}`} className="px-2 text-[#878787] font-mono">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = item === safePage;
                  return (
                    <button
                      key={`page-${item}`}
                      onClick={() => handlePageChange(item)}
                      className={`min-w-7 h-7 px-2 rounded-lg font-mono text-xs font-semibold transition-all border ${
                        isCurrent
                          ? 'bg-[#05AD98] text-white border-[#05AD98]'
                          : 'bg-[#111514] text-[#878787] border-[rgba(187,191,191,0.10)] hover:text-white hover:border-[#222A28]'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Page Indicator */}
              <span className="sm:hidden px-2 text-xs font-mono text-slate-300">
                {safePage} / {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                title="Next Page"
                className="p-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white hover:border-[#222A28] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={safePage === totalPages}
                title="Last Page"
                className="p-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white hover:border-[#222A28] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA Bottom Bar */}
      <div className="text-center space-y-3">
        <Link
          href="/audit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#05AD98] hover:bg-[#038a79] text-white text-sm font-bold shadow-lg shadow-[rgba(5,173,152,0.25)] transition-all transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4 text-emerald-300" />
          Audit & Add My Domain to Leaderboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
