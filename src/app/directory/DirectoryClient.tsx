'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  BarChart3,
  Globe,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronUp,
  Folder,
} from 'lucide-react';

interface DirectoryDomain {
  domain: string;
  category: string;
  latestGeoScore: number;
  status: string;
  trend: string;
  trendDelta: number;
  scanCount: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  'AI/Tech': '',
  'Developer Tools': '',
  Fintech: '',
  'SaaS/Productivity': '',
  'Design/Creative': '',
  'E-Commerce': '',
  'Marketing/Sales': '',
  'Security/Compliance': '',
  'Analytics/Data': '',
  'Cloud/Infrastructure': '',
  'HR/Recruiting': '',
  'Education/EdTech': '',
  'Healthcare/BioTech': '',
  'Media/Content': '',
  'Legal/GovTech': '',
  'Sustainability/Climate': '',
  'Crypto/Web3': '',
  'Telecom/Communications': '',
  'Consumer Apps': '',
  'Logistics/Supply Chain': '',
};

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) {
    return (
      <span className="text-xs text-[#64748B] font-mono">-</span>
    );
  }
  const color = score >= 85 ? '#05AD98' : score >= 70 ? '#F59E0B' : '#EF4444';
  return (
    <span className="text-sm font-extrabold font-mono" style={{ color }}>
      {score}
    </span>
  );
}

