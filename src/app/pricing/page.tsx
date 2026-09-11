import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Check, X, Zap, Shield, Crown, ArrowRight, HelpCircle, Code2, Database, Building2, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing | CiteRoute - GEO Optimization & AI Traffic Plans',
  description: 'Simple, transparent pricing for GEO optimization. Free to start, $79/mo for Pro, $249/mo for agencies. API access from $0.01/call. Data subscriptions for enterprise.',
};

import PricingCards from '../../components/PricingCards';

const FAQ_ITEMS = [
  {
    q: 'What is GEO and why does it matter?',
    a: 'Generative Engine Optimization (GEO) is the practice of making your website more likely to be cited by AI search engines like Perplexity, ChatGPT, Claude, and Gemini. As AI-powered search replaces traditional blue-link results, GEO determines whether your brand appears in the answers that millions of people see every day.',
  },
  {
    q: 'How does the tracking tag work?',
    a: 'You add one script tag to your site. Every time a visitor loads a page, the tag fires a lightweight beacon to CiteRoute. We classify the visitor\'s user-agent against 13+ known AI crawler signatures and log the event to your private analytics dashboard - no personal data collected.',
  },
  {
    q: 'Why is Pro $79 instead of $29?',
    a: 'The old $29 price didn\'t reflect the actual value: real AI traffic data, daily automated re-scans, and a verified tracking tag are infrastructure-level features. Comparable tools (Ahrefs, Semrush) charge $99-$449/mo. At $79 you get a data product, not just a dashboard.',
  },
  {
    q: 'What does the API key unlock?',
    a: 'The API lets you query GEO scores, verify agent.json files, and retrieve AI traffic data programmatically. Pro gets 500 req/day, Agency gets 10,000 req/day. Pricing is per-call for high-volume usage beyond these limits: $0.01-$0.05 per call depending on endpoint.',
  },
  {
    q: 'What are Data Subscriptions for Enterprise?',
    a: 'Enterprise customers can subscribe to a private data feed: which domains are winning AI citations in their vertical, how their competitors\' GEO scores trend over time, and raw AI crawler visit data. This is the same index that powers the public leaderboard, delivered as a private API or CSV export.',
  },
  {
    q: 'Do I need a Cloudflare account?',
    a: 'No. The tracking tag is a simple JavaScript snippet that works on any website - Next.js, WordPress, Webflow, or plain HTML. The optional Cloudflare Edge Worker adds server-side bot detection for sites that need it, but it\'s not required.',
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-20 max-w-6xl mx-auto">

      {/* Hero */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Zap className="w-3.5 h-3.5" />
          <span>Simple, Transparent Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Invest in your <span className="gradient-text">AI visibility</span>
        </h1>
        <p className="text-sm sm:text-base text-[#BBBFBF] leading-relaxed">
          Start free. Upgrade when you need real data. Every plan includes the GEO scanner and agent.json studio.
        </p>
      </section>

      {/* Pricing Cards */}
      <section>
        <PricingCards />
      </section>

      {/* API Pricing */}
      <section className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] p-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#05AD98]" />
              <h2 className="text-xl font-bold text-white">API Pricing</h2>
            </div>
            <p className="text-sm text-[#878787]">
              Pay-per-call for high-volume usage beyond your plan&apos;s daily limit. No monthly commitment.
            </p>
          </div>
          <Link href="/docs" className="flex items-center gap-1.5 text-xs text-[#05AD98] font-semibold hover:underline">
            View API docs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { endpoint: '/api/v1/geo-score', price: '$0.02', unit: 'per call', desc: 'Full GEO audit of any domain - scores, citations, agent discoverability.' },
            { endpoint: '/api/v1/verify', price: '$0.01', unit: 'per call', desc: 'Verify that a domain has a valid tracking tag or agent.json installed.' },
            { endpoint: '/api/v1/ai-traffic', price: '$0.05', unit: 'per call', desc: 'Return AI crawler visit volume and breakdown for a tracked domain.' },
          ].map((api) => (
            <div key={api.endpoint} className="bg-[#111514] rounded-xl border border-[rgba(187,191,191,0.08)] p-4 space-y-2">
              <code className="text-[10px] font-mono text-[#05AD98] block truncate">{api.endpoint}</code>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white">{api.price}</span>
                <span className="text-xs text-[#878787]">{api.unit}</span>
              </div>
              <p className="text-[11px] text-[#878787] leading-relaxed">{api.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#878787]">
          All plan API keys work immediately. Overage calls beyond your daily limit are billed at the rates above at month end.
        </p>
      </section>

      {/* Data Products */}
      <section className="glass-panel rounded-2xl border border-[rgba(184,160,74,0.20)] bg-[rgba(184,160,74,0.03)] p-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#B8A04A]" />
              <h2 className="text-xl font-bold text-white">Data Subscriptions</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[rgba(184,160,74,0.12)] text-[#B8A04A] border border-[rgba(184,160,74,0.25)]">ENTERPRISE</span>
            </div>
            <p className="text-sm text-[#878787]">
              The CiteRoute index is a unique ground-truth dataset - which domains AI engines cite, at what frequency, with real crawler fingerprints. Available as a private feed.
            </p>
          </div>
          <Link href="mailto:tuyishime1angel@gmail.com?subject=CiteRoute%20Enterprise%20Data%20Subscriptions" className="flex items-center gap-1.5 text-xs text-[#B8A04A] font-semibold hover:underline">
            Talk to us <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: 'Vertical Leaderboard', price: '$500', period: '/month', desc: 'Private weekly ranking of AI citation leaders in your industry vertical - delivered as API or CSV.' },
            { name: 'Competitor Benchmarking', price: '$1,500', period: '/month', desc: 'Track how your GEO score and AI citation share trends vs. up to 20 named competitors over time.' },
            { name: 'Full Index Access', price: '$5,000', period: '/month', desc: 'Raw access to the full domain index, AI crawler visit data, and citation events via private API endpoint.' },
          ].map((product) => (
            <div key={product.name} className="bg-[#111514] rounded-xl border border-[rgba(184,160,74,0.12)] p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#B8A04A]" />
                <span className="text-xs font-bold text-white">{product.name}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-[#B8A04A]">{product.price}</span>
                <span className="text-xs text-[#878787]">{product.period}</span>
              </div>
              <p className="text-[11px] text-[#878787] leading-relaxed">{product.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white text-center flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#05AD98]" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              className="glass-panel rounded-xl border border-[rgba(187,191,191,0.08)] group"
            >
              <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-white hover:text-[#05AD98] transition-colors list-none flex items-center justify-between">
                <span>{item.q}</span>
                <ArrowRight className="w-4 h-4 text-[#878787] group-open:rotate-90 transition-transform shrink-0" />
              </summary>
              <div className="px-5 pb-4 text-xs text-[#BBBFBF] leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

    </div>
  );
}

