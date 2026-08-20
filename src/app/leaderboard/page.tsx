import React from 'react';
import LeaderboardTable from '../../components/LeaderboardTable';
import { BarChart2, Activity, Globe } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GEO Leaderboard | OmniRoute - Top AI Citation Authority Rankings',
  description: 'Live community rankings of the most GEO-optimized domains across AI citation engines. See who dominates Perplexity, ChatGPT, Claude, and Gemini.'
};

const GLOBAL_STATS = [
  { label: 'Domains Ranked', value: '20,000+', icon: Globe, color: 'text-[#05AD98]' },
  { label: 'Avg GEO Index', value: '68.4', icon: Activity, color: 'text-[#05AD98]' },
  { label: 'Citation Events Today', value: '2.4M', icon: BarChart2, color: 'text-[#B8A04A]' }
];

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen bg-omni-mesh">
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
            Live community ranking of the most AI-citation-optimized domains on the planet. Updated continuously as scans complete.
          </p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-3 gap-4">
          {GLOBAL_STATS.map((stat) => {
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

        {/* Leaderboard */}
        <LeaderboardTable />

      </div>
    </main>
  );
}