function TrendIndicator({ trend, delta }: { trend: string; delta: number }) {
  if (delta === 0 || trend === 'flat') {
    return <Minus className="w-3 h-3 text-[#64748B]" />;
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#05AD98]">
        <TrendingUp className="w-3 h-3" />+{delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#EF4444]">
      <TrendingDown className="w-3 h-3" />{delta}
    </span>
  );
}

export default function DirectoryClient() {
  const [domains, setDomains] = useState<DirectoryDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchDomains() {
      try {
        const res = await fetch('/api/v1/directory');
        if (res.ok) {
          const data = await res.json();
          setDomains(data.domains || []);
        }
      } catch {
        // Fallback: will show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchDomains();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(domains.map(d => d.category));
    return ['All', ...Array.from(cats).sort()];
  }, [domains]);

  const filtered = useMemo(() => {
    let result = domains;
    if (selectedCategory !== 'All') {
      result = result.filter(d => d.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d => d.domain.includes(q) || d.category.toLowerCase().includes(q));
    }
    return result;
  }, [domains, selectedCategory, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, DirectoryDomain[]>();
    for (const d of filtered) {
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    // Sort each group by score desc
    for (const [, list] of map) {
      list.sort((a, b) => b.latestGeoScore - a.latestGeoScore);
    }
    // Sort categories by avg score desc
    return Array.from(map.entries()).sort((a, b) => {
      const avgA = a[1].reduce((s, d) => s + d.latestGeoScore, 0) / a[1].length;
      const avgB = b[1].reduce((s, d) => s + d.latestGeoScore, 0) / b[1].length;
      return avgB - avgA;
    });
  }, [filtered]);

  const totalScanned = domains.filter(d => d.latestGeoScore > 0).length;
  const avgScore = totalScanned > 0
    ? Math.round(domains.filter(d => d.latestGeoScore > 0).reduce((s, d) => s + d.latestGeoScore, 0) / totalScanned)
    : 0;

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.1)] border border-[rgba(5,173,152,0.25)] text-[#05AD98] text-xs font-semibold">
          <Globe className="w-3.5 h-3.5" />
          AI Citation Readiness Directory
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          GEO Scores for {domains.length.toLocaleString()}+ Companies
        </h1>
        <p className="text-sm text-[#BBBFBF] max-w-2xl mx-auto leading-relaxed">
          Browse how the world&apos;s top SaaS companies, startups, and tech brands perform across
          ChatGPT, Claude, Gemini, and Perplexity. Each score measures AI citation readiness
          across zero-click resilience, entity recognition, and vector retrieval signals.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-xl font-extrabold text-[#05AD98]">{domains.length}</div>
            <div className="text-[10px] text-[#878787] uppercase tracking-wider">Domains</div>
          </div>
          <div className="w-px h-8 bg-[rgba(187,191,191,0.12)]" />
          <div className="text-center">
            <div className="text-xl font-extrabold text-white">{categories.length - 1}</div>
            <div className="text-[10px] text-[#878787] uppercase tracking-wider">Categories</div>
          </div>
          <div className="w-px h-8 bg-[rgba(187,191,191,0.12)]" />
          <div className="text-center">
            <div className="text-xl font-extrabold text-white">{avgScore || '-'}</div>
            <div className="text-[10px] text-[#878787] uppercase tracking-wider">Avg GEO</div>
          </div>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-[rgba(187,191,191,0.10)] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search domains or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] text-sm text-white placeholder-[#64748B] focus:border-[#05AD98] focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-[#64748B] shrink-0" />
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#05AD98] text-white'
                  : 'bg-[#0A0E0E] text-[#BBBFBF] hover:bg-[#1A2020] border border-[rgba(187,191,191,0.08)]'
              }`}
            >
              {cat}
            </button>
          ))}
          {categories.length > 8 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0A0E0E] text-[#BBBFBF] border border-[rgba(187,191,191,0.08)] focus:outline-none focus:border-[#05AD98]"
            >
              <option value="">More...</option>
              {categories.slice(8).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 rounded-full border-3 border-[#05AD98] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#878787]">Loading directory...</p>
        </div>
      )}

      {/* Results */}
      {!loading && grouped.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-[#878787]">No domains found matching your search.</p>
        </div>
      )}

      {!loading && grouped.map(([category, domainList]) => {
        const isExpanded = expandedCategories.has(category);
        const visibleDomains = isExpanded ? domainList : domainList.slice(0, 10);
        const hasMore = domainList.length > 10;
        const categoryAvg = Math.round(
          domainList.filter(d => d.latestGeoScore > 0).reduce((s, d) => s + d.latestGeoScore, 0) /
          Math.max(1, domainList.filter(d => d.latestGeoScore > 0).length)
        );

        return (
          <div key={category} className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
            {/* Category Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(187,191,191,0.08)] bg-[rgba(5,173,152,0.03)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(5,173,152,0.12)] flex items-center justify-center shrink-0">
                  <Folder className="w-4 h-4 text-[#05AD98]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{category}</h2>
                  <p className="text-[10px] text-[#878787]">
                    {domainList.length} domains - Avg GEO: {categoryAvg || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#05AD98]" />
              </div>
            </div>

            {/* Domain List */}
            <div className="divide-y divide-[rgba(187,191,191,0.06)]">
              {visibleDomains.map((d, idx) => (
                <Link
                  key={d.domain}
                  href={`/audit/${d.domain}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[rgba(5,173,152,0.04)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-right text-[10px] font-mono text-[#64748B] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white font-mono truncate group-hover:text-[#05AD98] transition-colors">
                      {d.domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <TrendIndicator trend={d.trend} delta={d.trendDelta} />
                    <ScoreBadge score={d.latestGeoScore} />
                    <ArrowRight className="w-3.5 h-3.5 text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Show More */}
            {hasMore && (
              <button
                onClick={() => toggleCategory(category)}
                className="w-full py-3 text-xs font-semibold text-[#05AD98] hover:bg-[rgba(5,173,152,0.04)] transition-colors flex items-center justify-center gap-1 border-t border-[rgba(187,191,191,0.06)]"
              >
                {isExpanded ? (
                  <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Show All {domainList.length} <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>
        );
      })}

      {/* Bottom CTA */}
      {!loading && (
        <div className="glass-panel rounded-2xl p-8 border border-[rgba(5,173,152,0.25)] text-center space-y-4 bg-gradient-to-r from-[rgba(5,173,152,0.06)] to-transparent">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            Free GEO Audit
          </div>
          <h3 className="text-xl font-extrabold text-white">
            Don&apos;t see your domain? Audit it free.
          </h3>
          <p className="text-xs text-[#BBBFBF] max-w-md mx-auto">
            Run a free real-time GEO audit to discover your AI citation probability, zero-click resilience,
            and crawler access analysis across all major AI engines.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white text-sm font-bold transition-all shadow-lg shadow-[rgba(5,173,152,0.25)]"
          >
            Audit Your Domain Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
