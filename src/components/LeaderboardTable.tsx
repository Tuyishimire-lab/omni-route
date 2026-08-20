'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart2, TrendingUp, TrendingDown, Minus, Search, ArrowRight, Crown } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  domain: string;
  category: string;
  geoScore: number;
  citationWinRate: number;
  zeroClickResilience: number;
  agentNodes: number;
  trend: 'up' | 'down' | 'flat';
  trendDelta: number;
}

const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { rank: 1, domain: 'openai.com', category: 'AI/Tech', geoScore: 97, citationWinRate: 96, zeroClickResilience: 94, agentNodes: 4820, trend: 'up', trendDelta: 3 },
  { rank: 2, domain: 'stripe.com', category: 'Fintech', geoScore: 91, citationWinRate: 92, zeroClickResilience: 88, agentNodes: 3210, trend: 'up', trendDelta: 2 },
  { rank: 3, domain: 'vercel.com', category: 'SaaS/Infra', geoScore: 89, citationWinRate: 87, zeroClickResilience: 85, agentNodes: 2940, trend: 'up', trendDelta: 5 },
  { rank: 4, domain: 'anthropic.com', category: 'AI/Tech', geoScore: 88, citationWinRate: 91, zeroClickResilience: 86, agentNodes: 2760, trend: 'flat', trendDelta: 0 },
  { rank: 5, domain: 'linear.app', category: 'SaaS/Tools', geoScore: 85, citationWinRate: 84, zeroClickResilience: 82, agentNodes: 2200, trend: 'up', trendDelta: 4 },
  { rank: 6, domain: 'notion.so', category: 'SaaS/Tools', geoScore: 83, citationWinRate: 82, zeroClickResilience: 79, agentNodes: 2050, trend: 'down', trendDelta: -2 },
  { rank: 7, domain: 'github.com', category: 'Developer', geoScore: 82, citationWinRate: 85, zeroClickResilience: 80, agentNodes: 1980, trend: 'flat', trendDelta: 0 },
  { rank: 8, domain: 'shopify.com', category: 'E-Commerce', geoScore: 80, citationWinRate: 79, zeroClickResilience: 76, agentNodes: 1820, trend: 'down', trendDelta: -1 },
  { rank: 9, domain: 'figma.com', category: 'SaaS/Design', geoScore: 79, citationWinRate: 78, zeroClickResilience: 75, agentNodes: 1640, trend: 'up', trendDelta: 2 },
  { rank: 10, domain: 'brex.com', category: 'Fintech', geoScore: 77, citationWinRate: 76, zeroClickResilience: 73, agentNodes: 1520, trend: 'up', trendDelta: 6 },
  { rank: 11, domain: 'airtable.com', category: 'SaaS/Tools', geoScore: 74, citationWinRate: 73, zeroClickResilience: 70, agentNodes: 1310, trend: 'flat', trendDelta: 0 },
  { rank: 12, domain: 'framer.com', category: 'SaaS/Design', geoScore: 72, citationWinRate: 71, zeroClickResilience: 68, agentNodes: 1180, trend: 'up', trendDelta: 3 },
  { rank: 13, domain: 'mercury.com', category: 'Fintech', geoScore: 70, citationWinRate: 69, zeroClickResilience: 67, agentNodes: 1060, trend: 'down', trendDelta: -2 },
  { rank: 14, domain: 'supabase.com', category: 'Developer', geoScore: 69, citationWinRate: 70, zeroClickResilience: 65, agentNodes: 990, trend: 'up', trendDelta: 7 },
  { rank: 15, domain: 'webflow.com', category: 'SaaS/Design', geoScore: 67, citationWinRate: 66, zeroClickResilience: 63, agentNodes: 870, trend: 'flat', trendDelta: 0 },
  { rank: 16, domain: 'loom.com', category: 'SaaS/Tools', geoScore: 64, citationWinRate: 62, zeroClickResilience: 60, agentNodes: 740, trend: 'down', trendDelta: -3 },
  { rank: 17, domain: 'intercom.com', category: 'SaaS/Tools', geoScore: 62, citationWinRate: 61, zeroClickResilience: 59, agentNodes: 680, trend: 'up', trendDelta: 1 },
  { rank: 18, domain: 'klaviyo.com', category: 'E-Commerce', geoScore: 60, citationWinRate: 59, zeroClickResilience: 57, agentNodes: 610, trend: 'flat', trendDelta: 0 },
  { rank: 19, domain: 'cal.com', category: 'Developer', geoScore: 57, citationWinRate: 56, zeroClickResilience: 53, agentNodes: 490, trend: 'up', trendDelta: 4 },
  { rank: 20, domain: 'dub.co', category: 'Developer', geoScore: 54, citationWinRate: 53, zeroClickResilience: 50, agentNodes: 380, trend: 'up', trendDelta: 8 }
];

