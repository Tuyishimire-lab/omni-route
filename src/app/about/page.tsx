import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Info, Cpu, Shield, BarChart3, ArrowRight, Globe2, Layers, CheckCircle2, Users, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About OmniRoute | The Autonomous Traffic & GEO Protocol',
  description: 'Learn how OmniRoute helps businesses capture traffic from AI search engines and autonomous buyer agents through Generative Engine Optimization and the agent.json protocol.',
};

export default function AboutPage() {
  return (
    <div className="space-y-16 max-w-4xl mx-auto">
      {/* Mission Statement */}
      <section className="space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Info className="w-3.5 h-3.5" />
          <span>About OmniRoute</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          The Future of Web Discovery<br />
          <span className="gradient-text">Is Not Search — It&apos;s AI</span>
        </h1>

        <div className="max-w-3xl space-y-4 text-sm sm:text-base text-[#BBBFBF] leading-relaxed">
          <p>
            Traditional SEO is dying. Over 65% of search queries now end in zero-click AI-generated answers.
            Perplexity, ChatGPT, Claude, and Gemini are replacing Google&apos;s blue links with synthesized responses
            that cite sources directly — or don&apos;t cite them at all.
          </p>
          <p>
            <strong className="text-white">OmniRoute exists to solve this.</strong> We&apos;re building the infrastructure
            layer that ensures your website is discoverable, citable, and transactable in the post-search AI economy.
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <h2 className="text-xl font-bold text-white">The Problem We&apos;re Solving</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              stat: '65%',
              label: 'of searches end in zero-click',
              desc: 'AI engines synthesize answers directly, bypassing your website entirely.',
            },
            {
              stat: '38%',
              label: 'of web traffic is now AI-driven',
              desc: 'Autonomous agents crawl, cite, and transact — but most sites aren\'t ready for them.',
            },
            {
              stat: '$0',
              label: 'revenue from uncited answers',
              desc: 'If AI summarizes your content without linking to you, you lose the click and the customer.',
            },
            {
              stat: '0%',
              label: 'of sites have agent.json',
              desc: 'Almost no websites have machine-readable agent protocols. First movers gain massive advantage.',
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="text-2xl font-extrabold text-[#05AD98] font-mono shrink-0 w-16 text-right">{item.stat}</span>
              <div>
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="text-xs text-[#878787] mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works — Three Pillars */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">How OmniRoute Works</h2>
        <p className="text-sm text-[#878787] text-center max-w-2xl mx-auto">
          A three-tier protocol engineered specifically for the post-search generative AI era.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.08)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] flex items-center justify-center text-[#05AD98]">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">1. GEO Scanner</h3>
            <p className="text-xs text-[#BBBFBF] leading-relaxed">
              Live-crawls any URL via Jina Reader API and analyzes real DOM signals: JSON-LD schemas, heading structure,
              content depth, and table presence. Produces a genuine GEO score based on measurable content signals.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.08)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] flex items-center justify-center text-[#05AD98]">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">2. agent.json Protocol</h3>
            <p className="text-xs text-[#BBBFBF] leading-relaxed">
              A machine-readable standard deployed at <code className="text-[#05AD98] font-mono">/.well-known/agent.json</code>.
              Declares your capabilities, products, and API endpoints so AI buyer agents can discover and transact with you.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.08)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] flex items-center justify-center text-[#05AD98]">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">3. Traffic Analytics</h3>
            <p className="text-xs text-[#BBBFBF] leading-relaxed">
              Deploy our Edge Worker to detect real AI bot traffic (PerplexityBot, GPTBot, ClaudeBot, etc.) and stream
              live telemetry to your OmniRoute dashboard. See exactly which AI engines are crawling your site.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#05AD98]" />
          Built With
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            'Next.js 16', 'React 19', 'TypeScript', 'Prisma 7', 'Turso (libSQL)',
            'Vercel Edge', 'Cloudflare Workers', 'Jina Reader API', 'Recharts',
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] text-xs text-[#BBBFBF] font-mono"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Open Source & Community */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          Open Source & Community
        </h2>
        <p className="text-sm text-[#BBBFBF] leading-relaxed">
          OmniRoute believes the agent.json protocol should be an open standard. Our core scanner, protocol specification,
          and edge worker are designed to be self-hostable and extensible. We welcome contributions, feedback, and
          integrations from the developer community.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.25)] text-xs font-semibold hover:bg-[rgba(5,173,152,0.20)] transition-all"
          >
            Read the Docs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/manifest"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] text-xs font-semibold hover:text-white hover:border-[#05AD98] transition-all"
          >
            Build Your agent.json <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Contact */}
      <section className="text-center space-y-3 py-4">
        <h2 className="text-xl font-bold text-white">Get In Touch</h2>
        <p className="text-sm text-[#878787]">
          Enterprise inquiries, partnership proposals, or feedback — we&apos;d love to hear from you.
        </p>
        <p className="text-sm text-[#05AD98] font-mono">enterprise@omniroute.network</p>
      </section>
    </div>
  );
}
