'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Key, Plus, Trash2, Copy, Check, Shield, Zap, Users, Crown,
  AlertCircle, ArrowRight, ExternalLink, RefreshCw, Terminal, CheckCircle2
} from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  tier: string;
  domain: string | null;
  rateLimit: number;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

interface UserSessionInfo {
  tier: string;
  role: string;
  hasApiAccess: boolean;
  dailyLimit: number;
}

export default function ApiKeysPage() {
  const [sessionInfo, setSessionInfo] = useState<UserSessionInfo | null>(null);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [domainRestriction, setDomainRestriction] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Code Snippet Tab
  const [snippetTab, setSnippetTab] = useState<'curl' | 'node' | 'python'>('curl');

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/keys/me');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setSessionInfo({
          tier: data.tier || 'free',
          role: data.role || 'user',
          hasApiAccess: Boolean(data.hasApiAccess),
          dailyLimit: data.dailyLimit || 0,
        });
      } else if (res.status === 401) {
        setSessionInfo(null);
      }
    } catch (err) {
      console.error('Failed to load keys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/keys/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim() || 'CiteRoute Live Key',
          domain: domainRestriction.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create key');
      }

      setCreatedSecret(data.key.key);
      setKeyName('');
      setDomainRestriction('');
      fetchKeys();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating key');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to permanently revoke this API key? Applications using it will immediately stop working.')) {
      return;
    }

    try {
      const res = await fetch(`/api/keys/me?id=${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to revoke key');
      }
    } catch {
      alert('Network error revoking key');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatLimit = (limit: number) => {
    if (limit === Infinity || limit >= 999999) return 'Unlimited req/day';
    return `${limit.toLocaleString()} req/day`;
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(187,191,191,0.10)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98] mb-2">
            <Key className="w-3.5 h-3.5" />
            <span>Developer Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">API Key Management</h1>
          <p className="text-xs sm:text-sm text-[#878787] mt-1">
            Generate and manage secret keys for querying the CiteRoute REST API programmatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/docs/api"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[rgba(187,191,191,0.15)] bg-[#111514] hover:border-[rgba(5,173,152,0.30)] text-xs font-semibold text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#05AD98]" />
            <span>REST API Docs</span>
            <ExternalLink className="w-3 h-3 text-[#878787]" />
          </Link>

          {sessionInfo?.hasApiAccess && (
            <button
              onClick={() => {
                setCreatedSecret(null);
                setErrorMsg(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-xs font-bold text-white shadow-md shadow-[rgba(5,173,152,0.25)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate New Key</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-[#05AD98] mx-auto mb-3" />
          <p className="text-xs text-[#878787]">Loading API credentials...</p>
        </div>
      ) : !sessionInfo ? (
        /* Not logged in */
        <div className="glass-card rounded-2xl p-10 text-center border border-[rgba(187,191,191,0.12)] space-y-4 max-w-md mx-auto">
          <Key className="w-10 h-10 mx-auto text-[#05AD98]" />
          <h2 className="text-lg font-bold text-white">Sign in to manage API keys</h2>
          <p className="text-xs text-[#878787]">
            You need a CiteRoute account to generate and manage API keys for automated GEO audits.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] text-xs font-bold text-white shadow-md"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : !sessionInfo.hasApiAccess ? (
        /* Free tier upgrade required */
        <div className="glass-panel-glow rounded-3xl p-8 border border-[rgba(5,173,152,0.25)] space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-[rgba(184,160,74,0.12)] border border-[rgba(184,160,74,0.25)] text-[#B8A04A]">
                <Shield className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">API Key Access Requires Pro or Agency Plan</h2>
                <p className="text-xs text-[#878787] mt-0.5">
                  Your account is currently on the <span className="text-white font-semibold capitalize">{sessionInfo.tier} Plan</span>. Upgrade to unlock programmatic API access.
                </p>
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] text-xs font-bold text-white shadow-lg shadow-[rgba(5,173,152,0.25)] hover:opacity-95 transition-all"
            >
              <span>Upgrade to Pro ($79/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[rgba(187,191,191,0.10)]">
            <div className="p-4 rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.08)]">
              <div className="flex items-center gap-2 text-[#05AD98] text-xs font-bold mb-1">
                <Zap className="w-4 h-4" /> Pro Plan
              </div>
              <p className="text-xl font-mono font-bold text-white">500 req/day</p>
              <p className="text-[11px] text-[#878787] mt-1">For single founders & product teams automating daily audits.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.08)]">
              <div className="flex items-center gap-2 text-[#05AD98] text-xs font-bold mb-1">
                <Users className="w-4 h-4" /> Agency Plan
              </div>
              <p className="text-xl font-mono font-bold text-white">10,000 req/day</p>
              <p className="text-[11px] text-[#878787] mt-1">High-volume audits, client reporting, and bulk domain scanning.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.08)]">
              <div className="flex items-center gap-2 text-[#B8A04A] text-xs font-bold mb-1">
                <Crown className="w-4 h-4" /> Enterprise
              </div>
              <p className="text-xl font-mono font-bold text-white">Unlimited</p>
              <p className="text-[11px] text-[#878787] mt-1">Dedicated private pipeline, raw AI crawler feeds & SLA.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Eligible User View */
        <div className="space-y-8">
          {/* Plan Quota Card */}
          <div className="glass-panel rounded-2xl p-5 border border-[rgba(187,191,191,0.10)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
                {sessionInfo.role === 'admin' ? <Crown className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {sessionInfo.role === 'admin' ? 'Superadmin Access' : `${sessionInfo.tier} Plan Entitlement`}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(5,173,152,0.12)] text-[#05AD98] border border-[rgba(5,173,152,0.25)]">
                    Active
                  </span>
                </div>
                <p className="text-xs text-[#878787] mt-0.5">
                  Daily Quota: <strong className="text-white font-mono">{formatLimit(sessionInfo.dailyLimit)}</strong> · Keys Created: <strong className="text-white font-mono">{keys.length} / 5</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setCreatedSecret(null);
                setErrorMsg(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:opacity-95 text-xs font-bold text-white shadow-md shadow-[rgba(5,173,152,0.25)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create API Key</span>
            </button>
          </div>

          {/* Active Keys List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Your Active API Keys</h3>

            {keys.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-dashed border-[rgba(187,191,191,0.12)] space-y-3">
                <Key className="w-8 h-8 mx-auto text-[#878787]" />
                <p className="text-xs text-[#878787]">You haven&apos;t generated any API keys yet.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#05AD98] font-bold hover:underline"
                >
                  Generate your first key &rarr;
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[rgba(187,191,191,0.10)] bg-[#0C1110]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111615] text-[#878787] uppercase text-[10px] tracking-wider border-b border-[rgba(187,191,191,0.08)]">
                    <tr>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Key Prefix</th>
                      <th className="p-3.5">Scope</th>
                      <th className="p-3.5">Usage</th>
                      <th className="p-3.5">Created</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(187,191,191,0.06)] font-mono text-[#BBBFBF]">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="p-3.5 font-sans font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-[#05AD98]" />
                            <span>{k.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="inline-flex items-center gap-1.5 bg-[#080B0A] px-2 py-1 rounded border border-[rgba(187,191,191,0.10)] text-[#05AD98]">
                            <span>{k.keyPrefix}...</span>
                            <button
                              onClick={() => copyToClipboard(k.keyPrefix, k.id)}
                              className="text-[#878787] hover:text-white transition-colors"
                              title="Copy prefix"
                            >
                              {copiedKey === k.id ? <Check className="w-3 h-3 text-[#05AD98]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 font-sans">
                          {k.domain ? (
                            <span className="text-white">{k.domain}</span>
                          ) : (
                            <span className="text-[#878787]">Global</span>
                          )}
                        </td>
                        <td className="p-3.5 font-sans">
                          <span className="font-semibold text-white">{k.usageCount}</span> reqs
                        </td>
                        <td className="p-3.5 font-sans text-[#878787]">
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right font-sans">
                          <button
                            onClick={() => handleRevoke(k.id)}
                            className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors p-1"
                            title="Revoke key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quickstart Code Snippet */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#05AD98]" />
                <h3 className="text-sm font-bold text-white">How to Use Your API Key</h3>
              </div>
              <div className="flex items-center gap-1 bg-[#0A0E0E] p-1 rounded-xl border border-[rgba(187,191,191,0.10)]">
                {(['curl', 'node', 'python'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSnippetTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors ${
                      snippetTab === tab ? 'bg-[rgba(5,173,152,0.15)] text-[#05AD98]' : 'text-[#878787] hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative bg-[#060908] rounded-xl p-4 border border-[rgba(187,191,191,0.08)] font-mono text-xs text-[#05AD98] overflow-x-auto">
              <pre className="leading-relaxed">
                {snippetTab === 'curl' && `curl -X POST https://www.citeroute.com/api/v1/scan \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://stripe.com"}'`}
                {snippetTab === 'node' && `const res = await fetch('https://www.citeroute.com/api/v1/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: 'https://stripe.com' })
});
const audit = await res.json();
console.log(audit.data.overallGeoScore);`}
                {snippetTab === 'python' && `import requests

res = requests.post(
    "https://www.citeroute.com/api/v1/scan",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={"url": "https://stripe.com"}
)
print(res.json()["data"]["overallGeoScore"])`}
              </pre>

              <button
                onClick={() => {
                  const code = snippetTab === 'curl'
                    ? `curl -X POST https://www.citeroute.com/api/v1/scan -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d '{"url": "https://stripe.com"}'`
                    : snippetTab === 'node'
                    ? `const res = await fetch('https://www.citeroute.com/api/v1/scan', { method: 'POST', headers: { 'Authorization': 'Bearer YOUR_API_KEY', 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://stripe.com' }) });`
                    : `import requests\nres = requests.post("https://www.citeroute.com/api/v1/scan", headers={"Authorization": "Bearer YOUR_API_KEY"}, json={"url": "https://stripe.com"})\nprint(res.json())`;
                  navigator.clipboard.writeText(code);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2000);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#111615] border border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white transition-colors"
                title="Copy snippet"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-[#05AD98]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0D1512] border border-[rgba(5,173,152,0.3)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Generate Secret API Key</h3>
              <p className="text-xs text-[#878787] mt-1">
                Keys provide programmatic access to GEO audits and AI traffic logs.
              </p>
            </div>

            {createdSecret ? (
              /* Success Secret Display */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[rgba(5,173,152,0.08)] border border-[rgba(5,173,152,0.25)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#05AD98]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Key Generated Successfully!</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#060A08] p-3 rounded-xl border border-[rgba(5,173,152,0.2)]">
                    <input
                      type="text"
                      readOnly
                      value={createdSecret}
                      className="w-full bg-transparent font-mono text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(createdSecret, 'modal-key')}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#05AD98] to-[#038a79] text-xs font-bold text-white hover:opacity-90 flex items-center gap-1 shrink-0"
                    >
                      {copiedKey === 'modal-key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'modal-key' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#B8A04A] leading-relaxed">
                    ⚠️ <strong>Important:</strong> Copy and store this secret key safely now. For security purposes, it will never be displayed again.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setCreatedSecret(null);
                      setIsModalOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#111615] hover:bg-[#1A2220] text-xs font-bold text-white transition-colors"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Creation Form */
              <form onSubmit={handleCreateKey} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-[#878787] uppercase tracking-wider block mb-1.5 font-bold">
                    Key Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Backend, CI/CD Pipeline"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full bg-[#080C0B] border border-[rgba(187,191,191,0.15)] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#05AD98]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#878787] uppercase tracking-wider block mb-1.5 font-bold">
                    Domain Restriction (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. mycompany.com (leave blank for unrestricted)"
                    value={domainRestriction}
                    onChange={(e) => setDomainRestriction(e.target.value)}
                    className="w-full bg-[#080C0B] border border-[rgba(187,191,191,0.15)] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#05AD98]"
                  />
                  <p className="text-[10px] text-[#878787] mt-1">Restricts this key to only query audits for this specific domain.</p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[rgba(187,191,191,0.10)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[rgba(187,191,191,0.15)] text-xs font-semibold text-[#878787] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:opacity-95 text-xs font-bold text-white shadow-md shadow-[rgba(5,173,152,0.25)] flex items-center justify-center gap-2"
                  >
                    {isGenerating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isGenerating ? 'Generating...' : 'Create Key'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