const CATEGORIES = ['All', 'AI/Tech', 'Fintech', 'SaaS/Tools', 'SaaS/Infra', 'SaaS/Design', 'Developer', 'E-Commerce'];

function getScoreBarColor(score: number) {
  if (score >= 85) return 'from-[#05AD98] to-emerald-400';
  if (score >= 70) return 'from-[#05AD98] to-[#05AD98]';
  if (score >= 55) return 'from-amber-500 to-amber-400';
  return 'from-rose-500 to-rose-400';
}

function getRankStyle(rank: number) {
  if (rank === 1) return 'text-[#B8A04A] font-black';
  if (rank === 2) return 'text-[#BBBFBF] font-black';
  if (rank === 3) return 'text-amber-600 font-black';
  return 'text-[#878787] font-bold';
}

export default function LeaderboardTable() {
  const [activeCategory, setActiveCategory] = React.useState('All');

  const filtered = activeCategory === 'All'
    ? LEADERBOARD_DATA
    : LEADERBOARD_DATA.filter(e => e.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              activeCategory === cat
                ? 'bg-[rgba(5,173,152,0.20)] text-[#05AD98] border-[rgba(5,173,152,0.4)]'
                : 'bg-[#111514] text-[#878787] border-[rgba(187,191,191,0.10)] hover:text-white hover:border-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        {/* Table Head */}
        <div className="grid grid-cols-[48px_1fr_80px_120px_80px] sm:grid-cols-[56px_1fr_96px_160px_80px_80px] gap-x-2 px-5 py-3 border-b border-[rgba(187,191,191,0.10)] bg-[#111514]/60 text-[10px] text-[#878787] uppercase tracking-wider font-semibold">
          <span className="text-center">#</span>
          <span>Domain</span>
          <span className="text-center">GEO Score</span>
          <span className="text-center hidden sm:block">Score Bar</span>
          <span className="text-center hidden sm:block">Citation %</span>
          <span className="text-center">Trend</span>
        </div>

        {/* Rows */}
        {filtered.map((entry) => (
          <div
            key={entry.domain}
            className="grid grid-cols-[48px_1fr_80px_80px] sm:grid-cols-[56px_1fr_96px_160px_80px_80px] gap-x-2 px-5 py-3.5 border-b border-[rgba(187,191,191,0.10)]/60 hover:bg-[#111514]/30 transition-colors items-center"
          >
            {/* Rank */}
            <div className="text-center">
              {entry.rank <= 3 ? (
                <Crown className={`w-4 h-4 mx-auto ${entry.rank === 1 ? 'text-[#B8A04A]' : entry.rank === 2 ? 'text-[#BBBFBF]' : 'text-amber-600'}`} />
              ) : (
                <span className={`text-sm font-mono ${getRankStyle(entry.rank)}`}>{entry.rank}</span>
              )}
            </div>

            {/* Domain Info */}
            <div className="min-w-0">
              <p className="text-sm font-bold text-white font-mono truncate">{entry.domain}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A2020] text-[#878787] border border-[rgba(187,191,191,0.12)] font-medium">{entry.category}</span>
            </div>

            {/* GEO Score */}
            <div className="text-center">
              <span className={`text-base font-extrabold font-mono ${entry.geoScore >= 85 ? 'text-[#05AD98]' : entry.geoScore >= 70 ? 'text-[#05AD98]' : 'text-[#B8A04A]'}`}>
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

            {/* Trend */}
            <div className="flex items-center justify-center gap-1">
              {entry.trend === 'up' && (
                <span className="flex items-center gap-0.5 text-[#05AD98] text-[11px] font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />+{entry.trendDelta}
                </span>
              )}
              {entry.trend === 'down' && (
                <span className="flex items-center gap-0.5 text-rose-400 text-[11px] font-bold">
                  <TrendingDown className="w-3.5 h-3.5" />{entry.trendDelta}
                </span>
              )}
              {entry.trend === 'flat' && (
                <span className="flex items-center gap-0.5 text-[#878787] text-[11px]">
                  <Minus className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/audit"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold shadow-lg shadow-[rgba(5,173,152,0.20)] transition-all"
        >
          <Search className="w-4 h-4" /> Submit My Domain for Ranking
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
