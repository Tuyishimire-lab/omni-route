'use client';

import React, { useState, useEffect } from 'react';
import {
  Database, Building2, ArrowRight, X, CheckCircle2, Loader2, Sparkles, Send, Shield,
  Download, Code2, FileSpreadsheet, Calendar, Copy, Check, ChevronDown, ChevronUp
} from 'lucide-react';

export interface DataProduct {
  name: string;
  price: string;
  period: string;
  desc: string;
  badge?: string;
  recommendedFor: string;
}

export const DATA_PRODUCTS: DataProduct[] = [
  {
    name: 'Vertical Leaderboard',
    price: '$500',
    period: '/month',
    desc: 'Private weekly ranking of AI citation leaders in your industry vertical - delivered as API or CSV.',
    recommendedFor: 'Growing marketing teams & boutique agencies',
  },
  {
    name: 'Competitor Benchmarking',
    price: '$1,500',
    period: '/month',
    desc: 'Track how your GEO score and AI citation share trends vs. up to 20 named competitors over time.',
    badge: 'MOST POPULAR',
    recommendedFor: 'Scale-ups & mid-market brands defending category search share',
  },
  {
    name: 'Full Index Access',
    price: '$5,000',
    period: '/month',
    desc: 'Raw access to the full domain index, AI crawler visit data, and citation events via private API endpoint.',
    badge: 'UNLIMITED',
    recommendedFor: 'Enterprise data teams, LLM labs & financial research analysts',
  },
];

const INDUSTRIES = [
  'Fintech & Banking',
  'AI & Frontier Tech',
  'Developer Tools & Cloud',
  'SaaS & B2B Software',
  'E-commerce & Retail',
  'Healthcare & Biotech',
  'Cybersecurity',
  'Other / Custom Vertical',
];

const DELIVERY_FORMATS = [
  'Private REST API Key',
  'Automated Weekly CSV Export',
  'Real-Time Webhook Feed',
  'Snowflake / BigQuery Sync',
];

const SAMPLE_JSON_DATA = {
  feed_type: 'citeroute.enterprise.v1',
  generated_at: '2026-09-14T20:30:00.000Z',
  vertical: 'Fintech & Banking',
  total_tracked_domains: 184,
  data_points: [
    {
      rank: 1,
      domain: 'stripe.com',
      geo_score: 89,
      ai_citation_share_pct: 34.2,
      verified_crawler_hits_30d: 18450,
      primary_citing_engine: 'perplexity',
      engine_breakdown: {
        perplexity: 42.1,
        chatgpt_search: 31.5,
        google_gemini: 18.3,
        claude: 8.1,
      },
      agent_protocol_supported: true,
      last_observed_crawl: '2026-09-14T19:42:11Z',
    },
    {
      rank: 2,
      domain: 'adyen.com',
      geo_score: 76,
      ai_citation_share_pct: 19.4,
      verified_crawler_hits_30d: 9820,
      primary_citing_engine: 'chatgpt_search',
      engine_breakdown: {
        perplexity: 24.0,
        chatgpt_search: 45.2,
        google_gemini: 21.0,
        claude: 9.8,
      },
      agent_protocol_supported: false,
      last_observed_crawl: '2026-09-14T18:15:02Z',
    },
    {
      rank: 3,
      domain: 'checkout.com',
      geo_score: 71,
      ai_citation_share_pct: 13.8,
      verified_crawler_hits_30d: 6540,
      primary_citing_engine: 'google_gemini',
      engine_breakdown: {
        perplexity: 28.5,
        chatgpt_search: 22.1,
        google_gemini: 39.4,
        claude: 10.0,
      },
      agent_protocol_supported: true,
      last_observed_crawl: '2026-09-14T16:22:45Z',
    },
  ],
};

const SAMPLE_CSV_DATA = `rank,domain,vertical,geo_score,citation_share_pct,crawler_hits_30d,primary_engine,agent_protocol_active,last_observed_crawl
1,stripe.com,Fintech & Banking,89,34.2%,18450,perplexity,true,2026-09-14T19:42:11Z
2,adyen.com,Fintech & Banking,76,19.4%,9820,chatgpt_search,false,2026-09-14T18:15:02Z
3,checkout.com,Fintech & Banking,71,13.8%,6540,google_gemini,true,2026-09-14T16:22:45Z
4,revolut.com,Fintech & Banking,68,11.2%,5890,perplexity,false,2026-09-14T15:04:19Z
5,wise.com,Fintech & Banking,65,9.5%,4320,chatgpt_search,true,2026-09-14T14:10:30Z`;

