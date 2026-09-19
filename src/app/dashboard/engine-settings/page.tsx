'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Info,
  ArrowLeft,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'citeroute_engine_keys';

interface EngineKeySet {
  perplexity: string;
  openai: string;
  anthropic: string;
  gemini: string;
}

interface TestResult {
  ok: boolean;
  error?: string;
}

const ENGINES = [
  {
    id: 'perplexity' as const,
    name: 'Perplexity Sonar',
    description: 'Powers Perplexity Pro search citation analysis',
    placeholder: 'pplx-...',
    docsUrl: 'https://docs.perplexity.ai/',
    color: 'from-sky-500 to-indigo-500',
  },
  {
    id: 'openai' as const,
    name: 'OpenAI / ChatGPT',
    description: 'Powers GPT-4o Search citation data',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'anthropic' as const,
    name: 'Anthropic / Claude',
    description: 'Powers Claude web citation analysis',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: 'from-[#05AD98] to-emerald-600',
  },
  {
    id: 'gemini' as const,
    name: 'Google Gemini',
    description: 'Powers Gemini grounding citation data',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: 'from-blue-500 to-violet-500',
  },
];

export default function EngineSettingsPage() {
  const [keys, setKeys] = useState<EngineKeySet>({ perplexity: '', openai: '', anthropic: '', gemini: '' });
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Load keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setKeys(JSON.parse(stored));
    } catch {}
  }, []);

  const handleChange = (engine: keyof EngineKeySet, value: string) => {
    setKeys(prev => ({ ...prev, [engine]: value }));
    // Clear test result when key changes
    setTestResults(prev => { const n = { ...prev }; delete n[engine]; return n; });
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  const handleTest = async (engineId: keyof EngineKeySet) => {
    const key = keys[engineId]?.trim();
    if (!key) return;

    setTesting(prev => ({ ...prev, [engineId]: true }));
    setTestResults(prev => { const n = { ...prev }; delete n[engineId]; return n; });

    try {
      const res = await fetch('/api/v1/engine-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'example.com',
          engineKeys: { [engineId]: key },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const engineResult = data.results?.find((r: { engine: string; isLiveQuery: boolean; error?: string }) => r.engine === engineId);
        if (engineResult?.isLiveQuery) {
          setTestResults(prev => ({ ...prev, [engineId]: { ok: true } }));
        } else {
          setTestResults(prev => ({ ...prev, [engineId]: { ok: false, error: engineResult?.error ?? 'Query returned no live result' } }));
        }
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setTestResults(prev => ({ ...prev, [engineId]: { ok: false, error: err.error ?? 'Request failed' } }));
      }
    } catch (e) {
      setTestResults(prev => ({ ...prev, [engineId]: { ok: false, error: e instanceof Error ? e.message : 'Network error' } }));
    } finally {
      setTesting(prev => ({ ...prev, [engineId]: false }));
    }
  };

  const toggleVisible = (id: string) => setVisible(prev => ({ ...prev, [id]: !prev[id] }));

  const anyKeySet = Object.values(keys).some(k => k.trim().length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[#878787] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] flex items-center justify-center">
            <Key className="w-5 h-5 text-[#05AD98]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Engine Integrations</h1>
            <p className="text-xs text-[#878787]">Connect AI engine API keys for real per-engine citation data</p>
          </div>
        </div>
      </div>

      {/* OpenRouter Central Active Status */}
      <div className="glass-panel rounded-2xl p-4 border border-[rgba(5,173,152,0.30)] bg-[rgba(5,173,152,0.06)] flex items-start gap-3">
        <Zap className="w-4 h-4 text-[#05AD98] shrink-0 mt-0.5" />
        <div className="text-xs text-[#BBBFBF] leading-relaxed">
          <span className="font-semibold text-white block mb-0.5">
            CiteRoute Engine is Centrally Powered via OpenRouter
          </span>
          Multi-model diagnostics across Perplexity, OpenAI, Anthropic, and Gemini are already enabled system-wide.
          Connecting personal API keys below is completely optional and only needed if you wish to override standard engine routing with your own private quota.
        </div>
      </div>

      {/* Engine Key Cards */}
      <div className="space-y-4">
        {ENGINES.map(engine => {
          const result = testResults[engine.id];
          const isLoading = testing[engine.id];
          const keyValue = keys[engine.id];

          return (
            <div
              key={engine.id}
              className="glass-card rounded-2xl p-5 border border-[rgba(187,191,191,0.10)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${engine.color} flex items-center justify-center`}>
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-white">{engine.name}</span>
                    <span className="text-[11px] text-[#878787] block">{engine.description}</span>
                  </div>
                </div>
                <a
                  href={engine.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#05AD98] hover:underline flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id={`key-${engine.id}`}
                    type={visible[engine.id] ? 'text' : 'password'}
                    value={keyValue}
                    onChange={e => handleChange(engine.id, e.target.value)}
                    placeholder={engine.placeholder}
                    className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-4 py-2.5 pr-10 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#05AD98] transition-colors"
                  />
                  <button
                    onClick={() => toggleVisible(engine.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#878787] hover:text-white transition-colors"
                    aria-label={visible[engine.id] ? 'Hide key' : 'Show key'}
                  >
                    {visible[engine.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => handleTest(engine.id)}
                  disabled={!keyValue.trim() || isLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#111514] border border-[rgba(187,191,191,0.12)] hover:border-[#05AD98] text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  {isLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…</>
                  ) : (
                    'Test Connection'
                  )}
                </button>
              </div>

              {/* Test result feedback */}
              {result && (
                <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 border ${
                  result.ok
                    ? 'bg-[rgba(5,173,152,0.08)] border-[rgba(5,173,152,0.25)] text-[#05AD98]'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {result.ok ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Connection verified - this engine will provide live data in GEO scans.</>
                  ) : (
                    <><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {result.error ?? 'Connection failed - check your key and try again.'}</>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          id="save-engine-keys"
          onClick={handleSave}
          disabled={!anyKeySet}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-[rgba(5,173,152,0.20)]"
        >
          {saved ? 'Saved to browser' : 'Save Keys'}
        </button>
        <button
          onClick={() => {
            setKeys({ perplexity: '', openai: '', anthropic: '', gemini: '' });
            localStorage.removeItem(STORAGE_KEY);
            setTestResults({});
          }}
          className="px-4 py-3 rounded-xl bg-[#111514] border border-[rgba(187,191,191,0.10)] text-xs text-[#878787] hover:text-white transition-colors"
        >
          Clear All Keys
        </button>
        <p className="text-[11px] text-[#878787] ml-1">Stored locally in your browser only</p>
      </div>
    </div>
  );
}
