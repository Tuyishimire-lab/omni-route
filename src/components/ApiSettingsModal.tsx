'use client';

import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, Cpu, Globe, Check, X, AlertCircle, Info } from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiSettingsModal({ isOpen, onClose }: ApiSettingsModalProps) {
  const [perplexityKey, setPerplexityKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPerplexityKey(localStorage.getItem('omni_perplexity_key') || '');
      setOpenaiKey(localStorage.getItem('omni_openai_key') || '');
      setFirecrawlKey(localStorage.getItem('omni_firecrawl_key') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni_perplexity_key', perplexityKey.trim());
      localStorage.setItem('omni_openai_key', openaiKey.trim());
      localStorage.setItem('omni_firecrawl_key', firecrawlKey.trim());
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-glow rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6 relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-[#111514] border border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Live AI & Crawler Configuration</h3>
            <p className="text-xs text-[#878787]">Optional live API keys for real-time foundation model queries.</p>
          </div>
        </div>

        {/* Notice for Simulation Mode */}
        <div className="p-3.5 rounded-2xl bg-[rgba(5,173,152,0.08)] border border-[rgba(5,173,152,0.20)] text-xs text-[#BBBFBF] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#05AD98] shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] sm:text-xs">
            <strong className="text-[#BBBFBF] font-semibold">Autonomous Heuristic Mode Active:</strong> All GEO audits, scoring, and prompt share-of-voice simulations work out-of-the-box with high-fidelity semantic algorithms. Adding live keys is entirely optional.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#BBBFBF] font-medium mb-1 flex items-center justify-between">
              <span>Perplexity Sonar API Key</span>
              <span className="text-[10px] text-[#878787] font-mono">Optional</span>
            </label>
            <input
              type="password"
              placeholder="pplx-xxxxxxxxxxxxxxxxxxxx"
              value={perplexityKey}
              onChange={(e) => setPerplexityKey(e.target.value)}
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#05AD98]"
            />
          </div>

          <div>
            <label className="block text-[#BBBFBF] font-medium mb-1 flex items-center justify-between">
              <span>OpenAI Search / GPT-4o Key</span>
              <span className="text-[10px] text-[#878787] font-mono">Optional</span>
            </label>
            <input
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#05AD98]"
            />
          </div>

          <div>
            <label className="block text-[#BBBFBF] font-medium mb-1 flex items-center justify-between">
              <span>Firecrawl / Headless DOM Crawler API</span>
              <span className="text-[10px] text-[#878787] font-mono">Optional</span>
            </label>
            <input
              type="password"
              placeholder="fc-xxxxxxxxxxxxxxxxxxxx"
              value={firecrawlKey}
              onChange={(e) => setFirecrawlKey(e.target.value)}
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#05AD98]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#111514] hover:bg-[#1A2020] text-[#BBBFBF] text-xs font-semibold border border-[rgba(187,191,191,0.10)] transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-xs font-bold shadow-md shadow-[rgba(5,173,152,0.25)] transition-all"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#05AD98]" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save & Apply Keys</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
