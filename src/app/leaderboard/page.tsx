import React from 'react';
import LeaderboardTable from '../../components/LeaderboardTable';
import { BarChart2, Activity, Globe, Zap, Clock } from 'lucide-react';
import { getGlobalStats, getLeaderboard } from '../../lib/db';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GEO Leaderboard | OmniRoute - Top AI Citation Authority Rankings',
  description: 'Live community rankings of the most GEO-optimized domains across AI citation engines. See who dominates Perplexity, ChatGPT, Claude, and Gemini.'
};

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  let stats = { domainsRanked: 48, avgGeoIndex: 87, totalScans: 48 };
  let initialEntries: Array<{
    rank: number;
    domain: string;
    category: string;
    geoScore: number;
    citationWinRate: number;
    zeroClickResilience: number;
    trend: 'up' | 'down' | 'flat';
    trendDelta: number;
    scanCount: number;
  }> = [];

  try {
    const [fetchedStats, fetchedEntries] = await Promise.all([
      getGlobalStats(),
      getLeaderboard('All')
    ]);
    if (fetchedStats.domainsRanked > 0) {
      stats = fetchedStats;
    }
    if (fetchedEntries && fetchedEntries.length > 0) {
      initialEntries = fetchedEntries;
    }
  } catch (e) {
    console.warn('Could not fetch server-side stats from DB:', e);
  }

  const dynamicStats = [
    { label: 'Domains Ranked in Turso', value: `${stats.domainsRanked}+`, icon: Globe, color: 'text-[#05AD98]' },
    { label: 'Avg Network GEO Index', value: `${stats.avgGeoIndex || 87.2}`, icon: Activity, color: 'text-[#05AD98]' },
    { label: 'Historical Scans Indexed', value: `${stats.totalScans || 48}+`, icon: BarChart2, color: 'text-[#B8A04A]' }
  ];

  return (
    <div className="min-h-screen bg-omni-mesh">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold">
            <BarChart2 className="w-3.5 h-3.5" />
            Global GEO Authority Rankings
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            GEO <span className="text-gradient">Leaderboard</span>
          </h1>
          <p className="text-sm text-[#878787] leading-relaxed">
            Live rankings of top global tech domains evaluated across generative search engines (Perplexity, ChatGPT Search, Claude, and Gemini Grounding).
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-[#878787]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Turso Cloud Sync
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#B8A04A]" />
              Auto-rescanned daily via Vercel Cron
            </span>
          </div>
        </div>

        {/* Global Dynamic Stats */}
        <div className="grid grid-cols-3 gap-4">
          {dynamicStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-panel rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] text-center">
                <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                <p className={`text-xl sm:text-2xl font-extrabold font-mono ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-[#878787] mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Dynamic Leaderboard Table */}
        <LeaderboardTable initialEntries={initialEntries} />

      </div>
    </div>
  );
}
