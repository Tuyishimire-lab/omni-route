/**
 * Minimal emergency fallback for the leaderboard.
 *
 * Previously this file contained 186 hardcoded domain entries (31KB).
 * Now that the database is seeded with 958+ domains via seed-directory,
 * this fallback only exists for resilience: if Turso is unreachable,
 * the leaderboard still renders something instead of showing an error.
 *
 * The 10 entries below are well-known domains that serve as a skeleton
 * until the DB connection recovers.
 */

export interface LeaderboardEntry {
  rank: number;
  domain: string;
  category: string;
  geoScore: number;
  citationWinRate: number;
  zeroClickResilience: number;
  trend: 'up' | 'down' | 'flat';
  trendDelta: number;
  scanCount: number;
  isLiveScanned?: boolean;
  lastScanned?: string;
}

export const DEFAULT_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, domain: 'openai.com', category: 'AI/Tech', geoScore: 97, citationWinRate: 96, zeroClickResilience: 94, trend: 'up', trendDelta: 3, scanCount: 12 },
  { rank: 2, domain: 'stripe.com', category: 'Fintech', geoScore: 95, citationWinRate: 91, zeroClickResilience: 89, trend: 'up', trendDelta: 2, scanCount: 10 },
  { rank: 3, domain: 'vercel.com', category: 'Developer', geoScore: 94, citationWinRate: 90, zeroClickResilience: 88, trend: 'up', trendDelta: 1, scanCount: 9 },
  { rank: 4, domain: 'notion.so', category: 'SaaS/Tools', geoScore: 92, citationWinRate: 88, zeroClickResilience: 86, trend: 'flat', trendDelta: 0, scanCount: 8 },
  { rank: 5, domain: 'figma.com', category: 'SaaS/Design', geoScore: 91, citationWinRate: 87, zeroClickResilience: 85, trend: 'up', trendDelta: 2, scanCount: 7 },
  { rank: 6, domain: 'github.com', category: 'Developer', geoScore: 90, citationWinRate: 86, zeroClickResilience: 84, trend: 'flat', trendDelta: 0, scanCount: 11 },
  { rank: 7, domain: 'shopify.com', category: 'E-Commerce', geoScore: 89, citationWinRate: 85, zeroClickResilience: 83, trend: 'up', trendDelta: 1, scanCount: 6 },
  { rank: 8, domain: 'linear.app', category: 'SaaS/Tools', geoScore: 88, citationWinRate: 84, zeroClickResilience: 82, trend: 'up', trendDelta: 3, scanCount: 5 },
  { rank: 9, domain: 'anthropic.com', category: 'AI/Tech', geoScore: 93, citationWinRate: 92, zeroClickResilience: 90, trend: 'up', trendDelta: 2, scanCount: 8 },
  { rank: 10, domain: 'supabase.com', category: 'Developer', geoScore: 87, citationWinRate: 83, zeroClickResilience: 81, trend: 'up', trendDelta: 2, scanCount: 6 },
];
