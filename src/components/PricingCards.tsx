'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, X, Zap, Shield, Crown, Users, Loader2, ArrowRight, ExternalLink } from 'lucide-react';

interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: string;
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: Shield,
    iconColor: 'text-[#878787]',
    price: '$0',
    period: 'forever',
    description: 'Explore GEO scoring and generate your agent.json manifest.',
    features: [
      { text: '10 GEO scans per month', included: true },
      { text: '3 watchlist domains', included: true },
      { text: 'Community leaderboard access', included: true },
      { text: 'agent.json Studio', included: true },
      { text: 'Basic score report', included: true },
      { text: 'Tracking tag & AI bot traffic detection', included: false },
      { text: 'API key access', included: false },
      { text: 'Daily automated re-scans', included: false },
      { text: 'Email score alerts', included: false },
      { text: 'Community support', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    iconColor: 'text-[#05AD98]',
    price: '$79',
    period: '/month',
    description: 'For founders and marketers who need real AI crawler & citation traffic data on their own site.',
    features: [
      { text: 'Unlimited GEO scans', included: true },
      { text: '1 verified site (tracking tag)', included: true },
      { text: '20 watchlist domains', included: true },
      { text: 'Real AI bot & crawler analytics dashboard', included: true },
      { text: 'agent.json Studio + Templates', included: true },
      { text: 'API key (500 req/day)', included: true },
      { text: 'Daily automated re-scans', included: true },
      { text: 'Email score drop alerts', included: true },
      { text: 'GEO history & trend charts', included: true },
      { text: 'Priority support', included: true },
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    icon: Users,
    iconColor: 'text-[#05AD98]',
    price: '$249',
    period: '/month',
    highlight: true,
    badge: 'Most Popular',
    description: 'For agencies and consultants managing GEO optimization across multiple client sites.',
    features: [
      { text: 'Unlimited GEO scans', included: true },
      { text: '10 verified client sites', included: true },
      { text: 'Unlimited watchlist domains', included: true },
      { text: 'White-label GEO reports (PDF)', included: true },
      { text: 'Client-facing leaderboard embed', included: true },
      { text: 'API key (10,000 req/day)', included: true },
      { text: 'Webhook score change events', included: true },
      { text: 'Slack / Teams score alerts', included: true },
      { text: 'Bulk domain audit (CSV import)', included: true },
      { text: 'Dedicated account support', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    iconColor: 'text-[#B8A04A]',
    price: 'Custom',
    period: '',
    description: 'For large organisations needing data subscriptions, custom integrations, and SLA guarantees.',
    features: [
      { text: 'Unlimited verified sites', included: true },
      { text: 'Raw AI crawler traffic data export', included: true },
      { text: 'Competitive AI citation benchmarking', included: true },
      { text: 'Custom leaderboard categories', included: true },
      { text: 'Dedicated API (unlimited req/day)', included: true },
      { text: 'Private leaderboard data feed', included: true },
      { text: 'SSO & team management', included: true },
      { text: 'Custom analytics dashboards', included: true },
      { text: 'SLA + uptime guarantee', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
  },
];

export default function PricingCards() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data?.user || null);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const handleCheckout = async (tier: 'pro' | 'agency') => {
    setError(null);
    if (!user) {
      router.push(`/login?redirect=/pricing`);
      return;
    }

    setLoadingTier(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error redirecting to checkout');
      setLoadingTier(null);
    }
  };

  const currentTier = user?.tier?.toLowerCase() || 'free';

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center max-w-md mx-auto">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = authChecked && user && currentTier === plan.id;
          const isLoading = loadingTier === plan.id;

          return (
            <div
              key={plan.name}
              className={`relative glass-panel rounded-2xl p-6 border space-y-6 flex flex-col ${
                plan.highlight
                  ? 'border-[rgba(5,173,152,0.45)] ring-1 ring-[rgba(5,173,152,0.2)]'
                  : 'border-[rgba(187,191,191,0.10)]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#05AD98] to-[#038a79] text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-[#878787]">{plan.period}</span>}
                </div>
                <p className="text-[11px] text-[#878787] leading-relaxed">{plan.description}</p>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <Check className="w-3.5 h-3.5 text-[#05AD98] shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-[#878787]/30 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-[11px] leading-relaxed ${feature.included ? 'text-[#BBBFBF]' : 'text-[#878787]/40'}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div>
                {plan.id === 'free' ? (
                  isCurrent ? (
                    <div className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-[#05AD98] bg-[rgba(5,173,152,0.1)] border border-[rgba(5,173,152,0.25)]">
                      Current Plan
                    </div>
                  ) : (
                    <Link
                      href={user ? '/my-sites' : '/register'}
                      className="block text-center py-2.5 rounded-xl text-sm font-bold bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.15)] hover:text-white hover:border-[#05AD98] transition-all"
                    >
                      {user ? 'Go to Dashboard' : 'Get Started Free'}
                    </Link>
                  )
                ) : plan.id === 'enterprise' ? (
                  <a
                    href="mailto:tuyishime1angel@gmail.com?subject=CiteRoute%20Enterprise%20Inquiry"
                    className="block text-center py-2.5 rounded-xl text-sm font-bold bg-[rgba(184,160,74,0.10)] text-[#B8A04A] border border-[rgba(184,160,74,0.25)] hover:bg-[rgba(184,160,74,0.18)] transition-all"
                  >
                    Contact Sales
                  </a>
                ) : isCurrent ? (
                  <div className="space-y-2">
                    <div className="w-full text-center py-2 rounded-xl text-xs font-bold text-[#05AD98] bg-[rgba(5,173,152,0.12)] border border-[rgba(5,173,152,0.3)]">
                      Current Active Plan
                    </div>
                    <a
                      href="/api/billing/portal"
                      className="flex items-center justify-center gap-1.5 w-full text-center py-1.5 rounded-xl text-xs font-semibold text-[#878787] hover:text-white hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(187,191,191,0.1)] transition-all"
                    >
                      <span>Manage Billing</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => handleCheckout(plan.id as 'pro' | 'agency')}
                      disabled={isLoading || loadingTier !== null}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        plan.highlight
                          ? 'bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white shadow-lg shadow-[rgba(5,173,152,0.25)]'
                          : 'bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.15)] hover:text-white hover:border-[#05AD98]'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <span>{plan.id === 'agency' ? 'Start Agency Trial' : 'Start 14-day Trial'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-[#878787] mt-2">
                      14 days free &bull; Cancel anytime
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
