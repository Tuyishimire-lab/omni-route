'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GeoAuditReport } from '../../../lib/types';
import AuditResultView from '../../../components/AuditResultView';
import {
  Share2,
  Copy,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function ShareableAuditClient({ initialDomain }: { initialDomain: string }) {
  const [report, setReport] = useState<GeoAuditReport | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function runScan() {
      setIsScanning(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: initialDomain }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          setReport(data.data);
        } else {
          setError(data.error || 'Failed to generate audit report.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Network error loading report.');
      } finally {
        setIsScanning(false);
      }
    }

    runScan();
  }, [initialDomain]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://www.citeroute.com/audit/${initialDomain}`;
  const score = report ? report.overallGeoScore : 88;

  const tweetText = encodeURIComponent(
    `Check out the Generative Engine Optimization (GEO) score for ${initialDomain} on @CiteRoute: ${score}/100! Discover how ChatGPT, Claude & Perplexity cite your domain:`
  );
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(currentUrl)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Share Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.12)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(5,173,152,0.12)] border border-[rgba(5,173,152,0.3)] flex items-center justify-center text-[#05AD98]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white font-mono tracking-tight">{initialDomain}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0A0E0E] text-[#05AD98] border border-[rgba(5,173,152,0.3)]">
                Public Report
              </span>
            </div>
            <p className="text-xs text-[#878787]">
              Real-time Generative Engine Optimization & Citation Audit
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Share on X */}
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2020] hover:bg-[#222A2A] border border-[rgba(187,191,191,0.15)] text-xs font-semibold text-white transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Share on X</span>
          </a>

          {/* Share on LinkedIn */}
          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2020] hover:bg-[#222A2A] border border-[rgba(187,191,191,0.15)] text-xs font-semibold text-white transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5 fill-current text-[#0A66C2]" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            <span>LinkedIn</span>
          </a>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-xs font-bold text-white transition-all shadow-md shadow-[rgba(5,173,152,0.25)]"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isScanning ? (
        <div className="glass-panel rounded-2xl p-16 text-center space-y-4 border border-[rgba(187,191,191,0.10)]">
          <div className="w-12 h-12 rounded-full border-3 border-[#05AD98] border-t-transparent animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Analyzing {initialDomain}</h3>
            <p className="text-xs text-[#878787]">
              Simulating crawler access across ChatGPT, Claude, and Perplexity...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-4 border border-rose-900/30">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A2020] text-xs text-white hover:bg-[#222A2A] border border-[rgba(187,191,191,0.15)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Audit</span>
          </button>
        </div>
      ) : report ? (
        <div className="space-y-8">
          <AuditResultView report={report} />

          {/* Pro Upgrade CTA */}
          <div className="glass-panel rounded-2xl border border-[rgba(5,173,152,0.30)] relative overflow-hidden">
            {/* Gradient top border accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#05AD98] to-transparent" />

            <div className="p-8 space-y-6">
              {/* Badge */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Upgrade to Pro
                </div>
                <span className="text-[10px] font-mono text-[#878787]">
                  Starting at $29/mo
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  Track this score weekly. Get actionable fixes.
                </h3>
                <p className="text-sm text-[#BBBFBF] leading-relaxed max-w-xl">
                  This one-time audit is just the start. Pro members get continuous monitoring,
                  weekly score change alerts, and specific recommendations to improve AI citation rates.
                </p>
              </div>

              {/* Value props grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-[rgba(5,173,152,0.04)] border border-[rgba(5,173,152,0.12)] p-4 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(5,173,152,0.10)] flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-[#05AD98]" />
                  </div>
                  <p className="text-xs font-bold text-white">Weekly GEO Tracking</p>
                  <p className="text-[10px] text-[#878787] leading-relaxed">
                    Automatic rescans every week with score change alerts delivered to your inbox.
                  </p>
                </div>
                <div className="rounded-xl bg-[rgba(5,173,152,0.04)] border border-[rgba(5,173,152,0.12)] p-4 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(5,173,152,0.10)] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#05AD98]" />
                  </div>
                  <p className="text-xs font-bold text-white">Actionable Fixes</p>
                  <p className="text-[10px] text-[#878787] leading-relaxed">
                    Specific recommendations to improve structured data, entity coverage, and vector readiness.
                  </p>
                </div>
                <div className="rounded-xl bg-[rgba(5,173,152,0.04)] border border-[rgba(5,173,152,0.12)] p-4 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(5,173,152,0.10)] flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-[#05AD98]" />
                  </div>
                  <p className="text-xs font-bold text-white">Unlimited Scans</p>
                  <p className="text-[10px] text-[#878787] leading-relaxed">
                    Monitor up to 10 competitor domains and benchmark your progress against industry leaders.
                  </p>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold transition-all shadow-lg shadow-[rgba(5,173,152,0.25)] flex items-center justify-center gap-2"
                >
                  <span>Start Pro Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1A2020] hover:bg-[#222A2A] border border-[rgba(187,191,191,0.12)] text-[#BBBFBF] hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  <span>Audit Another Domain</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
