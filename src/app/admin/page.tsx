'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Key, Plus, Trash2, ToggleLeft, ToggleRight, Shield, RefreshCw,
  Copy, Check, Crown, Zap, Users, AlertCircle, LogIn, ShieldOff
} from 'lucide-react';

interface ApiKeyRecord {
  id: string;
  key: string;
  maskedKey: string;
  keyPrefix: string;
  name: string;
  tier: string;
  domain: string | null;
  rateLimit: number;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

interface KeyStats {
  total: number;
  active: number;
  inactive: number;
  byTier: { tier: string; count: number }[];
}

interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTier, setNewKeyTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [newKeyDomain, setNewKeyDomain] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/keys');
      if (!res.ok) {
        if (res.status === 401) {
          setError('Admin authorization required.');
          return;
        }
        throw new Error('Failed to fetch keys');
      }
      const data = await res.json();
      setKeys(data.keys || []);
      setStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch keys when authenticated as admin — deferred so the setState
  // inside fetchKeys doesn't fire synchronously in the effect body.
  useEffect(() => {
    if (authChecked && user?.role === 'admin') {
      const t = setTimeout(() => { fetchKeys(); }, 0);
      return () => clearTimeout(t);
    }
  }, [authChecked, user, fetchKeys]);

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          tier: newKeyTier,
          domain: newKeyDomain || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create key');
      const data = await res.json();
      setCreatedKey(data.key.key);
      setNewKeyName('');
      setNewKeyDomain('');
      fetchKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    }
  };

  const toggleKey = async (id: string, isActive: boolean) => {
    try {
      await fetch('/api/v1/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      fetchKeys();
    } catch {
      setError('Failed to update key');
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this API key?')) return;
    try {
      await fetch(`/api/v1/keys?id=${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch {
      setError('Failed to delete key');
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tierColors: Record<string, string> = {
    free: 'text-[#878787] bg-[#1A2020] border-[rgba(187,191,191,0.12)]',
    pro: 'text-[#05AD98] bg-[rgba(5,173,152,0.10)] border-[rgba(5,173,152,0.25)]',
    enterprise: 'text-[#B8A04A] bg-[rgba(184,160,74,0.10)] border-[rgba(184,160,74,0.25)]',
  };

  const tierIcons: Record<string, React.ReactNode> = {
    free: <Shield className="w-3 h-3" />,
    pro: <Zap className="w-3 h-3" />,
    enterprise: <Crown className="w-3 h-3" />,
  };

  // Loading state
  if (!authChecked) {
    return (
      <div className="max-w-md mx-auto pt-16 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#05AD98] mx-auto" />
        <p className="text-xs text-[#878787] mt-3">Checking authentication...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto pt-16 space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] flex items-center justify-center text-[#05AD98] mx-auto">
          <LogIn className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Sign In Required</h2>
        <p className="text-xs text-[#878787]">You need to be logged in with an admin account to access this page.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] text-white text-sm font-bold"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </Link>
      </div>
    );
  }

  // Not an admin
  if (user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto pt-16 space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(244,63,94,0.10)] border border-[rgba(244,63,94,0.2)] flex items-center justify-center text-rose-400 mx-auto">
          <ShieldOff className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Access Denied</h2>
        <p className="text-xs text-[#878787]">
          Signed in as <span className="text-white font-mono">{user.email}</span> — this account doesn&apos;t have admin privileges.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] text-sm font-bold hover:text-white hover:border-[#05AD98] transition-all"
        >
          Go Home
        </Link>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98] mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Dashboard</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">API Key Management</h1>
          <p className="text-xs text-[#878787] mt-1">Signed in as <span className="text-[#05AD98] font-mono">{user.email}</span></p>
        </div>
        <button
          onClick={fetchKeys}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] text-xs font-semibold hover:text-white hover:border-[#05AD98] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Keys', value: stats.total, icon: Key, color: 'text-sky-400' },
            { label: 'Active', value: stats.active, icon: ToggleRight, color: 'text-[#05AD98]' },
            { label: 'Inactive', value: stats.inactive, icon: ToggleLeft, color: 'text-rose-400' },
            { label: 'Tiers', value: stats.byTier.map((t) => `${t.count} ${t.tier}`).join(', ') || '—', icon: Users, color: 'text-[#B8A04A]' },
          ].map((s, i) => (
            <div key={i} className="glass-panel rounded-xl p-4 border border-[rgba(187,191,191,0.08)] space-y-1">
              <div className="flex items-center gap-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-[#878787] font-semibold">{s.label}</span>
              </div>
              <p className="text-lg font-extrabold text-white font-mono">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Form */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#05AD98]" />
          Generate New API Key
        </h2>

        <form onSubmit={createKey} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] text-[#878787] uppercase tracking-wider block mb-1">Key Name *</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="My Production Key"
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#05AD98]"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#878787] uppercase tracking-wider block mb-1">Tier</label>
            <select
              value={newKeyTier}
              onChange={(e) => setNewKeyTier(e.target.value as 'free' | 'pro' | 'enterprise')}
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#05AD98]"
            >
              <option value="free">Free (100 req/hr)</option>
              <option value="pro">Pro (1,000 req/hr)</option>
              <option value="enterprise">Enterprise (10,000 req/hr)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#878787] uppercase tracking-wider block mb-1">Domain (optional)</label>
            <input
              type="text"
              value={newKeyDomain}
              onChange={(e) => setNewKeyDomain(e.target.value)}
              placeholder="example.com"
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#05AD98]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#05AD98] to-[#038a79] text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Key
          </button>
        </form>

        {/* Created key banner */}
        {createdKey && (
          <div className="mt-3 p-4 rounded-xl bg-[rgba(5,173,152,0.08)] border border-[rgba(5,173,152,0.3)] space-y-2">
            <p className="text-xs text-[#05AD98] font-semibold">✅ API Key created — copy it now, it won&apos;t be shown again in full:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-white bg-[#0A0E0E] rounded-lg px-3 py-2 border border-[rgba(187,191,191,0.10)] truncate">
                {createdKey}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey)}
                className="px-3 py-2 rounded-lg bg-[#1A2020] text-[#05AD98] border border-[rgba(5,173,152,0.3)] text-xs font-semibold"
              >
                {copiedKey === createdKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 px-4">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* Keys Table */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_100px_80px_100px_80px] gap-2 px-5 py-3 bg-[#111514]/60 border-b border-[rgba(187,191,191,0.10)] text-[10px] text-[#878787] uppercase tracking-wider font-semibold">
          <span>Name / Key</span>
          <span className="text-center">Tier</span>
          <span className="text-center">Rate Limit</span>
          <span className="text-center">Usage</span>
          <span className="text-center">Status</span>
          <span className="text-center">Actions</span>
        </div>

        {keys.length === 0 && !isLoading && (
          <div className="p-8 text-center text-[#878787] text-xs">
            No API keys found. Create your first key above.
          </div>
        )}

        {isLoading && (
          <div className="p-8 text-center text-[#878787] text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#05AD98]" />
            Loading keys...
          </div>
        )}

        {keys.map((k) => (
          <div
            key={k.id}
            className="grid grid-cols-[1fr_80px_100px_80px_100px_80px] gap-2 px-5 py-3.5 border-b border-[rgba(187,191,191,0.06)] hover:bg-[#111514]/30 transition-colors items-center"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{k.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <code className="text-[10px] font-mono text-[#878787] truncate">{k.keyPrefix}…</code>
                <button
                  onClick={() => copyToClipboard(k.keyPrefix)}
                  className="text-[#878787] hover:text-[#05AD98] transition-colors shrink-0"
                >
                  {copiedKey === k.keyPrefix ? <Check className="w-3 h-3 text-[#05AD98]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              {k.domain && <span className="text-[9px] text-[#878787] font-mono">🔒 {k.domain}</span>}
            </div>

            <div className="flex justify-center">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierColors[k.tier] || tierColors.free}`}>
                {tierIcons[k.tier]}
                {k.tier}
              </span>
            </div>

            <div className="text-center text-xs font-mono text-[#BBBFBF]">
              {k.rateLimit.toLocaleString()}/hr
            </div>

            <div className="text-center text-xs font-mono text-[#BBBFBF]">
              {k.usageCount.toLocaleString()}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => toggleKey(k.id, !k.isActive)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  k.isActive
                    ? 'text-[#05AD98] bg-[rgba(5,173,152,0.10)] border-[rgba(5,173,152,0.25)]'
                    : 'text-rose-400 bg-[rgba(244,63,94,0.08)] border-[rgba(244,63,94,0.25)]'
                }`}
              >
                {k.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {k.isActive ? 'Active' : 'Disabled'}
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => deleteKey(k.id)}
                className="p-1.5 rounded-lg text-[#878787] hover:text-rose-400 hover:bg-[rgba(244,63,94,0.08)] transition-all"
                title="Delete key"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tracked Domains ─────────────────────────────────────────────── */}
      <TrackedDomains />
    </div>
  );
}

// ── Tracked Domains component (admin only) ─────────────────────────────────
interface TrackedDomain {
  domain: string;
  totalEvents: number;
  lastEvent: string | null;
  owner: { email: string; name: string; id: string } | null;
  registeredAt: string | null;
}

function TrackedDomains() {
  const [rows, setRows] = React.useState<TrackedDomain[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/admin/tracked-sites')
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        if (Array.isArray(d)) setRows(d); else throw new Error(d.error ?? 'Unexpected response');
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Network error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(187,191,191,0.08)]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#05AD98]" />
            Tracked Domains
          </h2>
          <p className="text-xs text-[#878787] mt-0.5">All domains that have sent AI traffic events</p>
        </div>
        <span className="text-xs text-[#878787] bg-[#111514] border border-[rgba(187,191,191,0.10)] px-2.5 py-1 rounded-full">
          {rows.length} domains
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-[#05AD98] animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-6 py-4 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-center text-[#878787] text-sm py-10">No tracked domains yet.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(187,191,191,0.06)] text-[10px] text-[#878787] uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Domain</th>
                <th className="px-4 py-3 text-right">Events</th>
                <th className="px-4 py-3 text-left">Last Seen</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(187,191,191,0.05)]">
              {rows.map(row => (
                <tr key={row.domain} className="hover:bg-[rgba(5,173,152,0.04)] transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-[#05AD98]">
                    <a href={`https://${row.domain}`} target="_blank" rel="noopener noreferrer"
                      className="hover:underline">{row.domain}</a>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{row.totalEvents}</td>
                  <td className="px-4 py-3 text-[#878787] text-xs">
                    {row.lastEvent ? new Date(row.lastEvent).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.owner
                      ? <span className="text-white">{row.owner.name} <span className="text-[#878787]">({row.owner.email})</span></span>
                      : <span className="text-[#878787] italic">Unregistered</span>}
                  </td>
                  <td className="px-4 py-3 text-[#878787] text-xs">
                    {row.registeredAt ? new Date(row.registeredAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
