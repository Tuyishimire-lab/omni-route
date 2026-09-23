'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Building2, Search, Mail, ExternalLink, RefreshCw,
  CheckCircle2, Clock, Check, AlertCircle, Sparkles, Filter
} from 'lucide-react';

interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string | null;
  product: string;
  price: string | null;
  industry: string | null;
  deliveryFormat: string | null;
  message: string | null;
  status: 'pending' | 'contacted' | 'qualified' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface InquiryStats {
  total: number;
  pending: number;
  contacted: number;
  qualified: number;
  closed: number;
}

export default function EnterpriseInquiries() {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [stats, setStats] = useState<InquiryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/inquiries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load enterprise inquiries');
      const data = await res.json();
      setInquiries(data.inquiries || []);
      setStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus as InquiryRecord['status'] } : item))
      );
      // Refresh stats
      fetchInquiries();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-2.5 h-2.5" />
            <span>Pending Action</span>
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Mail className="w-2.5 h-2.5" />
            <span>Contacted</span>
          </span>
        );
      case 'qualified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Qualified Deal</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            <Check className="w-2.5 h-2.5" />
            <span>Closed / Completed</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#B8A04A]" />
            <span>Enterprise Data Inquiries</span>
          </h2>
          <p className="text-xs text-[#878787]">
            High-ticket buyer requests ($500 - $5,000/mo) for private data feeds and custom benchmarks
          </p>
        </div>
        <button
          onClick={fetchInquiries}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] text-xs font-semibold hover:text-white hover:border-[#05AD98] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Leads', value: stats.total, color: 'text-white' },
            { label: 'Needs Followup', value: stats.pending, color: 'text-amber-400' },
            { label: 'Contacted', value: stats.contacted, color: 'text-sky-400' },
            { label: 'Qualified Deals', value: stats.qualified, color: 'text-[#05AD98]' },
            { label: 'Closed Deals', value: stats.closed, color: 'text-[#878787]' },
          ].map((s, idx) => (
            <div key={idx} className="glass-panel rounded-xl p-3.5 border border-[rgba(187,191,191,0.08)]">
              <span className="text-[10px] uppercase font-semibold text-[#878787] block">{s.label}</span>
              <span className={`text-xl font-extrabold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#878787]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, prospect, or email..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#101514] border border-[rgba(187,191,191,0.12)] text-xs text-white placeholder-[#606766] outline-none focus:border-[#B8A04A]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#101514] border border-[rgba(187,191,191,0.12)]">
          {['all', 'pending', 'contacted', 'qualified', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-[rgba(184,160,74,0.2)] text-[#B8A04A]'
                  : 'text-[#878787] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {inquiries.length === 0 && !isLoading ? (
        <div className="glass-panel rounded-2xl p-10 border border-[rgba(187,191,191,0.08)] text-center space-y-3">
          <Database className="w-10 h-10 text-[#878787]/40 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Enterprise Inquiries Found</h3>
          <p className="text-xs text-[#878787] max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters or search term.'
              : 'Incoming leads from enterprise plan inquiries will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className="glass-panel rounded-2xl p-5 border border-[rgba(187,191,191,0.08)] hover:border-[rgba(184,160,74,0.3)] transition-all space-y-4"
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{inq.company}</h3>
                    {inq.website && (
                      <a
                        href={inq.website.startsWith('http') ? inq.website : `https://${inq.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#878787] hover:text-[#05AD98] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {getStatusBadge(inq.status)}
                  </div>
                  <div className="text-xs text-[#878787] flex items-center gap-2">
                    <span>Prospect: <strong className="text-white font-medium">{inq.name}</strong></span>
                    <span>&bull;</span>
                    <a href={`mailto:${inq.email}`} className="text-[#05AD98] hover:underline">
                      {inq.email}
                    </a>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-[#B8A04A]">{inq.product}</div>
                  <div className="text-[11px] text-[#878787]">
                    {inq.price || 'Enterprise'} &bull; Received {new Date(inq.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs py-2 px-3 rounded-xl bg-[#090D0C] border border-[rgba(255,255,255,0.04)]">
                <div>
                  <span className="text-[10px] text-[#878787] uppercase block">Industry Vertical</span>
                  <span className="text-white font-medium">{inq.industry || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#878787] uppercase block">Delivery Format</span>
                  <span className="text-white font-medium">{inq.deliveryFormat || 'API Feed / CSV'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#878787] uppercase block">Lead Status</span>
                  <select
                    value={inq.status}
                    disabled={updatingId === inq.id}
                    onChange={(e) => handleStatusChange(inq.id, e.target.value)}
                    className="mt-0.5 px-2 py-1 rounded bg-[#131A19] border border-[rgba(187,191,191,0.15)] text-white text-[11px] outline-none"
                  >
                    <option value="pending">Pending Action</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="closed">Closed / Won</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              {inq.message && (
                <div className="text-xs text-[#BBBFBF] bg-[#0A0E0E] p-3 rounded-xl border border-[rgba(187,191,191,0.05)] space-y-1">
                  <span className="text-[10px] font-semibold text-[#878787] uppercase block">Custom Requirements:</span>
                  <p className="whitespace-pre-wrap leading-relaxed">{inq.message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#606766] font-mono">ID: {inq.id}</span>
                <a
                  href={`mailto:${inq.email}?subject=CiteRoute%20${encodeURIComponent(inq.product)}%20for%20${encodeURIComponent(inq.company)}&body=Hi%20${encodeURIComponent(inq.name)},%0A%0AThank%20you%20for%20reaching%20out%20about%20CiteRoute's%20${encodeURIComponent(inq.product)}.`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(184,160,74,0.12)] hover:bg-[rgba(184,160,74,0.22)] border border-[rgba(184,160,74,0.25)] text-xs font-bold text-[#B8A04A] transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Reply to Prospect</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
