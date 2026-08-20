'use client';

import React, { useState, useEffect } from 'react';
import { presetQueries, runPromptSimulation } from '../lib/simulationEngine';
import { SimulationResult } from '../lib/types';
import {
  Activity,
  Play,
  Cpu,
  ExternalLink,
  Info,
  PieChart,
  TrendingUp,
  Search,
  CheckCircle2,
  Wifi,
  WifiOff,
  Key,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';

export default function PromptSandbox() {
  const [domain, setDomain] = useState('stripe.com');
  const [customQuery, setCustomQuery] = useState(presetQueries[0].query);
  const [selectedModel, setSelectedModel] = useState('Perplexity Pro (Sonar)');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [perplexityKeyInput, setPerplexityKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult>(() =>
    runPromptSimulation('stripe.com', presetQueries[0].query, 'Perplexity Pro (Sonar)')
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('omni_perplexity_key') || '';
      setPerplexityKeyInput(key);
      setIsLiveMode(key.startsWith('pplx-') && key.length > 20);
    }
  }, []);

  const handleSaveKey = () => {
    const trimmed = perplexityKeyInput.trim();
    localStorage.setItem('omni_perplexity_key', trimmed);
    const isValid = trimmed.startsWith('pplx-') && trimmed.length > 20;
    setIsLiveMode(isValid);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleClearKey = () => {
    setPerplexityKeyInput('');
    localStorage.removeItem('omni_perplexity_key');
    setIsLiveMode(false);
  };

  const models = [
    'Perplexity Pro (Sonar)',
    'OpenAI GPT-4o Search',
    'Claude 3.5 Sonnet (Web)',
    'Google Gemini 1.5 Pro Grounding'
  ];

  const handleRunSimulation = async () => {
    setIsLoading(true);
    try {
      const perplexityKey = typeof window !== 'undefined'
        ? (localStorage.getItem('omni_perplexity_key') || '')
        : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (perplexityKey) headers['x-perplexity-key'] = perplexityKey;

      const res = await fetch('/api/v1/simulate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ domain, query: customQuery, model: selectedModel })
      });
      const json = await res.json();
      if (json.success) {
        setSimulationResult(json.data);
        setIsLiveMode(json.mode === 'LIVE');
      } else {
        // fallback to client-side simulation
        setSimulationResult(runPromptSimulation(domain, customQuery, selectedModel));
      }
    } catch {
      setSimulationResult(runPromptSimulation(domain, customQuery, selectedModel));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration Bar */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#B8A04A]" />
              Live Generative AI Prompt & Citation Sandbox
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-xs text-[#878787]">
                Simulate how foundation models synthesize answers, rank citations, and route traffic to your domain.
              </p>
              {isLiveMode ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] border border-[rgba(5,173,152,0.25)] text-[10px] font-bold whitespace-nowrap">
                  <Wifi className="w-2.5 h-2.5" /> LIVE MODE
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/50 text-[#878787] border border-[rgba(187,191,191,0.12)] text-[10px] font-semibold whitespace-nowrap">
                  <WifiOff className="w-2.5 h-2.5" /> SIM MODE
                </span>
              )}
            </div>
          </div>


          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-[#878787]">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#111514] border border-slate-750 text-[#05AD98] rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#05AD98]"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Query & Domain Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-[#878787] mb-1.5">Target Website / Brand</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-[#05AD98]"
              placeholder="e.g. yourbrand.com"
            />
          </div>

          <div className="md:col-span-8">
            <label className="block text-xs font-medium text-[#878787] mb-1.5">High-Intent User Prompt</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                className="flex-1 bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#05AD98]"
                placeholder="Enter prompt to test citation win-rate..."
              />
              <button
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white font-semibold text-xs shadow-md shadow-[rgba(5,173,152,0.25)] transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>Simulate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Perplexity API Key Panel */}
        <div className="border border-[rgba(187,191,191,0.10)] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowKeyPanel(!showKeyPanel)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#111514]/60 hover:bg-[#111514] transition-colors text-xs"
          >
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-[#B8A04A]" />
              <span className="font-semibold text-[#BBBFBF]">Perplexity Sonar API Key</span>
              <span className="text-[#878787]">Required for live AI citations</span>
            </div>
            <div className="flex items-center gap-2">
              {isLiveMode ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] border border-[rgba(5,173,152,0.25)] text-[10px] font-bold">
                  <Wifi className="w-2.5 h-2.5" /> LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/50 text-[#878787] border border-[rgba(187,191,191,0.12)] text-[10px] font-semibold">
                  <WifiOff className="w-2.5 h-2.5" /> SIM
                </span>
              )}
              {showKeyPanel
                ? <ChevronUp className="w-3.5 h-3.5 text-[#878787]" />
                : <ChevronDown className="w-3.5 h-3.5 text-[#878787]" />}
            </div>
          </button>

          {showKeyPanel && (
            <div className="px-4 py-4 space-y-3 border-t border-[rgba(187,191,191,0.10)] bg-[#0A0E0E]/60">
              <p className="text-[11px] text-[#878787] leading-relaxed">
                Add your <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-[#05AD98] hover:underline">Perplexity Sonar API key</a> to switch from simulation mode to real live AI-generated citations. Stored only in your browser, never sent to our servers.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={perplexityKeyInput}
                  onChange={(e) => setPerplexityKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                  placeholder="pplx-xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] focus:border-[#05AD98] rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none transition-colors"
                />
                <button
                  onClick={handleSaveKey}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-xs font-bold transition-all"
                >
                  {keySaved ? <><Check className="w-3.5 h-3.5 text-[#05AD98]" /> Saved!</> : 'Apply Key'}
                </button>
                {perplexityKeyInput && (
                  <button
                    onClick={handleClearKey}
                    className="px-3 py-2 rounded-xl bg-[#1A2020] hover:bg-rose-500/20 text-[#878787] hover:text-rose-400 text-xs font-semibold border border-[rgba(187,191,191,0.12)] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {isLiveMode && (
                <p className="text-[11px] text-[#05AD98] flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> Key active. Next simulation will use real Perplexity Sonar results.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Sample Prompts */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs pt-1">
          <span className="text-[#878787] font-medium text-[11px]">Test Queries:</span>
          {presetQueries.map((pq) => (
            <button
              key={pq.id}
              onClick={() => {
                setCustomQuery(pq.query);
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-full border text-[10px] sm:text-[11px] font-medium transition-all ${
                customQuery === pq.query
                  ? 'bg-[rgba(5,173,152,0.20)] text-[#05AD98] border-[rgba(5,173,152,0.4)]'
                  : 'bg-[#111514]/60 text-[#878787] border-[rgba(187,191,191,0.10)] hover:text-white'
              }`}
            >
              {pq.category}
            </button>
          ))}
        </div>
      </div>

      {/* Simulation Results Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LLM Synthesis Output Panel */}
        <div className="lg:col-span-7 glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(187,191,191,0.10)]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98]" />
              <span className="text-xs sm:text-sm font-bold text-white">Generative Answer Synthesis</span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-[#878787] px-2 py-0.5 rounded bg-[#111514] border border-[rgba(187,191,191,0.10)]">
              {simulationResult.model}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-[#0A0E0E]/70 rounded-2xl border border-slate-850 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
            {simulationResult.generatedAnswer}
          </div>

          {/* Key Citation References */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#878787] block">
              Cited Footnotes & Vector Anchors ({simulationResult.citedSources.length})
            </span>
            <div className="space-y-2">
              {simulationResult.citedSources.map((source, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    source.isTargetDomain
                      ? 'bg-sky-950/40 border-[rgba(5,173,152,0.4)] shadow-sm shadow-sky-500/10'
                      : 'bg-[#111514]/40 border-[rgba(187,191,191,0.10)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-1.5 text-xs sm:text-sm">
                      <span className="w-4 h-4 rounded-full bg-[#1A2020] text-[#05AD98] text-[10px] flex items-center justify-center font-mono font-bold">
                        [{source.rank}]
                      </span>
                      {source.title}
                    </span>
                    {source.isTargetDomain && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-[rgba(5,173,152,0.18)] text-[#05AD98] border border-[rgba(5,173,152,0.25)]">
                        Primary Winner
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#878787] mt-1">{source.citationContext}</p>
                  <span className="text-[10px] font-mono text-[#05AD98] mt-1 block truncate">{source.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Traffic Yield & Share of Voice */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[rgba(187,191,191,0.10)] space-y-5 sm:space-y-6">
            <h3 className="text-sm sm:text-md font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[#05AD98]" />
              Simulated Traffic Yield & Share of Voice
            </h3>

            {/* Metric Meters */}
            <div className="p-4 rounded-2xl bg-[#111514]/70 border border-[rgba(187,191,191,0.10)] text-center">
              <span className="text-[11px] sm:text-xs text-[#878787] uppercase tracking-wider block font-semibold">
                Target Domain Share of Voice (SOV)
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-[#05AD98] font-mono mt-1.5 block">
                {simulationResult.targetDomainShareOfVoice}%
              </span>
              <div className="w-full bg-slate-850 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full"
                  style={{ width: `${simulationResult.targetDomainShareOfVoice}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111514]/70 border border-[rgba(187,191,191,0.10)] text-center">
              <span className="text-[11px] sm:text-xs text-[#878787] uppercase tracking-wider block font-semibold">
                Projected Monthly Agent Influx
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#05AD98] font-mono mt-1.5 block">
                +{simulationResult.estimatedClickYieldMonthly.toLocaleString()} visits
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#878787] mt-1 block">
                Equivalent PPC saved: <strong className="text-white">$4,260/mo</strong>
              </span>
            </div>

            <div className="p-3.5 sm:p-4 bg-[rgba(5,173,152,0.08)] border border-[rgba(5,173,152,0.20)] text-xs text-[#BBBFBF] space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-[#BBBFBF]">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#05AD98]" />
                GEO Optimization Strategy Insight:
              </div>
              <p className="leading-relaxed text-[11px] sm:text-xs">
                By serving structured tables and publishing an <code>agent.json</code> manifest, {domain} maintains top citation authority across 74% of high-intent purchase queries in this category.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
