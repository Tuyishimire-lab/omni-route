'use client';

import React, { useState, useEffect } from 'react';
import { Network, Search, Cpu, Info, Key, ArrowRight, Globe, Activity, CheckCircle2, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ONBOARDING_KEY = 'omniroute_onboarded_v1';

const STEPS = [
  {
    id: 0,
    icon: Globe,
    iconColor: 'text-[#05AD98]',
    iconBg: 'from-[#05AD98]/20 to-indigo-500/10 border-[rgba(5,173,152,0.3)]',
    badge: 'Welcome to the Future',
    title: 'The Age of AI Traffic Has Begun',
    body: 'Over 65% of searches now end without a click. AI answer engines like Perplexity, ChatGPT, Claude, and Gemini are replacing traditional search. Your brand needs to be cited by them, not invisible to them.',
    detail: 'OmniRoute is the first platform built specifically to optimize for Generative Engine Optimization (GEO), ensuring AI systems cite your domain as an authoritative source.'
  },
  {
    id: 1,
    icon: Search,
    iconColor: 'text-[#05AD98]',
    iconBg: 'from-[#05AD98]/20 to-[#038a79]/10 border-[rgba(5,173,152,0.25)]',
    badge: 'Step 1 of 3',
    title: 'Scan Your Domain, Free and Instant',
    body: 'OmniRoute\'s heuristic AI engine analyzes any domain in seconds. No sign-up required. No API keys needed. Just enter your domain and get a full GEO audit across Perplexity, ChatGPT, Claude, and Gemini.',
    detail: 'You\'ll receive a GEO Score (0–100), engine-by-engine diagnostics, entity grounding analysis, and targeted optimization code patches.'
  },
  {
    id: 2,
    icon: Key,
    iconColor: 'text-[#B8A04A]',
    iconBg: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
    badge: 'Step 2 of 3 (Optional)',
    title: 'Connect Live AI Engines (Optional)',
    body: 'OmniRoute works perfectly without any API keys using its built-in simulation engine. When you\'re ready for real-time live data, connect your Perplexity Sonar, OpenAI, or Firecrawl credentials.',
    detail: 'Keys are stored only in your browser local storage, never sent to OmniRoute servers. You can add or remove them at any time via the API Keys button in the header.'
  },
  {
    id: 3,
    icon: Cpu,
    iconColor: 'text-[#05AD98]',
    iconBg: 'from-[rgba(5,173,152,0.15)] to-[rgba(3,138,121,0.08)] border-[rgba(5,173,152,0.25)]',
    badge: 'Step 3 of 3',
    title: 'Your GEO Operating System',
    body: 'OmniRoute is a complete platform with 5 modules: Command Center, GEO Scanner, Domain Watchlist, Benchmark Arena, and Traffic Analytics.',
    detail: 'Use the Benchmark Arena to compare your domain vs. competitors. Use the Watchlist to track your GEO score over time. Use the Analytics dashboard to monitor real AI bot traffic to your site.'
  }
];

export default function OnboardingWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasOnboarded = localStorage.getItem(ONBOARDING_KEY);
      if (!hasOnboarded) {
        // Small delay so the page can render first
        const t = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
      if (domain.trim()) {
        router.push(`/audit?domain=${encodeURIComponent(domain.trim())}`);
      }
    }
  };

  const prev = () => { if (step > 0) setStep(step - 1); };

  if (!isOpen) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-panel-glow rounded-3xl max-w-lg w-full border border-[rgba(187,191,191,0.10)] shadow-2xl shadow-sky-500/5 overflow-hidden">

        {/* Progress Bar */}
        <div className="h-1 bg-[#1A2020]">
          <div
            className="h-full bg-gradient-to-r from-[#05AD98] via-indigo-500 to-violet-500 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Close */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-6 bg-sky-400' : 'w-3 bg-slate-700'}`}
                />
              ))}
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg text-[#878787] hover:text-[#BBBFBF] hover:bg-[#1A2020] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.iconBg} border flex items-center justify-center`}>
            <Icon className={`w-7 h-7 ${current.iconColor}`} />
          </div>

          {/* Badge */}
          <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-[#878787]">
            {current.badge}
          </span>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">{current.title}</h2>

          {/* Body */}
          <p className="text-sm text-[#BBBFBF] leading-relaxed">{current.body}</p>

          {/* Detail */}
          <div className="p-3.5 rounded-2xl bg-[#111514]/60 border border-[rgba(187,191,191,0.10)] text-xs text-[#878787] leading-relaxed">
            <Info className="w-3.5 h-3.5 inline-block text-[#05AD98] mr-1.5 -mt-0.5" />
            {current.detail}
          </div>

          {/* Domain Input - only on Step 1 (scan step) */}
          {step === 1 && (
            <div className="space-y-1.5">
              <label className="text-xs text-[#878787] font-medium">Enter your domain to scan now:</label>
              <input
                type="text"
                placeholder="yourdomain.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && next()}
                className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] focus:border-[#05AD98] rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={prev}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-[#878787] hover:text-slate-200 transition-colors ${step === 0 ? 'invisible' : ''}`}
            >
              Back
            </button>

            <button
              onClick={next}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold shadow-md shadow-[rgba(5,173,152,0.20)] transition-all active:scale-95"
            >
              {isLast ? (
                domain.trim() ? (
                  <><Search className="w-4 h-4" /> Scan My Domain</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Enter OmniRoute</>
                )
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
