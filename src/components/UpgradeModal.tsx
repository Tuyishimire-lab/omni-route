'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  targetTier?: 'pro' | 'agency' | 'enterprise';
  currentLimit?: number | string;
  featureName?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  title = 'Upgrade Your Plan',
  message = 'You have reached the limit for your current plan.',
  targetTier = 'pro',
  currentLimit,
  featureName,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const tierDetails = {
    pro: {
      name: 'Pro',
      price: '$79/mo',
      perks: [
        'Unlimited GEO scans',
        '1 verified site with AI bot tracking',
        '20 watchlist domains',
        'Real-time AI crawler analytics',
        'API key access (500 req/day)',
      ],
    },
    agency: {
      name: 'Agency',
      price: '$249/mo',
      perks: [
        '10 verified client sites',
        'Unlimited watchlist domains',
        'White-label PDF reports',
        'API key access (10,000 req/day)',
        'Dedicated webhook score alerts',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      price: 'Custom',
      perks: [
        'Unlimited verified sites',
        'Raw AI traffic data export',
        'Dedicated API access',
        'SLA + Uptime guarantee',
      ],
    },
  }[targetTier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-[#0D1512] border border-[rgba(5,173,152,0.3)] rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#878787] hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(5,173,152,0.15)] border border-[rgba(5,173,152,0.3)] text-xs font-semibold text-[#05AD98]">
          <Zap className="w-3.5 h-3.5" />
          <span>Tier Limit Reached</span>
        </div>

        {/* Title & Message */}
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          <p className="text-sm text-[#BBBFBF] mt-1.5 leading-relaxed">{message}</p>
        </div>

        {/* Current limit notice */}
        {featureName && currentLimit !== undefined && (
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 text-xs text-[#878787] flex justify-between items-center">
            <span>{featureName}</span>
            <span className="font-semibold text-white">Current Limit: {currentLimit}</span>
          </div>
        )}

        {/* Upgrade highlights */}
        <div className="bg-[rgba(5,173,152,0.06)] border border-[rgba(5,173,152,0.15)] rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold text-[#05AD98] uppercase tracking-wider">
              Recommended: {tierDetails.name} Plan
            </span>
            <span className="text-sm font-bold text-white">{tierDetails.price}</span>
          </div>
          <ul className="space-y-2 text-xs text-[#BBBFBF]">
            {tierDetails.perks.map((perk, i) => (
              <li key={i} className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#05AD98] shrink-0" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] text-xs font-semibold text-[#BBBFBF] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors"
          >
            Not Now
          </button>
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] text-xs font-bold text-white hover:opacity-95 shadow-lg shadow-[rgba(5,173,152,0.25)] transition-all"
          >
            <span>View Plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
