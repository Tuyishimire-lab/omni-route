'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Info,
  Activity,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Layers,
  Cpu,
  BarChart3,
  Globe2,
  CheckCircle2
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import TrafficTelemetry from '../components/TrafficTelemetry';
import RoiCalculator from '../components/RoiCalculator';

export default function HomePage() {
  const router = useRouter();
  const [searchDomain, setSearchDomain] = useState('');
  const [liveStats, setLiveStats] = useState({
    domainsRanked: 50,
    avgGeoIndex: 87,
    totalScans: 50,
  });

  useEffect(() => {
    fetch('/api/v1/leaderboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stats && data.stats.domainsRanked > 0) {
          setLiveStats(data.stats);
        }
      })
      .catch((err) => console.warn('Could not load dynamic homepage stats:', err));
  }, []);

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDomain.trim()) {
      router.push('/audit?domain=stripe.com');
    } else {
      router.push(`/audit?domain=${encodeURIComponent(searchDomain.trim())}`);
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative pt-6 pb-4 text-center space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] text-xs font-semibold text-[#05AD98]">
          <Info className="w-3.5 h-3.5" />
          <span>The Next Frontier of Web Discovery: Autonomous Agent Traffic & GEO</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-tight">
          Capture Traffic from <br />
          <span className="gradient-text">AI Engines & Autonomous Buyer Agents</span>
        </h1>

        <p className="text-base sm:text-lg text-[#BBBFBF] max-w-2xl mx-auto leading-relaxed">
          Traditional SEO is dying to zero-click AI summaries. OmniRoute optimizes your semantic authority and deploys machine-readable <code className="text-[#05AD98] font-mono">agent.json</code> endpoints to guarantee top citations and direct transactions.
        </p>

        {/* Live Domain Scanner Box */}
        <form
          onSubmit={handleAuditSubmit}
          className="max-w-2xl mx-auto glass-panel-glow p-2 rounded-2xl flex flex-col sm:flex-row gap-2 shadow-2xl relative z-10"
        >
          <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-[#0A0E0E]/80 rounded-xl border border-[rgba(187,191,191,0.10)]">
            <Globe2 className="w-5 h-5 text-[#878787]" />
            <input
              type="text"
              placeholder="Enter your website domain (e.g. yourbrand.com)"
              value={searchDomain}
              onChange={(e) => setSearchDomain(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[rgba(5,173,152,0.25)] transition-all"
          >
            <span>Scan AI Visibility</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Example Presets */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-[#878787] pt-1">
          <span>Try popular domains:</span>
          {['stripe.com', 'shopify.com', 'linear.app', 'vercel.com', 'openai.com'].map((d) => (
            <button
              key={d}
              onClick={() => router.push(`/audit?domain=${d}`)}
              className="px-2.5 py-1 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] hover:border-sky-500 text-[#BBBFBF] font-mono text-xs transition-colors"
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      {/* Real-time KPI Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Domains Evaluated"
          value={`${liveStats.domainsRanked}+`}
          change="Live Turso Database"
          isPositive={true}
          subtitle="Actively monitored index"
          icon={Globe2}
          accentColor="sky"
        />
        <MetricCard
          title="Network Avg GEO Score"
          value={`${liveStats.avgGeoIndex || 87.2}`}
          change="+4.2 pts this month"
          isPositive={true}
          subtitle="Across Perplexity & OAI"
          icon={Activity}
          accentColor="indigo"
        />
        <MetricCard
          title="Total Scans Executed"
          value={`${liveStats.totalScans}+`}
          change="Continuous telemetry"
          isPositive={true}
          subtitle="DOM signals indexed"
          icon={TrendingUp}
          accentColor="emerald"
        />
        <MetricCard
          title="Attested Routing Latency"
          value="4.2 ms"
          change="Sub-millisecond edge"
          isPositive={true}
          subtitle="Cloudflare edge layer"
          icon={Cpu}
          accentColor="amber"
        />
      </section>

      {/* The 3 Core Pillars of OmniRoute */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white">How OmniRoute Secures Your Web Traffic</h2>
          <p className="text-xs sm:text-sm text-[#878787] mt-1">
            A three-tier protocol engineered specifically for the post-search generative AI era.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] flex items-center justify-center text-[#05AD98]">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">1. Generative Engine Optimization (GEO)</h3>
            <p className="text-xs text-[#BBBFBF] leading-relaxed">
              Injects dense vector anchors, primary empirical benchmarks, and disambiguated entity graphs so Perplexity, ChatGPT, and Claude prioritize your URL as the primary cited authority.
            </p>
            <Link href="/audit" className="inline-flex items-center gap-1.5 text-xs text-[#05AD98] font-semibold hover:underline">
              Run GEO Diagnostics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(5,173,152,0.08)] border border-[rgba(5,173,152,0.20)] flex items-center justify-center text-[#05AD98]">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">2. Universal agent.json Protocol</h3>
            <p className="text-xs text-[#BBBFBF] leading-relaxed">
              Transforms any standard website into an autonomous machine-to-machine API. Personal AI buyer assistants can discover products, query pricing, and execute checkout orders in milliseconds.
            </p>
            <Link href="/manifest" className="inline-flex items-center gap-1.5 text-xs text-[#05AD98] font-semibold hover:underline">
              Build agent.json Manifest <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] flex items-center justify-center text-[#05AD98]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">3. P2P Verified Traffic Liquidity</h3>
            <p className="text-xs text-[#BBBFBF] leading-relaxed">
              A decentralized syndication mesh with cryptographic click attestation. Bypasses the expensive Google/Meta ad duopolies with zero bot fraud and high-intent human referrals.
            </p>
            <Link href="/analytics" className="inline-flex items-center gap-1.5 text-xs text-[#05AD98] font-semibold hover:underline">
              View Liquidity Stream <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live Stream Telemetry Section */}
      <section>
        <TrafficTelemetry />
      </section>

      {/* Interactive ROI Calculator */}
      <section>
        <RoiCalculator />
      </section>
    </div>
  );
}
