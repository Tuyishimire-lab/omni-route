'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Filter, Download, Eye, RefreshCw, AlertCircle,
  CheckCircle2, AlertTriangle, XCircle, ExternalLink, X, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { formatTelemetryTimestamp } from '../../lib/timestamp';

interface ScanItem {
  id: string;
  domain: string;
  scannedAt: string;
  geoScore: number;
  status: 'OPTIMAL' | 'MODERATE' | 'AT_RISK';
  citationRate: number;
  zeroClickResilience: number;
  infoGainScore: number;
  entityScore: number;
  vectorReadiness: number;
  isLiveScan: boolean;
}

interface ScanStats {
  totalMatching: number;
  optimalCount: number;
  moderateCount: number;
  atRiskCount: number;
}

export default function ScanExplorer() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [scanType, setScanType] = useState<string>(''); // '', 'live', 'cron'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Raw report modal
  const [inspectScanId, setInspectScanId] = useState<string | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [rawReportData, setRawReportData] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchScans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (scanType === 'live') params.set('isLiveScan', 'true');
      if (scanType === 'cron') params.set('isLiveScan', 'false');

      const res = await fetch(`/api/admin/scans?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load scans: HTTP ${res.status}`);
      }
      const data = await res.json();
      setScans(data.scans || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scans');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, scanType, page]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const inspectRawReport = async (id: string) => {
    setInspectScanId(id);
    setInspectLoading(true);
    setRawReportData(null);
    try {
      const res = await fetch(`/api/admin/scans?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch raw scan report');
      const data = await res.json();
      const raw = data.scan?.rawReport;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setRawReportData(JSON.stringify(parsed, null, 2));
        } catch {
          setRawReportData(raw);
        }
      } else {
        setRawReportData(JSON.stringify(data.scan, null, 2));
      }
    } catch (err: unknown) {
      setRawReportData(JSON.stringify({ error: err instanceof Error ? err.message : 'Error' }, null, 2));
    } finally {
      setInspectLoading(false);
    }
  };

  const downloadCsv = () => {
    const params = new URLSearchParams({
      format: 'csv',
    });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (status) params.set('status', status);
    if (scanType === 'live') params.set('isLiveScan', 'true');
    if (scanType === 'cron') params.set('isLiveScan', 'false');
    window.open(`/api/admin/scans?${params.toString()}`, '_blank');
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'OPTIMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(5,173,152,0.15)] text-[#05AD98] border border-[rgba(5,173,152,0.30)]">
            <CheckCircle2 className="w-3 h-3" />
            OPTIMAL
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(184,160,74,0.15)] text-[#B8A04A] border border-[rgba(184,160,74,0.30)]">
            <AlertTriangle className="w-3 h-3" />
            MODERATE
          </span>
        );
      case 'AT_RISK':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(244,63,94,0.15)] text-rose-400 border border-[rgba(244,63,94,0.30)]">
            <XCircle className="w-3 h-3" />
            AT RISK
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-[rgba(187,191,191,0.08)] space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-[#878787] font-semibold">Total Scans</p>
            <p className="text-xl font-extrabold text-white font-mono">{stats.totalMatching.toLocaleString()}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(5,173,152,0.20)] space-y-1 bg-[rgba(5,173,152,0.03)]">
            <p className="text-[10px] uppercase tracking-wider text-[#05AD98] font-semibold">Optimal (80+)</p>
            <p className="text-xl font-extrabold text-[#05AD98] font-mono">{stats.optimalCount.toLocaleString()}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(184,160,74,0.20)] space-y-1 bg-[rgba(184,160,74,0.03)]">
            <p className="text-[10px] uppercase tracking-wider text-[#B8A04A] font-semibold">Moderate (50-79)</p>
            <p className="text-xl font-extrabold text-[#B8A04A] font-mono">{stats.moderateCount.toLocaleString()}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(244,63,94,0.20)] space-y-1 bg-[rgba(244,63,94,0.03)]">
            <p className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">At Risk (&lt;50)</p>
            <p className="text-xl font-extrabold text-rose-400 font-mono">{stats.atRiskCount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Control Bar (Search, Filters, CSV Export) */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search domain (e.g. stripe.com)..."
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#878787] focus:outline-none focus:border-[#05AD98]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#878787] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#05AD98]"
          >
            <option value="">All Health Statuses</option>
            <option value="OPTIMAL">Optimal (80+)</option>
            <option value="MODERATE">Moderate (50-79)</option>
            <option value="AT_RISK">At Risk (&lt;50)</option>
          </select>

          {/* Scan Type Filter */}
          <select
            value={scanType}
            onChange={(e) => {
              setScanType(e.target.value);
              setPage(1);
            }}
            className="bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#05AD98]"
          >
            <option value="">All Scan Types</option>
            <option value="live">Live User Scans</option>
            <option value="cron">Automated Rescans</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchScans}
            disabled={loading}
            className="p-2 rounded-xl bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] hover:text-white hover:border-[#05AD98] transition-all"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={downloadCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.30)] text-xs font-semibold hover:bg-[rgba(5,173,152,0.20)] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 px-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scans Table */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#111514]/60 border-b border-[rgba(187,191,191,0.10)] text-[10px] text-[#878787] uppercase tracking-wider font-semibold">
                <th className="px-5 py-3">Domain</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Citation %</th>
                <th className="px-4 py-3 text-center">Resilience</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(187,191,191,0.06)]">
              {loading && scans.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#878787]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#05AD98] mb-2" />
                    Loading scan explorer data...
                  </td>
                </tr>
              )}

              {!loading && scans.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#878787]">
                    No scans found matching the specified query or filters.
                  </td>
                </tr>
              )}

              {scans.map((s) => (
                <tr key={s.id} className="hover:bg-[#111514]/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-sm">{s.domain}</span>
                      <Link
                        href={`/audit?domain=${encodeURIComponent(s.domain)}`}
                        target="_blank"
                        className="text-[#878787] hover:text-[#05AD98] transition-colors"
                        title="Open live audit page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-mono font-bold text-sm text-white">{s.geoScore}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {getStatusBadge(s.status)}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-[#BBBFBF]">
                    {s.citationRate}%
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-[#BBBFBF]">
                    {s.zeroClickResilience}%
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.isLiveScan
                          ? 'text-[#05AD98] bg-[rgba(5,173,152,0.10)]'
                          : 'text-[#878787] bg-[rgba(255,255,255,0.05)]'
                      }`}
                    >
                      {s.isLiveScan ? 'Live' : 'Cron'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-[#878787]">
                    <div>{formatTelemetryTimestamp(s.scannedAt).date}</div>
                    <div className="text-[10px] text-[#555]">{formatTelemetryTimestamp(s.scannedAt).relative}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => inspectRawReport(s.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] hover:text-white hover:border-[#05AD98] transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(187,191,191,0.08)] bg-[#111514]/40 text-xs text-[#878787]">
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

      {/* Raw Report Inspector Modal */}
      {inspectScanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0D1512] border border-[rgba(5,173,152,0.3)] rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(187,191,191,0.10)]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#05AD98]" />
                <h3 className="text-base font-bold text-white">Scan Diagnosis Inspector</h3>
                <code className="text-xs font-mono text-[#878787] ml-2">ID: {inspectScanId}</code>
              </div>
              <button
                onClick={() => setInspectScanId(null)}
                className="text-[#878787] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] bg-[#060A09] rounded-xl p-4 border border-[rgba(187,191,191,0.08)]">
              {inspectLoading && (
                <div className="flex items-center justify-center h-48 text-[#878787] text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#05AD98]" />
                  Loading audit diagnostics...
                </div>
              )}
              {!inspectLoading && rawReportData && (
                <pre className="text-xs font-mono text-[#BBBFBF] whitespace-pre-wrap break-all leading-relaxed">
                  {rawReportData}
                </pre>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectScanId(null)}
                className="px-4 py-2 rounded-xl bg-[#1A2020] text-xs font-semibold text-white border border-[rgba(187,191,191,0.12)] hover:border-[#05AD98] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
