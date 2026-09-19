'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X, Zap, Shield, Crown, Users, Loader2, ArrowRight, ExternalLink, Globe } from 'lucide-react';

interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  hasUsedTrial?: boolean;
}

interface PlanFeature {
  text: string;
  included: boolean;
  comingSoon?: boolean;
}

interface PlanDefinition {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  price: string;
  period: string;
  description: string;
  highlight?: boolean;
  badge?: string;
  features: PlanFeature[];
}

const PLANS: PlanDefinition[] = [
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
      { text: 'Weekly email performance digest', included: false },
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
      { text: 'Weekly GEO performance digest', included: true },
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
      { text: 'Embeddable GEO verification badge', included: true },
      { text: 'API key (10,000 req/day)', included: true },
      { text: 'Multi-site analytics dashboard', included: true },
      { text: 'Daily automated re-scans', included: true },
      { text: 'Weekly GEO performance digests', included: true },
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
      { text: 'Dedicated API (unlimited req/day)', included: true },
      { text: 'Private leaderboard data feed', included: true },
      { text: 'Custom analytics dashboards', included: true },
      { text: 'SLA + uptime guarantee', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
  },
];

export default function PricingCards() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetTier = searchParams.get('tier');
  const [domainParam, setDomainParam] = useState<string>('');
  const autoTriggeredRef = useRef(false);

  const [user, setUser] = useState<UserSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get('domain');
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('citeroute_pending_domain') : null;
    const resolved = fromUrl || fromStorage || '';
    if (resolved) {
      setDomainParam(resolved);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data?.user || null);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));

    if (typeof window !== 'undefined') {
      const setupLemonSqueezy = () => {
        const win = window as unknown as {
          createLemonSqueezy?: () => void;
          LemonSqueezy?: {
            Setup: (opts: { eventHandler: (event: { event: string }) => void }) => void;
          };
        };
        win.createLemonSqueezy?.();
        win.LemonSqueezy?.Setup({
          eventHandler: (event) => {
            if (event.event === 'Checkout.Success') {
              const dest = domainParam ? `/my-sites?upgraded=true&domain=${encodeURIComponent(domainParam)}` : '/my-sites?upgraded=true';
              router.push(dest);
            }
          },
        });
      };

      setupLemonSqueezy();
      const timer = setTimeout(setupLemonSqueezy, 1000);
      return () => clearTimeout(timer);
    }
  }, [router, domainParam]);

  const handleCheckout = async (tier: 'pro' | 'agency', domainToPass?: string) => {
    setError(null);
    const domain = domainToPass || domainParam;
    if (!user) {
      const redirectDest = `/pricing?tier=${tier}${domain ? `&domain=${encodeURIComponent(domain)}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectDest)}`);
      return;
    }

    setLoadingTier(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, domain }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout');
      }

      if (data.checkoutUrl) {
        const win = window as unknown as {
          LemonSqueezy?: {
            Url?: {
              Open: (url: string) => void;
            };
          };
        };

        if (win.LemonSqueezy?.Url?.Open) {
          win.LemonSqueezy.Url.Open(data.checkoutUrl);
          setLoadingTier(null);
        } else {
          window.location.href = data.checkoutUrl;
        }
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error redirecting to checkout');
      setLoadingTier(null);
    }
  };

  const currentTier = user?.tier?.toLowerCase() || 'free';

  // Automatically trigger checkout when arriving directly with tier=pro or tier=agency from audit quota loop
  useEffect(() => {
    if (!authChecked || !user || autoTriggeredRef.current) return;
    const tierFromUrl = targetTier?.toLowerCase();
    if ((tierFromUrl === 'pro' || tierFromUrl === 'agency') && currentTier === 'free') {
      autoTriggeredRef.current = true;
      handleCheckout(tierFromUrl as 'pro' | 'agency', domainParam);
    }
  }, [authChecked, user, targetTier, currentTier, domainParam]);

  return (
    <div className="space-y-6">
      {domainParam && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.25)] text-xs text-[#05AD98] font-mono shadow-sm">
            <Globe className="w-3.5 h-3.5" />
            <span>Target Domain: <strong className="text-white font-semibold">{domainParam}</strong></span>
          </div>
        </div>
      )}

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
                    <div className="flex items-center flex-wrap gap-1.5 leading-relaxed">
                      <span className={`text-[11px] ${feature.included ? 'text-[#BBBFBF]' : 'text-[#878787]/40'}`}>
                        {feature.text}
                      </span>
                      {feature.comingSoon && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-[#05AD98] bg-[rgba(5,173,152,0.1)] border border-[rgba(5,173,152,0.25)] tracking-wide whitespace-nowrap">
                          COMING SOON
                        </span>
                      )}
                    </div>
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
                      href={user ? (domainParam ? `/my-sites?domain=${encodeURIComponent(domainParam)}` : '/my-sites') : (domainParam ? `/register?domain=${encodeURIComponent(domainParam)}` : '/register')}
                      className="block text-center py-2.5 rounded-xl text-sm font-bold bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.15)] hover:text-white hover:border-[#05AD98] transition-all"
                    >
                      {user ? 'Go to Dashboard' : 'Get Started Free'}
                    </Link>
                  )
                ) : plan.id === 'enterprise' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const el = document.getElementById('enterprise-data');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        window.dispatchEvent(
                          new CustomEvent('open-enterprise-inquiry', {
                            detail: { productName: 'Full Index Access' },
                          })
                        );
                      }
                    }}
                    className="w-full text-center py-2.5 rounded-xl text-sm font-bold bg-[rgba(184,160,74,0.12)] text-[#B8A04A] border border-[rgba(184,160,74,0.25)] hover:bg-[rgba(184,160,74,0.22)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Contact Sales</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
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
                      onClick={() => handleCheckout(plan.id as 'pro' | 'agency', domainParam)}
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
                          <span>Opening Checkout...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {user?.hasUsedTrial
                              ? plan.id === 'agency'
                                ? 'Upgrade to Agency'
                                : 'Upgrade to Pro'
                              : plan.id === 'agency'
                              ? 'Start Agency Trial'
                              : 'Start 14-day Trial'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-[#878787] mt-2">
                      {user?.hasUsedTrial
                        ? `${plan.price} billed monthly · Cancel anytime`
                        : '14 days free · Cancel anytime'}
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
