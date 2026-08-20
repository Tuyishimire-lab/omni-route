import { WatchedDomain, GeoAuditReport, ScoreHistoryPoint } from './types';

const WATCHLIST_STORAGE_KEY = 'omniroute_watched_domains_v2';

// Generate synthetic 7-day history seeded around a given score
function generateSeedHistory(baseScore: number, days = 7): ScoreHistoryPoint[] {
  const history: ScoreHistoryPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const noise = Math.round((Math.random() - 0.5) * 6);
    history.push({ date: dateStr, score: Math.min(100, Math.max(10, baseScore + noise)) });
  }
  return history;
}

export const defaultWatchedPresets: WatchedDomain[] = [
  {
    id: 'w-stripe',
    domain: 'stripe.com',
    url: 'https://stripe.com',
    lastGeoScore: 88,
    previousGeoScore: 84,
    addedAt: '2026-08-10',
    lastScannedAt: new Date().toLocaleTimeString(),
    zeroClickResilience: 86,
    citationProbability: 92,
    status: 'OPTIMAL',
    scoreHistory: generateSeedHistory(88)
  },
  {
    id: 'w-linear',
    domain: 'linear.app',
    url: 'https://linear.app',
    lastGeoScore: 82,
    previousGeoScore: 78,
    addedAt: '2026-08-12',
    lastScannedAt: new Date().toLocaleTimeString(),
    zeroClickResilience: 80,
    citationProbability: 84,
    status: 'OPTIMAL',
    scoreHistory: generateSeedHistory(82)
  },
  {
    id: 'w-shopify',
    domain: 'shopify.com',
    url: 'https://shopify.com',
    lastGeoScore: 76,
    previousGeoScore: 79,
    addedAt: '2026-08-14',
    lastScannedAt: new Date().toLocaleTimeString(),
    zeroClickResilience: 72,
    citationProbability: 79,
    status: 'MODERATE',
    scoreHistory: generateSeedHistory(76)
  }
];

export function getWatchedDomains(): WatchedDomain[] {
  if (typeof window === 'undefined') return defaultWatchedPresets;
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(defaultWatchedPresets));
      return defaultWatchedPresets;
    }
    return JSON.parse(raw);
  } catch (e) {
    return defaultWatchedPresets;
  }
}

export function saveWatchedDomain(report: GeoAuditReport): WatchedDomain[] {
  if (typeof window === 'undefined') return defaultWatchedPresets;
  const current = getWatchedDomains();
  const existingIdx = current.findIndex((d) => d.domain.toLowerCase() === report.domain.toLowerCase());

  let status: WatchedDomain['status'] = 'OPTIMAL';
  if (report.overallGeoScore < 60) status = 'AT_RISK';
  else if (report.overallGeoScore < 80) status = 'MODERATE';

  const todayStr = new Date().toISOString().split('T')[0];
  const newPoint: ScoreHistoryPoint = { date: todayStr, score: report.overallGeoScore };

  if (existingIdx >= 0) {
    const prev = current[existingIdx];
    const updatedHistory = [...(prev.scoreHistory || generateSeedHistory(prev.lastGeoScore)), newPoint]
      .slice(-14); // keep last 14 days

    const updated = [...current];
    updated[existingIdx] = {
      ...prev,
      previousGeoScore: prev.lastGeoScore,
      lastGeoScore: report.overallGeoScore,
      lastScannedAt: new Date().toLocaleTimeString(),
      zeroClickResilience: report.zeroClickResilience,
      citationProbability: report.engineBreakdown[0]?.citationProbability || 85,
      status,
      scoreHistory: updatedHistory
    };
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  const newWatched: WatchedDomain = {
    id: 'w-' + Date.now(),
    domain: report.domain,
    url: report.url || `https://${report.domain}`,
    lastGeoScore: report.overallGeoScore,
    previousGeoScore: undefined,
    addedAt: new Date().toISOString().split('T')[0],
    lastScannedAt: new Date().toLocaleTimeString(),
    zeroClickResilience: report.zeroClickResilience,
    citationProbability: report.engineBreakdown[0]?.citationProbability || 85,
    status,
    scoreHistory: [newPoint]
  };

  const updatedList = [newWatched, ...current];
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedList));
  return updatedList;
}

export function removeWatchedDomain(id: string): WatchedDomain[] {
  if (typeof window === 'undefined') return defaultWatchedPresets;
  const current = getWatchedDomains();
  const updated = current.filter((d) => d.id !== id);
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
