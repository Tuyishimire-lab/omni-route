'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe, Zap, Bot, Quote, Clock, Trash2, Plus, RefreshCw,
  Copy, CheckCircle2, ChevronRight, AlertCircle, Loader2, ExternalLink, Shield
} from 'lucide-react';

const ENDPOINT = 'https://omni-route-rho.vercel.app';

interface SiteData {
  domain: string;
  addedAt: string;
  verifiedAt: string;
  aiEvents: number;
  crawlers: number;
  agentTx: number;
  citations: number;
  lastEvent: string | null;
}

function Tag({ domain }: { domain: string }) {
  const snippet = `<script async src="${ENDPOINT}/api/v1/track.js?site=${domain}"></script>`;
  const [copied, setCopied] = React.useState(false);
  const copy = async () => { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="mt-3 rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(187,191,191,0.08)]">
        <span className="text-[10px] font-mono text-[#878787]">Your tracking tag</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-[#878787] hover:text-white transition-colors">
          {copied ? <><CheckCircle2 className="w-3 h-3 text-[#05AD98]" /><span className="text-[#05AD98]">Copied!</span></> : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      <pre className="px-3 py-2 text-[10px] font-mono text-[#05AD98] overflow-x-auto whitespace-pre">{snippet}</pre>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-[#111514] border border-[rgba(187,191,191,0.08)]">
      <Icon className="w-4 h-4 text-[#05AD98]" />
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-[10px] text-[#878787]">{label}</span>
    </div>
  );
}

export default function MySitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [addDomain, setAddDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sites/me');
      if (res.status === 401) { router.push('/login?next=/my-sites'); return; }
      const data = await res.json();
      setSites(Array.isArray(data) ? data : []);
      setAuthed(true);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login?next=/my-sites'); return; }
      setAuthed(true);
      fetchSites();
    });
  }, [router, fetchSites]);

  const addSite = async () => {
    setAddError(null);
    const d = addDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!d) return;
    setAdding(true);
    try {
      const res = await fetch('/api/sites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? 'Failed to add site'); }
      else { setAddDomain(''); fetchSites(); }
    } finally { setAdding(false); }
  };

  const removeSite = async (domain: string) => {
    setRemoveLoading(domain);
    await fetch('/api/sites/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    setRemoveLoading(null);
    fetchSites();
  };

  if (loading || !authed) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-[#05AD98] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#878787]">
        <Link href="/" className="hover:text-[#05AD98] transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white">My Sites</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            My <span className="gradient-text">Sites</span>
          </h1>
          <p className="text-sm text-[#878787] mt-1">
            Sites with the OmniRoute Tag installed. AI traffic data is updated in real time.
          </p>
        </div>
        <button onClick={fetchSites} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(187,191,191,0.15)] text-sm text-[#878787] hover:text-white hover:border-[rgba(5,173,152,0.30)] transition-all">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {/* Add site panel */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(5,173,152,0.20)] space-y-3">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#05AD98]" />
          Add a site
        </p>
        <p className="text-xs text-[#878787]">
          The OmniRoute Tag must be installed and live on your site first.{' '}
          <Link href="/docs/install" className="text-[#05AD98] hover:underline">Install guide →</Link>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={addDomain}
            onChange={e => { setAddDomain(e.target.value); setAddError(null); }}
            onKeyDown={e => e.key === 'Enter' && !adding && addSite()}
            placeholder="yourdomain.com"
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#111514] border border-[rgba(187,191,191,0.15)] focus:border-[rgba(5,173,152,0.50)] text-sm text-white placeholder:text-[#878787] outline-none font-mono transition-colors"
          />
          <button
            onClick={addSite}
            disabled={adding || !addDomain.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] disabled:opacity-40 text-white text-sm font-bold transition-all flex items-center gap-2 shrink-0"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {adding ? 'Verifying…' : 'Add Site'}
          </button>
        </div>
        {addError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{addError}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-[#878787]">
          <Shield className="w-3 h-3 text-[#05AD98]" />
          We verify the tag is live before adding your site. This prevents false claims.
        </div>
      </div>

      {/* Sites list */}
      {sites.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 border border-[rgba(187,191,191,0.10)] text-center space-y-4">
          <Globe className="w-12 h-12 text-[#05AD98] mx-auto opacity-40" />
          <p className="text-white font-semibold">No sites yet</p>
          <p className="text-xs text-[#878787] max-w-sm mx-auto">
            Install the OmniRoute Tag on your site, verify it above, then add it here to see your AI traffic data.
          </p>
          <Link href="/docs/install" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] text-white text-sm font-bold">
            Install Tag <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sites.map(site => (
            <div key={site.domain} className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
              {/* Site header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(187,191,191,0.08)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(5,173,152,0.15)] flex items-center justify-center">
                    <Globe className="w-4 h-4 text-[#05AD98]" />
                  </div>
                  <div>
                    <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-bold text-white hover:text-[#05AD98] transition-colors flex items-center gap-1">
                      {site.domain} <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-[10px] text-[#878787]">
                      Added {new Date(site.addedAt).toLocaleDateString()} · Verified{' '}
                      {new Date(site.verifiedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/audit?domain=${site.domain}`}
                    className="px-3 py-1.5 rounded-lg border border-[rgba(5,173,152,0.25)] text-[#05AD98] text-xs font-semibold hover:bg-[rgba(5,173,152,0.10)] transition-all">
                    GEO Audit
                  </Link>
                  <button
                    onClick={() => removeSite(site.domain)}
                    disabled={removeLoading === site.domain}
                    className="p-1.5 rounded-lg text-[#878787] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Remove site"
                  >
                    {removeLoading === site.domain
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBadge icon={Zap}   label="AI Events (30d)"  value={site.aiEvents}  />
                  <StatBadge icon={Bot}   label="Crawlers"          value={site.crawlers}  />
                  <StatBadge icon={Zap}   label="Agent Tx"          value={site.agentTx}   />
                  <StatBadge icon={Quote} label="Citations"         value={site.citations} />
                </div>

                {site.lastEvent && (
                  <div className="flex items-center gap-2 text-xs text-[#878787]">
                    <Clock className="w-3.5 h-3.5" />
                    Last AI event: {new Date(site.lastEvent).toLocaleString()}
                  </div>
                )}

                {site.aiEvents === 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[rgba(5,173,152,0.05)] border border-[rgba(5,173,152,0.15)] text-xs text-[#878787]">
                    <AlertCircle className="w-3.5 h-3.5 text-[#05AD98]" />
                    No AI traffic recorded yet. Events appear within 24–48 h of your first AI crawler visit.
                  </div>
                )}

                <Tag domain={site.domain} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
