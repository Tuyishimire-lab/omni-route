'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, X, Download, RefreshCw, ExternalLink,
  ChevronLeft, ChevronRight, AlertCircle, Bot, Globe, Shield
} from 'lucide-react';
import { formatTelemetryTimestamp } from '../../lib/timestamp';

interface TelemetryEventItem {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  domain: string;
  destinationUrl: string;
  intent: string;
  geoScoreAtTime: number;
  settlementValue: number | null;
}

interface BotBreakdownItem {
  source: string;
  count: number;
  percentage: number;
}

interface DomainTelemetryStats {
  totalEvents: number;
  uniqueBotsCount: number;
  topBot: string;
  firstSeen: string | null;
  lastSeen: string | null;
  botBreakdown: BotBreakdownItem[];
}

interface SiteTelemetryModalProps {
  domain: string;
  onClose: () => void;
}

export default function SiteTelemetryModal({ domain, onClose }: SiteTelemetryModalProps) {
  const [events, setEvents] = useState<TelemetryEventItem[]>([]);
  const [stats, setStats] = useState<DomainTelemetryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDomainTelemetry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        domain,
        page: page.toString(),
        limit: '30',
      });
      if (selectedBot) params.set('source', selectedBot);
      if (selectedType) params.set('type', selectedType);

      const res = await fetch(`/api/admin/telemetry?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load domain telemetry`);
      const data = await res.json();
      setEvents(data.events || []);
      setStats(data.stats || null);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading site telemetry');
    } finally {
      setLoading(false);
    }
  }, [domain, selectedBot, selectedType, page]);

  useEffect(() => {
    fetchDomainTelemetry();
  }, [fetchDomainTelemetry]);

  const downloadDomainCsv = () => {
    const params = new URLSearchParams({
      domain,
      format: 'csv',
    });
    if (selectedBot) params.set('source', selectedBot);
    if (selectedType) params.set('type', selectedType);
    window.open(`/api/admin/telemetry?${params.toString()}`, '_blank');
  };

  const getBotColor = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('perplexity')) return 'text-[#05AD98] bg-[rgba(5,173,152,0.12)] border-[rgba(5,173,152,0.3)]';
    if (s.includes('openai') || s.includes('gpt')) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    if (s.includes('claude') || s.includes('anthropic')) return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    if (s.includes('google')) return 'text-sky-400 bg-sky-950/40 border-sky-800/40';
    return 'text-[#BBBFBF] bg-[#1A2020] border-[rgba(187,191,191,0.15)]';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-[#0D1512] border border-[rgba(5,173,152,0.30)] rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[rgba(187,191,191,0.10)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(5,173,152,0.12)] border border-[rgba(5,173,152,0.25)] flex items-center justify-center text-[#05AD98]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white font-mono">{domain}</h3>
                <Link
                  href={`/analytics/${encodeURIComponent(domain)}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] text-[#05AD98] hover:underline"
                  title="Open Full Analytics Dashboard"
                >
                  <span>Full Analytics</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-xs text-[#878787] mt-0.5">
                Site-specific AI crawler telemetry and citation events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadDomainCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.30)] text-xs font-semibold hover:bg-[rgba(5,173,152,0.20)] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#878787] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel rounded-xl p-3 border border-[rgba(187,191,191,0.08)] space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-[#878787] font-semibold">Total Events</p>
              <p className="text-lg font-extrabold text-white font-mono">{stats.totalEvents.toLocaleString()}</p>
            </div>
            <div className="glass-panel rounded-xl p-3 border border-[rgba(5,173,152,0.20)] space-y-0.5 bg-[rgba(5,173,152,0.03)]">
              <p className="text-[10px] uppercase tracking-wider text-[#05AD98] font-semibold">Unique AI Bots</p>
              <p className="text-lg font-extrabold text-[#05AD98] font-mono">{stats.uniqueBotsCount}</p>
            </div>
            <div className="glass-panel rounded-xl p-3 border border-[rgba(184,160,74,0.20)] space-y-0.5 bg-[rgba(184,160,74,0.03)]">
              <p className="text-[10px] uppercase tracking-wider text-[#B8A04A] font-semibold">Top AI Crawler</p>
              <p className="text-xs font-bold text-white truncate font-mono mt-1" title={stats.topBot}>{stats.topBot}</p>
            </div>
            <div className="glass-panel rounded-xl p-3 border border-[rgba(187,191,191,0.08)] space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-[#878787] font-semibold">Last Hit</p>
              <p className="text-xs font-bold text-white truncate mt-1">
                {stats.lastSeen ? formatTelemetryTimestamp(stats.lastSeen).relative : 'None'}
              </p>
            </div>
          </div>
        )}

        {/* Crawler Filter Chips */}
        {stats && stats.botBreakdown.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-[#878787] font-semibold mr-1 shrink-0">Filter Bot:</span>
            <button
              onClick={() => {
                setSelectedBot('');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedBot === ''
                  ? 'bg-[#05AD98] text-black'
                  : 'bg-[#1A2020] text-[#878787] hover:text-white border border-[rgba(187,191,191,0.12)]'
              }`}
            >
              All Bots ({stats.totalEvents})
            </button>
            {stats.botBreakdown.map((b) => (
              <button
                key={b.source}
                onClick={() => {
                  setSelectedBot(selectedBot === b.source ? '' : b.source);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                  selectedBot === b.source
                    ? 'bg-[#05AD98] text-black border-[#05AD98]'
                    : 'bg-[#111514] text-[#BBBFBF] border-[rgba(187,191,191,0.12)] hover:border-[#05AD98]'
                }`}
              >
                {b.source} ({b.count})
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 px-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Telemetry Events Table */}
        <div className="flex-1 overflow-y-auto min-h-[300px] rounded-xl border border-[rgba(187,191,191,0.10)] bg-[#080D0C]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#111514] border-b border-[rgba(187,191,191,0.10)] text-[10px] text-[#878787] uppercase tracking-wider font-semibold z-10">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">AI Bot / Source</th>
                <th className="px-4 py-3 text-center">Event Type</th>
                <th className="px-4 py-3">Intent / Target URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(187,191,191,0.06)]">
              {loading && events.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-[#878787]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#05AD98] mb-2" />
                    Loading site telemetry...
                  </td>
                </tr>
              )}

              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-[#878787]">
                    No telemetry events recorded for {domain} with current filters.
                  </td>
                </tr>
              )}

              {events.map((ev) => {
                const ts = formatTelemetryTimestamp(ev.timestamp);
                const botClass = getBotColor(ev.source);

                return (
                  <tr key={ev.id} className="hover:bg-[#111514]/40 transition-colors">
                    <td className="px-4 py-3 text-[11px] whitespace-nowrap">
                      <div className="text-white font-mono">{ts.time}</div>
                      <div className="text-[10px] text-[#878787]">{ts.relative}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${botClass}`}>
                        <Bot className="w-3 h-3" />
                        <span>{ev.source}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.05)] text-[#BBBFBF] border border-[rgba(255,255,255,0.08)]">
                        {ev.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-white font-medium">{ev.intent}</p>
                      <p className="text-[10px] font-mono text-[#878787] truncate max-w-md mt-0.5" title={ev.destinationUrl}>
                        {ev.destinationUrl}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-between pt-2 text-xs text-[#878787]">
          <span>
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
