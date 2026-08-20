'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Code2, Shield } from 'lucide-react';

interface GeoBadgeProps {
  domain: string;
  geoScore: number;
  citationRate: number;
  style?: 'compact' | 'card' | 'banner';
}

function ScoreDial({ score }: { score: number }) {
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#38bdf8' : '#f59e0b';
  const dasharray = 251.2;
  const dashoffset = dasharray - (score / 100) * dasharray;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
      <circle cx="28" cy="28" r="22" fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle
        cx="28" cy="28" r="22"
        fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dasharray} ${dasharray}`}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="28" y="33" textAnchor="middle" fill={color} fontSize="13" fontWeight="800" fontFamily="monospace">
        {score}
      </text>
    </svg>
  );
}

// Compact Badge
function CompactBadge({ domain, geoScore, citationRate }: GeoBadgeProps) {
  const scoreColor = geoScore >= 80 ? '#34d399' : geoScore >= 60 ? '#38bdf8' : '#f59e0b';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '8px 14px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ScoreDial score={geoScore} />
      <div>
        <div style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{domain}</div>
        <div style={{ color: scoreColor, fontSize: 11, fontWeight: 600 }}>GEO Score: {geoScore}/100</div>
        <div style={{ color: '#64748b', fontSize: 10 }}>OmniRoute Certified</div>
      </div>
    </div>
  );
}

// Card Badge
function CardBadge({ domain, geoScore, citationRate }: GeoBadgeProps) {
  const scoreColor = geoScore >= 80 ? '#34d399' : geoScore >= 60 ? '#38bdf8' : '#f59e0b';
  return (
    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155', borderRadius: 16, padding: '20px 24px', fontFamily: 'Inter, system-ui, sans-serif', width: 220, textAlign: 'center' }}>
      <div style={{ color: '#38bdf8', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        OmniRoute GEO Certified
      </div>
      <div style={{ margin: '0 auto 12px', width: 'fit-content' }}>
        <ScoreDial score={geoScore} />
      </div>
      <div style={{ color: scoreColor, fontSize: 22, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>{geoScore}</div>
      <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>GEO Authority Index</div>
      <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700, marginTop: 10, fontFamily: 'monospace' }}>{domain}</div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTop: '1px solid #334155' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>{citationRate}%</div>
          <div style={{ color: '#64748b', fontSize: 9 }}>Citation Rate</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: geoScore >= 80 ? '#34d399' : '#f59e0b', fontSize: 12, fontWeight: 700 }}>{geoScore >= 80 ? 'OPTIMAL' : geoScore >= 60 ? 'MODERATE' : 'AT RISK'}</div>
          <div style={{ color: '#64748b', fontSize: 9 }}>Status</div>
        </div>
      </div>
    </div>
  );
}

// Banner Badge
function BannerBadge({ domain, geoScore, citationRate }: GeoBadgeProps) {
  const scoreColor = geoScore >= 80 ? '#34d399' : geoScore >= 60 ? '#38bdf8' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155', borderRadius: 14, padding: '14px 20px', fontFamily: 'Inter, system-ui, sans-serif', minWidth: 380, gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ScoreDial score={geoScore} />
        <div>
          <div style={{ color: '#38bdf8', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>OmniRoute GEO Index</div>
          <div style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 800, fontFamily: 'monospace' }}>{domain}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
        <div>
          <div style={{ color: scoreColor, fontSize: 18, fontWeight: 900, fontFamily: 'monospace' }}>{geoScore}</div>
          <div style={{ color: '#64748b', fontSize: 9 }}>GEO Score</div>
        </div>
        <div>
          <div style={{ color: '#38bdf8', fontSize: 18, fontWeight: 900 }}>{citationRate}%</div>
          <div style={{ color: '#64748b', fontSize: 9 }}>Citation Rate</div>
        </div>
      </div>
    </div>
  );
}

const BADGE_STYLES = [
  { key: 'compact', label: 'Compact' },
  { key: 'card', label: 'Card' },
  { key: 'banner', label: 'Banner' }
] as const;

export default function GeoBadge({ domain, geoScore, citationRate }: GeoBadgeProps) {
  const [activeStyle, setActiveStyle] = useState<'compact' | 'card' | 'banner'>('card');
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe
  src="https://omniroute.network/badge/${domain}?style=${activeStyle}"
  width="${activeStyle === 'card' ? '240' : activeStyle === 'banner' ? '420' : '280'}"
  height="${activeStyle === 'card' ? '180' : '80'}"
  style="border:none;border-radius:16px;"
  title="OmniRoute GEO Authority Badge for ${domain}"
></iframe>`;

  const copyEmbed = () => {
    navigator.clipboard?.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const BadgeComponent = activeStyle === 'compact' ? CompactBadge : activeStyle === 'card' ? CardBadge : BannerBadge;

  return (
    <div className="space-y-6">
      {/* Style Toggle */}
      <div className="flex gap-2">
        {BADGE_STYLES.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStyle(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeStyle === s.key
                ? 'bg-[rgba(5,173,152,0.20)] text-[#05AD98] border-[rgba(5,173,152,0.4)]'
                : 'bg-[#111514] text-[#878787] border-[rgba(187,191,191,0.10)] hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] p-8 flex items-center justify-center min-h-[160px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEgTCAyMCAxIE0gMSAwIEwgMSAyMCIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]">
        <BadgeComponent domain={domain} geoScore={geoScore} citationRate={citationRate} style={activeStyle} />
      </div>

      {/* Embed Code */}
      <div className="glass-card rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(187,191,191,0.10)] bg-[#111514]/60">
          <div className="flex items-center gap-2 text-xs text-[#878787]">
            <Code2 className="w-3.5 h-3.5" />
            <span>Embed Code</span>
          </div>
          <button
            onClick={copyEmbed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2020] hover:bg-slate-700 text-xs text-[#BBBFBF] font-semibold transition-colors border border-[rgba(187,191,191,0.12)]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#05AD98]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="text-xs text-[#05AD98] font-mono px-4 py-4 overflow-x-auto leading-relaxed whitespace-pre-wrap bg-[#0A0E0E]">
          {embedCode}
        </pre>
      </div>

      {/* Trust Note */}
      <p className="text-[11px] text-[#878787] flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-slate-600" />
        Badges are publicly verifiable and link back to a live audit report on OmniRoute.
      </p>
    </div>
  );
}
