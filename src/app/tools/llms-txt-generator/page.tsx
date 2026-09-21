'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  FileCode2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Download,
  Search,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface BotAudit {
  bot: string;
  name: string;
  owner: string;
  role: 'search_citation' | 'training_scrape' | 'general_crawler';
  status: 'ALLOWED' | 'BLOCKED' | 'DEFAULT_ALLOWED';
  matchedRule?: string;
  recommendation: string;
}

interface AuditResponse {
  success: boolean;
  domain: string;
  robotsFound: boolean;
  robotsUrl: string;
  rawRobots: string;
  llmsFound: boolean;
  llmsUrl: string;
  siteMeta: {
    title: string;
    description: string;
  };
  bots: BotAudit[];
  summary: {
    total: number;
    allowed: number;
    blocked: number;
  };
}

export default function LlmsTxtGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'robots' | 'llms'>('robots');
  const [domainInput, setDomainInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Robots.txt Preset States
  const [robotPreset, setRobotPreset] = useState<'recommended' | 'search_only' | 'strict_block'>('recommended');
  const [copiedRobots, setCopiedRobots] = useState(false);
  const [copiedLlms, setCopiedLlms] = useState(false);

  // llms.txt form state
  const [llmsTitle, setLlmsTitle] = useState('My Brand / Project');
  const [llmsSummary, setLlmsSummary] = useState('A modern web platform for AI agent observability and search optimization.');
  const [llmsLinks, setLlmsLinks] = useState([
    { title: 'Overview & Features', url: '/features' },
    { title: 'Documentation & API', url: '/docs' },
    { title: 'Pricing & Plans', url: '/pricing' },
  ]);

  async function handleAuditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setIsLoading(true);
    setAuditError(null);

    try {
      const res = await fetch('/api/v1/tools/crawler-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuditError(data.error || 'Failed to inspect domain robots.txt.');
        setIsLoading(false);
        return;
      }

      setAuditData(data);
      if (data.siteMeta?.title) setLlmsTitle(data.siteMeta.title);
      if (data.siteMeta?.description) setLlmsSummary(data.siteMeta.description);
    } catch {
      setAuditError('Network connection failed. Please verify the domain and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Generate robots.txt based on preset
  const getRobotsSnippet = () => {
    const domainName = auditData?.domain || domainInput || 'example.com';

    if (robotPreset === 'recommended') {
      return `# ==========================================================
# CiteRoute AI-Optimized robots.txt for ${domainName}
# Goal: Maximize AI citations in ChatGPT, Perplexity & Claude
# ==========================================================

# 1. Allow Real-Time AI Search Engines (Citations & Direct Answers)
User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Applebot-Extended
Allow: /

# 2. Block Aggressive Data Mining & Unverified Scrapers
User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

# 3. Default rules for standard search engines
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /private/

# Sitemap & LLMs.txt references
Sitemap: https://${domainName}/sitemap.xml
`;
    }

    if (robotPreset === 'search_only') {
      return `# ==========================================================
# CiteRoute Search-Only robots.txt for ${domainName}
# Goal: Allow AI Search Answers while Blocking AI Model Training
# ==========================================================

# Allow Search Engines to Cite Your Site
User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Block Foundation Model Training Crawlers
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: *
Allow: /
Sitemap: https://${domainName}/sitemap.xml
`;
    }

    // Strict Block
    return `# ==========================================================
# CiteRoute Strict Privacy robots.txt for ${domainName}
# Goal: Disallow all autonomous AI crawlers and data collectors
# ==========================================================

User-agent: GPTBot
Disallow: /

User-agent: OAI-SearchBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: *
Allow: /
`;
  };

  // Generate llms.txt standard compliant text
  const getLlmsTxtSnippet = () => {
    const domainName = auditData?.domain || domainInput || 'example.com';
    const baseUrl = `https://${domainName}`;

    let output = `# ${llmsTitle}\n\n`;
    output += `> ${llmsSummary}\n\n`;
    output += `## Core Resources\n\n`;

    for (const link of llmsLinks) {
      if (link.title && link.url) {
        const fullUrl = link.url.startsWith('http') ? link.url : `${baseUrl}${link.url.startsWith('/') ? '' : '/'}${link.url}`;
        output += `- [${link.title}](${fullUrl}): Essential page information for AI language models.\n`;
      }
    }

    output += `\n## Optional Details\n\n`;
    output += `- [Full Documentation & Schema](${baseUrl}/llms-full.txt): Comprehensive site documentation and machine-readable data.\n`;

    return output;
  };

  const copyToClipboard = (text: string, type: 'robots' | 'llms') => {
    navigator.clipboard.writeText(text);
    if (type === 'robots') {
      setCopiedRobots(true);
      setTimeout(() => setCopiedRobots(false), 2000);
    } else {
      setCopiedLlms(true);
      setTimeout(() => setCopiedLlms(false), 2000);
    }
  };

  const downloadFile = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.25)] text-[#05AD98] text-xs font-semibold">
          <Bot className="w-3.5 h-3.5" />
          Free AI Crawler Tool
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          AI Crawler <span className="text-[#05AD98]">robots.txt</span> & <span className="text-[#05AD98]">llms.txt</span> Generator
        </h1>
        <p className="text-sm text-[#BBBFBF] leading-relaxed">
          Audit how ChatGPT, Claude, and Perplexity crawl your website. Generate compliant <code className="text-[#05AD98] bg-[#0A0E0E] px-1.5 py-0.5 rounded border border-[rgba(5,173,152,0.2)] font-mono text-xs">llms.txt</code> files and optimized <code className="text-[#05AD98] bg-[#0A0E0E] px-1.5 py-0.5 rounded border border-[rgba(5,173,152,0.2)] font-mono text-xs">robots.txt</code> presets to maximize citations.
        </p>
      </div>

      {/* Domain Input Form */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleAuditSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#878787] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="Enter domain (e.g. stripe.com or citeroute.com)"
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.15)] rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#05AD98] placeholder-[#878787]/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !domainInput.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[rgba(5,173,152,0.2)]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Audit Domain</span>
              </>
            )}
          </button>
        </form>

        {auditError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{auditError}</span>
          </div>
        )}
      </div>

      {/* Audit Overview Card (If Audited) */}
      {auditData && (
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.12)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(187,191,191,0.10)] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-mono">{auditData.domain}</h2>
                <a
                  href={auditData.robotsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#05AD98] hover:underline flex items-center gap-1"
                >
                  View robots.txt <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-[#878787] mt-0.5">
                {auditData.robotsFound
                  ? 'Found active robots.txt file on this domain'
                  : 'No robots.txt detected (all crawlers currently default to allowed)'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] flex items-center gap-2">
                <span className="text-[#878787]">AI Bots Allowed:</span>
                <span className="font-bold text-[#05AD98]">{auditData.summary.allowed} / {auditData.summary.total}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] flex items-center gap-2">
                <span className="text-[#878787]">llms.txt:</span>
                <span className={`font-bold ${auditData.llmsFound ? 'text-[#05AD98]' : 'text-amber-400'}`}>
                  {auditData.llmsFound ? 'Detected' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          {/* Crawler Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {auditData.bots.map((b) => (
              <div
                key={b.bot}
                className="bg-[#0A0E0E] border border-[rgba(187,191,191,0.10)] rounded-xl p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-white leading-snug">{b.name}</h3>
                    <span className="text-[10px] text-[#878787] font-mono">{b.bot}</span>
                  </div>
                  {b.status === 'ALLOWED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Allowed
                    </span>
                  ) : b.status === 'BLOCKED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/40 shrink-0">
                      <XCircle className="w-2.5 h-2.5" /> Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-700/40 shrink-0">
                      Default Open
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#BBBFBF] leading-relaxed line-clamp-2">
                  {b.recommendation}
                </p>
                {b.matchedRule && (
                  <div className="pt-1 text-[9px] font-mono text-slate-500 truncate">
                    Rule: {b.matchedRule}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] p-1 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('robots')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.98] ${
                activeTab === 'robots'
                  ? 'bg-gradient-to-r from-[#05AD98] to-[#038a79] text-white shadow-md'
                  : 'text-[#878787] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              AI robots.txt Presets
            </button>
            <button
              onClick={() => setActiveTab('llms')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.98] ${
                activeTab === 'llms'
                  ? 'bg-gradient-to-r from-[#05AD98] to-[#038a79] text-white shadow-md'
                  : 'text-[#878787] hover:text-white'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              llms.txt Builder
            </button>
          </div>
        </div>

        {/* Tab 1: robots.txt Generator */}
        {activeTab === 'robots' && (
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.12)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Choose Your AI Crawler Strategy</h2>
                <p className="text-xs text-[#878787] mt-0.5">
                  Select a proven configuration for your website&apos;s <code className="text-[#05AD98]">/robots.txt</code> file.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRobotPreset('recommended')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    robotPreset === 'recommended'
                      ? 'bg-[rgba(5,173,152,0.15)] border-[#05AD98] text-[#05AD98]'
                      : 'bg-[#0A0E0E] border-[rgba(187,191,191,0.15)] text-[#BBBFBF] hover:text-white'
                  }`}
                >
                  Max Citations (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setRobotPreset('search_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    robotPreset === 'search_only'
                      ? 'bg-[rgba(5,173,152,0.15)] border-[#05AD98] text-[#05AD98]'
                      : 'bg-[#0A0E0E] border-[rgba(187,191,191,0.15)] text-[#BBBFBF] hover:text-white'
                  }`}
                >
                  Search Only (No Training)
                </button>
                <button
                  type="button"
                  onClick={() => setRobotPreset('strict_block')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    robotPreset === 'strict_block'
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                      : 'bg-[#0A0E0E] border-[rgba(187,191,191,0.15)] text-[#BBBFBF] hover:text-white'
                  }`}
                >
                  Block All AI Bots
                </button>
              </div>
            </div>

            {/* Code Output */}
            <div className="relative bg-[#050707] border border-[rgba(187,191,191,0.15)] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A0E0E] border-b border-[rgba(187,191,191,0.10)] text-xs text-[#878787] font-mono">
                <span>robots.txt</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyToClipboard(getRobotsSnippet(), 'robots')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2020] text-[#BBBFBF] hover:text-white transition-colors active:scale-95 text-xs"
                  >
                    {copiedRobots ? <CheckCircle2 className="w-3.5 h-3.5 text-[#05AD98]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRobots ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile('robots.txt', getRobotsSnippet())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2020] text-[#BBBFBF] hover:text-white transition-colors active:scale-95 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 text-xs font-mono text-[#E2E8F0] overflow-x-auto whitespace-pre leading-relaxed">
                {getRobotsSnippet()}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: llms.txt Builder */}
        {activeTab === 'llms' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.12)] space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">llms.txt Metadata</h2>
                <p className="text-xs text-[#878787] mt-0.5">
                  The <code className="text-[#05AD98]">/llms.txt</code> standard allows LLMs to rapidly understand your product without crawling thousands of HTML pages.
                </p>
              </div>

              <div>
                <label className="text-xs text-[#878787] block mb-1">Project or Brand Name</label>
                <input
                  type="text"
                  value={llmsTitle}
                  onChange={(e) => setLlmsTitle(e.target.value)}
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.15)] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#05AD98]"
                />
              </div>

              <div>
                <label className="text-xs text-[#878787] block mb-1">One-Sentence Summary</label>
                <textarea
                  value={llmsSummary}
                  onChange={(e) => setLlmsSummary(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.15)] rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#05AD98]"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs text-[#878787] block">Core Resource Links</label>
                {llmsLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={link.title}
                      placeholder="Page Title"
                      onChange={(e) => {
                        const updated = [...llmsLinks];
                        updated[idx].title = e.target.value;
                        setLlmsLinks(updated);
                      }}
                      className="w-1/2 bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#05AD98]"
                    />
                    <input
                      type="text"
                      value={link.url}
                      placeholder="/path or URL"
                      onChange={(e) => {
                        const updated = [...llmsLinks];
                        updated[idx].url = e.target.value;
                        setLlmsLinks(updated);
                      }}
                      className="w-1/2 bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#05AD98]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-[rgba(187,191,191,0.12)] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">Generated /llms.txt</h2>
                  <p className="text-xs text-[#878787]">Host this file at the root of your domain (<code className="text-[#05AD98]">https://yourdomain.com/llms.txt</code>).</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyToClipboard(getLlmsTxtSnippet(), 'llms')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2020] text-xs text-[#BBBFBF] hover:text-white transition-colors active:scale-95"
                  >
                    {copiedLlms ? <CheckCircle2 className="w-3.5 h-3.5 text-[#05AD98]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLlms ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile('llms.txt', getLlmsTxtSnippet())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#05AD98] to-[#038a79] text-xs text-white font-semibold transition-all shadow-md shadow-[rgba(5,173,152,0.2)] active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#050707] border border-[rgba(187,191,191,0.15)] rounded-xl p-4">
                <pre className="text-xs font-mono text-[#E2E8F0] overflow-x-auto whitespace-pre leading-relaxed">
                  {getLlmsTxtSnippet()}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conversion Banner to CiteRoute GEO Scanner */}
      <div className="glass-panel rounded-2xl p-8 border border-[rgba(5,173,152,0.25)] relative overflow-hidden bg-gradient-to-r from-[rgba(5,173,152,0.06)] to-transparent">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-extrabold text-white">
              Want to see if AI engines are already citing your brand?
            </h3>
            <p className="text-xs text-[#BBBFBF] max-w-xl leading-relaxed">
              Run a free CiteRoute GEO audit to measure citation probability across ChatGPT, Claude, and Perplexity with live generative engine telemetry.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold transition-all shadow-lg shadow-[rgba(5,173,152,0.25)] flex items-center gap-2"
          >
            <span>Scan Your Domain Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
