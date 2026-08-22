import Link from 'next/link';
import { getDomainAnalytics } from '../../../lib/db';
import { Activity, Bot, TrendingUp, TrendingDown, Radar, ArrowLeft, ScanSearch, ExternalLink } from 'lucide-react';
import Sparkline from '../../../components/Sparkline';
import GeoBadge from '../../../components/GeoBadge';

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  OPTIMAL: 'bg-[rgba(5,173,152,0.15)] text-[#05AD98] border-[rgba(5,173,152,0.25)]',
  MODERATE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  AT_RISK: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default async function DomainAnalyticsPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: rawDomain } = await params;
  const analytics = await getDomainAnalytics(decodeURIComponent(rawDomain));

  if (!analytics) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
        <Radar className="w-10 h-10 text-[#878787] mx-auto" />
        <h1 className="text-xl font-bold text-white">No data for &ldquo;{decodeURIComponent(rawDomain)}&rdquo;</h1>
        <p className="text-sm text-[#878787]">
          Run a GEO audit first to register this domain, then agent traffic will appear here.
        </p>
        <Link
          href={`/audit?url=${encodeURIComponent(decodeURIComponent(rawDomain))}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#05AD98] text-black text-sm font-bold hover:bg-[#04c9af] transition-colors"
        >
          <ScanSearch className="w-4 h-4" /> Run GEO Audit
        </Link>
      </div>
    );
  }

  const TrendIcon = analytics.trend === 'up' ? TrendingUp : analytics.trend === 'down' ? TrendingDown : Activity;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/analytics" className="text-xs text-[#878787] hover:text-white inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> All Analytics
          </Link>
          <h1 className="text-2xl font-bold text-white font-mono">{analytics.domain}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[analytics.status] ?? statusColors.MODERATE}`}>
              {analytics.status}
            </span>
            <span className="text-xs text-[#878787] flex items-center gap-1">
              <TrendIcon className={`w-3.5 h-3.5 ${analytics.trend === 'down' ? 'text-rose-400' : 'text-[#05AD98]'}`} />
              {analytics.trendDelta > 0 ? '+' : ''}{analytics.trendDelta} pts · scanned {analytics.scanCount}×
            </span>
            <a
              href={`https://${analytics.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#05AD98] hover:underline inline-flex items-center gap-1"
            >
              visit <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Sparkline data={analytics.scoreHistory} width={160} height={48} />
          <div className="text-right">
            <div className="text-3xl font-bold text-white font-mono">{analytics.geoScore}</div>
            <div className="text-[10px] uppercase tracking-wide text-[#878787]">GEO Score</div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-[#05AD98]" />
            <span className="text-xs text-[#878787]">Agent Hits (7d)</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{analytics.totalAgentHits7d}</div>
          <p className="text-[11px] text-[#878787] mt-1">AI crawlers, agents & referrals recorded by your snippet</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Radar className="w-4 h-4 text-[#05AD98]" />
            <span className="text-xs text-[#878787]">Crawler / Agent Activity (7d)</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{analytics.crawledByAgents7d}</div>
          <p className="text-[11px] text-[#878787] mt-1">Indexing pings + autonomous agent transactions</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#05AD98]" />
            <span className="text-xs text-[#878787]">Answer-Engine Referrals (7d)</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {analytics.referralsByEngine.reduce((s, r) => s + r.count, 0)}
          </div>
          <p className="text-[11px] text-[#878787] mt-1">Visits arriving from AI answers</p>
        </div>
      </div>

      {/* Agent breakdown */}
      <div className="glass-panel rounded-3xl p-6 border border-[rgba(187,191,191,0.10)]">
        <h2 className="text-sm font-bold text-white mb-4">Which AI Agents Are Hitting You</h2>
        {analytics.agentHits.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <Bot className="w-8 h-8 text-[#878787] mx-auto" />
            <p className="text-sm text-[#BBBFBF] font-semibold">No agent traffic recorded yet</p>
            <p className="text-xs text-[#878787] max-w-md mx-auto">
              Install the OmniRoute tracking snippet on your site to start capturing AI crawler visits,
              autonomous agents, and answer-engine referrals in real time.
            </p>
            <code className="block text-left text-[11px] bg-[#111514] border border-[rgba(187,191,191,0.10)] rounded-xl p-4 font-mono text-[#05AD98] overflow-x-auto max-w-2xl mx-auto mt-3">
              {`<script async src="%ORIGIN%/api/v1/track.js"\n        data-omniroute-endpoint="%ORIGIN%"></script>`}
            </code>
          </div>
        ) : (
          <div className="space-y-2">
            {analytics.agentHits.map((hit) => {
              const maxHits = analytics.agentHits[0].hits || 1;
              return (
                <div key={hit.agentName} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-xs font-mono text-[#BBBFBF]">{hit.agentName}</span>
                  <div className="flex-1 h-5 rounded-lg bg-[#111514] overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-[#05AD98]/60 to-[#05AD98]/25"
                      style={{ width: `${Math.max(6, (hit.hits / maxHits) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-mono text-white">{hit.hits}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Referral engines */}
      {analytics.referralsByEngine.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-[rgba(187,191,191,0.10)]">
          <h2 className="text-sm font-bold text-white mb-4">Answer Engines Sending You Traffic</h2>
          <div className="flex flex-wrap gap-2">
            {analytics.referralsByEngine.map((r) => (
              <span key={r.engine} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(5,173,152,0.12)] text-[#05AD98] border border-[rgba(5,173,152,0.25)]">
                {r.engine} · {r.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
