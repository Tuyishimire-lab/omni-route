import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Check, X, Zap, Shield, Crown, ArrowRight, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing | OmniRoute — GEO Optimization & AI Traffic Plans',
  description: 'Choose the right OmniRoute plan for your business. Free tier for getting started, Pro for serious GEO optimization, Enterprise for custom integrations.',
};

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with basic GEO auditing and community leaderboard access.',
    cta: 'Get Started Free',
    ctaLink: '/audit',
    highlight: false,
    features: [
      { text: '3 GEO scans per hour', included: true },
      { text: '5 watchlist domains', included: true },
      { text: 'Community leaderboard', included: true },
      { text: 'agent.json Studio', included: true },
      { text: 'Basic score reports', included: true },
      { text: 'API key access', included: false },
      { text: 'Daily cron re-scans', included: false },
      { text: 'Edge Worker bot detection', included: false },
      { text: 'Email score alerts', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For teams serious about GEO optimization and monitoring AI search visibility.',
    cta: 'Start Pro Trial',
    ctaLink: '/audit',
    highlight: true,
    features: [
      { text: 'Unlimited GEO scans', included: true },
      { text: '50 watchlist domains', included: true },
      { text: 'Priority leaderboard ranking', included: true },
      { text: 'agent.json Studio + Templates', included: true },
      { text: 'Detailed GEO reports with history', included: true },
      { text: 'API key (1,000 req/hour)', included: true },
      { text: 'Daily automated re-scans', included: true },
      { text: 'Edge Worker bot detection', included: true },
      { text: 'Email score drop alerts', included: true },
      { text: 'Standard support', included: true },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations needing custom integrations, white-label solutions, and dedicated support.',
    cta: 'Contact Sales',
    ctaLink: 'mailto:enterprise@omniroute.network',
    highlight: false,
    features: [
      { text: 'Unlimited everything', included: true },
      { text: 'Unlimited watchlist domains', included: true },
      { text: 'Custom leaderboard categories', included: true },
      { text: 'White-label badge & reporting', included: true },
      { text: 'Custom analytics dashboards', included: true },
      { text: 'Dedicated API key (10,000 req/hour)', included: true },
      { text: 'Real-time webhook integrations', included: true },
      { text: 'Multi-domain edge worker fleet', included: true },
      { text: 'Slack/Teams score alerts', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'What is GEO and why does it matter?',
    a: 'Generative Engine Optimization (GEO) is the practice of optimizing your website to be cited by AI search engines like Perplexity, ChatGPT, Claude, and Gemini. As AI-powered search replaces traditional blue-link results, GEO ensures your brand remains visible and authoritative.',
  },
  {
    q: 'How does the agent.json protocol work?',
    a: 'agent.json is a machine-readable file deployed at /.well-known/agent.json on your domain. It declares your site\'s capabilities, products, and API endpoints so autonomous AI buyer agents can discover and transact with your business programmatically.',
  },
  {
    q: 'Can I try Pro features before committing?',
    a: 'Yes — all Pro plans start with a 14-day free trial. No credit card required. You can downgrade to Free at any time.',
  },
  {
    q: 'What AI bots does the Edge Worker detect?',
    a: 'The Edge Worker detects 13+ AI bot signatures including PerplexityBot, GPTBot, OAI-SearchBot, ClaudeBot, Google-Extended, Applebot-Extended, Cohere, Meta AI Agent, and more. Each detected visit is logged as a telemetry event in your Analytics dashboard.',
  },
  {
    q: 'Do I need a Cloudflare account for the Edge Worker?',
    a: 'Yes — the Edge Worker deploys as a Cloudflare Worker (free tier available). It sits in front of your origin server and intercepts AI bot traffic for telemetry without affecting human visitors.',
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-16 max-w-6xl mx-auto">
      {/* Hero */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Zap className="w-3.5 h-3.5" />
          <span>Simple, Transparent Pricing</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Choose Your <span className="gradient-text">GEO Plan</span>
        </h1>

        <p className="text-sm sm:text-base text-[#BBBFBF] leading-relaxed">
          Start free, upgrade when you need more power. Every plan includes our core GEO scanner and agent.json studio.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative glass-panel rounded-2xl p-6 border space-y-6 flex flex-col ${
              plan.highlight
                ? 'border-[rgba(5,173,152,0.4)] ring-1 ring-[rgba(5,173,152,0.2)]'
                : 'border-[rgba(187,191,191,0.10)]'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#05AD98] to-[#038a79] text-[10px] font-bold text-white uppercase tracking-wider">
                Most Popular
              </div>
            )}

            {/* Plan Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {plan.name === 'Free' && <Shield className="w-5 h-5 text-[#878787]" />}
                {plan.name === 'Pro' && <Zap className="w-5 h-5 text-[#05AD98]" />}
                {plan.name === 'Enterprise' && <Crown className="w-5 h-5 text-[#B8A04A]" />}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                {plan.period && <span className="text-sm text-[#878787]">{plan.period}</span>}
              </div>
              <p className="text-xs text-[#878787] leading-relaxed">{plan.description}</p>
            </div>

            {/* Features */}
            <div className="flex-1 space-y-2.5">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {feature.included ? (
                    <Check className="w-3.5 h-3.5 text-[#05AD98] shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-[#878787]/40 shrink-0" />
                  )}
                  <span className={`text-xs ${feature.included ? 'text-[#BBBFBF]' : 'text-[#878787]/50'}`}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link
              href={plan.ctaLink}
              className={`block text-center py-3 rounded-xl text-sm font-bold transition-all ${
                plan.highlight
                  ? 'bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white shadow-lg shadow-[rgba(5,173,152,0.25)]'
                  : 'bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.15)] hover:text-white hover:border-[#05AD98]'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
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
                <ArrowRight className="w-4 h-4 text-[#878787] group-open:rotate-90 transition-transform" />
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