export default function EnterpriseDataSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DataProduct>(DATA_PRODUCTS[1]);

  // Sample inspector state
  const [showPreview, setShowPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'json' | 'csv'>('json');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [deliveryFormat, setDeliveryFormat] = useState(DELIVERY_FORMATS[0]);
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Listen for external trigger from pricing cards or header
  useEffect(() => {
    const handleExternalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ productName?: string }>;
      const targetName = customEvent.detail?.productName;
      if (targetName) {
        const found = DATA_PRODUCTS.find((p) => p.name.toLowerCase() === targetName.toLowerCase());
        if (found) setSelectedProduct(found);
      } else {
        setSelectedProduct(DATA_PRODUCTS[2]); // Default to Full Index / Enterprise
      }
      setIsSubmitted(false);
      setErrorMsg(null);
      setIsModalOpen(true);
    };

    window.addEventListener('open-enterprise-inquiry', handleExternalTrigger);
    return () => window.removeEventListener('open-enterprise-inquiry', handleExternalTrigger);
  }, []);

  const handleOpenModal = (product?: DataProduct) => {
    if (product) setSelectedProduct(product);
    setErrorMsg(null);
    setIsSubmitted(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCopySnippet = () => {
    const content = previewFormat === 'json'
      ? JSON.stringify(SAMPLE_JSON_DATA, null, 2)
      : SAMPLE_CSV_DATA;
    navigator.clipboard.writeText(content);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleDownloadCsv = () => {
    const blob = new Blob([SAMPLE_CSV_DATA], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'citeroute_enterprise_sample_feed.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/enterprise/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          website,
          product: selectedProduct.name,
          price: `${selectedProduct.price}${selectedProduct.period}`,
          industry,
          deliveryFormat,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error submitting inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section
        id="enterprise-data"
        className="glass-panel rounded-3xl border border-[rgba(184,160,74,0.25)] bg-[rgba(184,160,74,0.03)] p-6 sm:p-10 space-y-8 relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[rgba(184,160,74,0.06)] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[rgba(184,160,74,0.15)] text-[#B8A04A] border border-[rgba(184,160,74,0.30)]">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Data Subscriptions</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[rgba(184,160,74,0.15)] text-[#B8A04A] border border-[rgba(184,160,74,0.30)] tracking-wider">
                ENTERPRISE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#BBBFBF] leading-relaxed">
              The CiteRoute index is a unique ground-truth dataset — which domains AI engines cite, at what frequency, with real crawler fingerprints. Available as a private feed or custom data pipeline.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111615] hover:bg-[#161D1C] border border-[rgba(187,191,191,0.15)] text-xs font-semibold text-[#BBBFBF] hover:text-white transition-all"
            >
              <Code2 className="w-3.5 h-3.5 text-[#B8A04A]" />
              <span>{showPreview ? 'Hide Sample' : 'Preview Data Feed'}</span>
              {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => handleOpenModal(DATA_PRODUCTS[1])}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgba(184,160,74,0.12)] hover:bg-[rgba(184,160,74,0.20)] border border-[rgba(184,160,74,0.30)] text-xs font-bold text-[#B8A04A] transition-all hover:scale-[1.02] shadow-sm shadow-[rgba(184,160,74,0.15)]"
            >
              <span>Talk to us</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
          {DATA_PRODUCTS.map((product) => {
            return (
              <div
                key={product.name}
                onClick={() => handleOpenModal(product)}
                className={`group cursor-pointer rounded-2xl border p-6 space-y-4 transition-all duration-200 flex flex-col justify-between relative ${
                  product.badge
                    ? 'bg-[#101413] border-[rgba(184,160,74,0.35)] shadow-lg shadow-[rgba(184,160,74,0.08)] hover:border-[#B8A04A]'
                    : 'bg-[#0E1211] border-[rgba(184,160,74,0.18)] hover:border-[rgba(184,160,74,0.40)]'
                } hover:-translate-y-1`}
              >
                {product.badge && (
                  <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#B8A04A] text-black tracking-wider uppercase shadow-md">
                    {product.badge}
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#B8A04A]" />
                    <h3 className="text-sm font-bold text-white group-hover:text-[#B8A04A] transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#B8A04A] tracking-tight">{product.price}</span>
                    <span className="text-xs text-[#878787] font-medium">{product.period}</span>
                  </div>

                  <p className="text-xs text-[#BBBFBF] leading-relaxed">{product.desc}</p>
                </div>

                <div className="pt-3 border-t border-[rgba(187,191,191,0.08)] space-y-3">
                  <span className="text-[10px] text-[#878787] block line-clamp-1">
                    Best for: <strong className="text-white font-normal">{product.recommendedFor}</strong>
                  </span>

                  <button
                    type="button"
                    className="w-full py-2 px-3.5 rounded-xl text-xs font-bold text-white bg-[rgba(184,160,74,0.15)] group-hover:bg-[#B8A04A] group-hover:text-black transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Request Feed & Sample</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Sample Dataset Drawer */}
        {showPreview && (
          <div className="relative z-10 rounded-2xl border border-[rgba(184,160,74,0.20)] bg-[#0A0E0D] p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B8A04A]" />
                  <h4 className="text-sm font-bold text-white">Live Data Feed Sample Inspector</h4>
                </div>
                <p className="text-[11px] text-[#878787]">
                  Real schema structure with crawler telemetry, GEO authority scores, and engine-by-engine citation shares.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-[#121817] border border-[rgba(187,191,191,0.1)]">
                  <button
                    onClick={() => setPreviewFormat('json')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      previewFormat === 'json'
                        ? 'bg-[rgba(184,160,74,0.2)] text-[#B8A04A]'
                        : 'text-[#878787] hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    <span>JSON API</span>
                  </button>
                  <button
                    onClick={() => setPreviewFormat('csv')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      previewFormat === 'csv'
                        ? 'bg-[rgba(184,160,74,0.2)] text-[#B8A04A]'
                        : 'text-[#878787] hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>CSV Feed</span>
                  </button>
                </div>

                <button
                  onClick={handleCopySnippet}
                  className="p-2 rounded-xl bg-[#121817] hover:bg-[#1A2220] border border-[rgba(187,191,191,0.1)] text-[#878787] hover:text-white text-xs transition-all flex items-center gap-1"
                  title="Copy snippet"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-[#05AD98]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={handleDownloadCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(5,173,152,0.15)] hover:bg-[rgba(5,173,152,0.25)] border border-[rgba(5,173,152,0.3)] text-xs font-semibold text-[#05AD98] transition-all"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Sample CSV</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#060808] border border-[rgba(187,191,191,0.08)] p-4 font-mono text-xs overflow-x-auto max-h-72 leading-relaxed text-[#A7B2B0]">
              {previewFormat === 'json' ? (
                <pre>{JSON.stringify(SAMPLE_JSON_DATA, null, 2)}</pre>
              ) : (
                <pre>{SAMPLE_CSV_DATA}</pre>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Enterprise Inquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0D1312] border border-[rgba(184,160,74,0.30)] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-[#878787] hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              /* Success View */
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(5,173,152,0.15)] border border-[rgba(5,173,152,0.3)] text-[#05AD98] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Inquiry Received</h3>
                  <p className="text-xs text-[#BBBFBF] max-w-md mx-auto leading-relaxed">
                    Thank you, <strong className="text-white">{name}</strong>. Our enterprise data team has logged your specifications for <strong className="text-[#B8A04A]">{selectedProduct.name}</strong> and sent a confirmation receipt to <strong className="text-white">{email}</strong>.
                  </p>
                </div>

                {/* Fast Track Booking */}
                <div className="p-4 rounded-2xl bg-[#111716] border border-[rgba(184,160,74,0.25)] text-left space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Calendar className="w-4 h-4 text-[#B8A04A]" />
                    <span>Fast-Track Your Feed (Optional)</span>
                  </div>
                  <p className="text-[11px] text-[#878787] leading-relaxed">
                    Need a custom NDA, snowflake direct share, or bespoke entity matching? Schedule a 15-minute technical briefing directly with our data engineers.
                  </p>
                  <a
                    href="mailto:contact@citeroute.com?subject=Schedule%2015-Min%20Enterprise%20Briefing"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(184,160,74,0.15)] hover:bg-[rgba(184,160,74,0.25)] border border-[rgba(184,160,74,0.3)] text-xs font-bold text-[#B8A04A] transition-all"
                  >
                    <span>Request Technical Briefing</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#B8A04A] to-[#998235] text-black font-bold text-xs shadow-lg hover:opacity-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Form View */
              <>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(184,160,74,0.12)] text-[#B8A04A] border border-[rgba(184,160,74,0.25)] text-[10px] font-extrabold uppercase">
                    <Sparkles className="w-3 h-3" />
                    Enterprise Data Feed
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    Request {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-[#878787]">
                    Access ground-truth GEO intelligence and AI crawler telemetry tailored to your vertical.
                  </p>
                </div>

                {/* Selected Tier Banner */}
                <div className="p-3 rounded-xl bg-[#111716] border border-[rgba(184,160,74,0.2)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#878787] uppercase font-semibold block">Feed Level</span>
                    <span className="text-xs font-bold text-white">{selectedProduct.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#B8A04A]">{selectedProduct.price}</span>
                    <span className="text-[10px] text-[#878787]">{selectedProduct.period}</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Work Email *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Company Name *</label>
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Acme Corp"
                        className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Website URL</label>
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="acme.com"
                        className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Industry Vertical</label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                      >
                        {INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind} className="bg-[#0D1312] text-white">
                            {ind}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">Delivery Format</label>
                      <select
                        value={deliveryFormat}
                        onChange={(e) => setDeliveryFormat(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none"
                      >
                        {DELIVERY_FORMATS.map((fmt) => (
                          <option key={fmt} value={fmt} className="bg-[#0D1312] text-white">
                            {fmt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#BBBFBF] uppercase">
                      Specific Competitors or Requirements
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. We want to monitor stripe.com, adyen.com, and checkout.com weekly for citation share in Europe..."
                      className="w-full px-3 py-2 rounded-xl bg-[#080C0B] border border-[rgba(187,191,191,0.15)] focus:border-[#B8A04A] text-xs text-white outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#878787]">
                      <Shield className="w-3.5 h-3.5 text-[#05AD98]" />
                      <span>Direct NDA & SLA available</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8A04A] to-[#998235] hover:opacity-95 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[rgba(184,160,74,0.25)] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Request</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
