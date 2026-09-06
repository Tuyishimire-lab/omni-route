/**
 * CiteRoute - Centralized Tier Limits & Feature Entitlements
 *
 * Enforces the limits defined on the CiteRoute Pricing Page:
 * - Free ($0/mo): 10 scans/mo, 3 watchlist domains, 0 verified sites (no tracking tag), no API key
 * - Pro ($79/mo): Unlimited scans, 20 watchlist domains, 1 verified site (tracking tag), 500 req/day API key
 * - Agency ($249/mo): Unlimited scans, unlimited watchlist, 10 verified sites, 10,000 req/day API key
 * - Enterprise: Unlimited scans, unlimited watchlist, unlimited verified sites, dedicated API
 */

export type UserTier = 'free' | 'pro' | 'agency' | 'enterprise';

export interface TierConfig {
  displayName: string;
  maxVerifiedSites: number;
  maxWatchlistDomains: number;
  maxMonthlyScans: number;
  hasApiAccess: boolean;
  apiDailyLimit: number;
  hasWhiteLabelReports: boolean;
  hasRawDataExport: boolean;
  hasWebhookAlerts: boolean;
}

export const TIER_CONFIG: Record<UserTier, TierConfig> = {
  free: {
    displayName: 'Free',
    maxVerifiedSites: 0,
    maxWatchlistDomains: 3,
    maxMonthlyScans: 10,
    hasApiAccess: false,
    apiDailyLimit: 0,
    hasWhiteLabelReports: false,
    hasRawDataExport: false,
    hasWebhookAlerts: false,
  },
  pro: {
    displayName: 'Pro',
    maxVerifiedSites: 1,
    maxWatchlistDomains: 20,
    maxMonthlyScans: Infinity,
    hasApiAccess: true,
    apiDailyLimit: 500,
    hasWhiteLabelReports: false,
    hasRawDataExport: false,
    hasWebhookAlerts: false,
  },
  agency: {
    displayName: 'Agency',
    maxVerifiedSites: 10,
    maxWatchlistDomains: Infinity,
    maxMonthlyScans: Infinity,
    hasApiAccess: true,
    apiDailyLimit: 10_000,
    hasWhiteLabelReports: true,
    hasRawDataExport: false,
    hasWebhookAlerts: true,
  },
  enterprise: {
    displayName: 'Enterprise',
    maxVerifiedSites: Infinity,
    maxWatchlistDomains: Infinity,
    maxMonthlyScans: Infinity,
    hasApiAccess: true,
    apiDailyLimit: Infinity,
    hasWhiteLabelReports: true,
    hasRawDataExport: true,
    hasWebhookAlerts: true,
  },
};

export function normalizeTier(tierRaw?: string | null): UserTier {
  const normalized = (tierRaw || 'free').toLowerCase().trim();
  if (normalized === 'agency') return 'agency';
  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'pro') return 'pro';
  return 'free';
}

export function getTierConfig(tierRaw?: string | null): TierConfig {
  return TIER_CONFIG[normalizeTier(tierRaw)];
}

export interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  reason?: string;
  upgradeTier?: UserTier;
}

/**
 * Validates whether a user can register an additional verified site for tracking.
 */
export function checkSiteLimit(tierRaw: string | null | undefined, currentCount: number): LimitCheckResult {
  const tier = normalizeTier(tierRaw);
  const config = TIER_CONFIG[tier];

  if (config.maxVerifiedSites === 0) {
    return {
      allowed: false,
      limit: 0,
      current: currentCount,
      reason: 'The Free tier does not include site verification or tracking tags. Upgrade to Pro to verify your site.',
      upgradeTier: 'pro',
    };
  }

  if (currentCount >= config.maxVerifiedSites) {
    const nextTier: UserTier = tier === 'pro' ? 'agency' : 'enterprise';
    return {
      allowed: false,
      limit: config.maxVerifiedSites,
      current: currentCount,
      reason: `You have reached your limit of ${config.maxVerifiedSites} verified site${config.maxVerifiedSites > 1 ? 's' : ''} on the ${config.displayName} plan. Upgrade to ${TIER_CONFIG[nextTier].displayName} for more.`,
      upgradeTier: nextTier,
    };
  }

  return {
    allowed: true,
    limit: config.maxVerifiedSites,
    current: currentCount,
  };
}

/**
 * Validates whether a user or session can add an additional domain to their watchlist.
 */
export function checkWatchlistLimit(tierRaw: string | null | undefined, currentCount: number): LimitCheckResult {
  const tier = normalizeTier(tierRaw);
  const config = TIER_CONFIG[tier];

  if (currentCount >= config.maxWatchlistDomains) {
    const nextTier: UserTier = tier === 'free' ? 'pro' : 'agency';
    return {
      allowed: false,
      limit: config.maxWatchlistDomains,
      current: currentCount,
      reason: `You have reached your limit of ${config.maxWatchlistDomains} watchlist domain${config.maxWatchlistDomains > 1 ? 's' : ''} on the ${config.displayName} plan. Upgrade to ${TIER_CONFIG[nextTier].displayName} to track more domains.`,
      upgradeTier: nextTier,
    };
  }

  return {
    allowed: true,
    limit: config.maxWatchlistDomains,
    current: currentCount,
  };
}

/**
 * Validates whether a user or IP can perform a GEO scan under their monthly quota.
 */
export function checkScanLimit(tierRaw: string | null | undefined, monthlyCount: number): LimitCheckResult {
  const tier = normalizeTier(tierRaw);
  const config = TIER_CONFIG[tier];

  if (monthlyCount >= config.maxMonthlyScans) {
    return {
      allowed: false,
      limit: config.maxMonthlyScans,
      current: monthlyCount,
      reason: `You have exhausted your monthly limit of ${config.maxMonthlyScans} GEO scans on the ${config.displayName} plan. Upgrade to Pro for unlimited scans.`,
      upgradeTier: 'pro',
    };
  }

  return {
    allowed: true,
    limit: config.maxMonthlyScans,
    current: monthlyCount,
  };
}

/**
 * Validates whether a user is entitled to create API keys.
 */
export function checkApiKeyEligibility(tierRaw: string | null | undefined): { allowed: boolean; reason?: string; upgradeTier?: UserTier } {
  const tier = normalizeTier(tierRaw);
  const config = TIER_CONFIG[tier];

  if (!config.hasApiAccess) {
    return {
      allowed: false,
      reason: 'API key access is only available on Pro and higher plans. Upgrade to Pro to generate an API key.',
      upgradeTier: 'pro',
    };
  }

  return { allowed: true };
}
