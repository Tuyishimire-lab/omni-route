import { describe, it, expect } from 'vitest';
import {
  normalizeTier,
  getTierConfig,
  checkSiteLimit,
  checkWatchlistLimit,
  checkScanLimit,
  checkApiKeyEligibility,
} from '../tierLimits';

describe('tierLimits - normalizeTier', () => {
  it('defaults invalid or null values to free', () => {
    expect(normalizeTier(null)).toBe('free');
    expect(normalizeTier(undefined)).toBe('free');
    expect(normalizeTier('')).toBe('free');
    expect(normalizeTier('unknown')).toBe('free');
  });

  it('normalizes valid tiers case-insensitively', () => {
    expect(normalizeTier('Free')).toBe('free');
    expect(normalizeTier('PRO')).toBe('pro');
    expect(normalizeTier('Agency')).toBe('agency');
    expect(normalizeTier('enterprise')).toBe('enterprise');
  });
});

describe('tierLimits - checkSiteLimit', () => {
  it('blocks free users from registering verified sites', () => {
    const res = checkSiteLimit('free', 0);
    expect(res.allowed).toBe(false);
    expect(res.limit).toBe(0);
    expect(res.upgradeTier).toBe('pro');
  });

  it('allows pro users to register exactly 1 verified site', () => {
    const res1 = checkSiteLimit('pro', 0);
    expect(res1.allowed).toBe(true);

    const res2 = checkSiteLimit('pro', 1);
    expect(res2.allowed).toBe(false);
    expect(res2.limit).toBe(1);
    expect(res2.upgradeTier).toBe('agency');
  });

  it('allows agency users up to 10 verified sites', () => {
    const res = checkSiteLimit('agency', 9);
    expect(res.allowed).toBe(true);

    const resMax = checkSiteLimit('agency', 10);
    expect(resMax.allowed).toBe(false);
    expect(resMax.upgradeTier).toBe('enterprise');
  });

  it('allows enterprise unlimited verified sites', () => {
    const res = checkSiteLimit('enterprise', 999);
    expect(res.allowed).toBe(true);
  });
});

describe('tierLimits - checkWatchlistLimit', () => {
  it('enforces 3 domains max for free tier', () => {
    expect(checkWatchlistLimit('free', 2).allowed).toBe(true);
    expect(checkWatchlistLimit('free', 3).allowed).toBe(false);
    expect(checkWatchlistLimit('free', 3).upgradeTier).toBe('pro');
  });

  it('enforces 20 domains max for pro tier', () => {
    expect(checkWatchlistLimit('pro', 19).allowed).toBe(true);
    expect(checkWatchlistLimit('pro', 20).allowed).toBe(false);
    expect(checkWatchlistLimit('pro', 20).upgradeTier).toBe('agency');
  });

  it('allows unlimited for agency and enterprise', () => {
    expect(checkWatchlistLimit('agency', 100).allowed).toBe(true);
    expect(checkWatchlistLimit('enterprise', 500).allowed).toBe(true);
  });
});

describe('tierLimits - checkScanLimit', () => {
  it('limits free tier to 10 scans per month', () => {
    expect(checkScanLimit('free', 9).allowed).toBe(true);
    expect(checkScanLimit('free', 10).allowed).toBe(false);
    expect(checkScanLimit('free', 10).upgradeTier).toBe('pro');
  });

  it('allows unlimited scans for pro and above', () => {
    expect(checkScanLimit('pro', 500).allowed).toBe(true);
    expect(checkScanLimit('agency', 1000).allowed).toBe(true);
  });
});

describe('tierLimits - checkApiKeyEligibility', () => {
  it('rejects free users from creating API keys', () => {
    const res = checkApiKeyEligibility('free');
    expect(res.allowed).toBe(false);
    expect(res.upgradeTier).toBe('pro');
  });

  it('allows pro and higher to create API keys', () => {
    expect(checkApiKeyEligibility('pro').allowed).toBe(true);
    expect(checkApiKeyEligibility('agency').allowed).toBe(true);
    expect(checkApiKeyEligibility('enterprise').allowed).toBe(true);
  });
});
