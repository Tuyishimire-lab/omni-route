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
  lastScanned?: string;
}

export const DEFAULT_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  // AI & Frontier Tech
  { rank: 1, domain: 'openai.com', category: 'AI/Tech', geoScore: 97, citationWinRate: 96, zeroClickResilience: 94, trend: 'up', trendDelta: 3, scanCount: 12 },
  { rank: 2, domain: 'perplexity.ai', category: 'AI/Tech', geoScore: 96, citationWinRate: 95, zeroClickResilience: 93, trend: 'up', trendDelta: 4, scanCount: 9 },
  { rank: 3, domain: 'github.com', category: 'Developer', geoScore: 96, citationWinRate: 94, zeroClickResilience: 92, trend: 'flat', trendDelta: 0, scanCount: 15 },
  { rank: 4, domain: 'vercel.com', category: 'Developer', geoScore: 95, citationWinRate: 93, zeroClickResilience: 91, trend: 'up', trendDelta: 5, scanCount: 18 },
  { rank: 5, domain: 'stripe.com', category: 'Fintech', geoScore: 94, citationWinRate: 92, zeroClickResilience: 89, trend: 'up', trendDelta: 2, scanCount: 21 },
  { rank: 6, domain: 'cloudflare.com', category: 'Developer', geoScore: 94, citationWinRate: 91, zeroClickResilience: 89, trend: 'up', trendDelta: 2, scanCount: 14 },
  { rank: 7, domain: 'anthropic.com', category: 'AI/Tech', geoScore: 93, citationWinRate: 92, zeroClickResilience: 90, trend: 'up', trendDelta: 2, scanCount: 11 },
  { rank: 8, domain: 'shopify.com', category: 'E-Commerce', geoScore: 93, citationWinRate: 90, zeroClickResilience: 88, trend: 'down', trendDelta: -1, scanCount: 17 },
  { rank: 9, domain: 'slack.com', category: 'SaaS/Tools', geoScore: 92, citationWinRate: 90, zeroClickResilience: 88, trend: 'flat', trendDelta: 0, scanCount: 16 },
  { rank: 10, domain: 'figma.com', category: 'SaaS/Design', geoScore: 92, citationWinRate: 89, zeroClickResilience: 87, trend: 'up', trendDelta: 2, scanCount: 13 },
  { rank: 11, domain: 'linear.app', category: 'SaaS/Tools', geoScore: 91, citationWinRate: 88, zeroClickResilience: 86, trend: 'up', trendDelta: 4, scanCount: 10 },
  { rank: 12, domain: 'hubspot.com', category: 'SaaS/Tools', geoScore: 91, citationWinRate: 88, zeroClickResilience: 86, trend: 'up', trendDelta: 1, scanCount: 12 },
  { rank: 13, domain: 'docker.com', category: 'Developer', geoScore: 91, citationWinRate: 88, zeroClickResilience: 86, trend: 'down', trendDelta: -1, scanCount: 8 },
  { rank: 14, domain: 'huggingface.co', category: 'AI/Tech', geoScore: 91, citationWinRate: 89, zeroClickResilience: 87, trend: 'flat', trendDelta: 0, scanCount: 9 },
  { rank: 15, domain: 'supabase.com', category: 'Developer', geoScore: 90, citationWinRate: 88, zeroClickResilience: 86, trend: 'up', trendDelta: 4, scanCount: 14 },
  { rank: 16, domain: 'canva.com', category: 'SaaS/Design', geoScore: 90, citationWinRate: 87, zeroClickResilience: 85, trend: 'up', trendDelta: 1, scanCount: 15 },
  { rank: 17, domain: 'notion.so', category: 'SaaS/Tools', geoScore: 89, citationWinRate: 86, zeroClickResilience: 84, trend: 'down', trendDelta: -2, scanCount: 19 },
  { rank: 18, domain: 'plaid.com', category: 'Fintech', geoScore: 89, citationWinRate: 87, zeroClickResilience: 85, trend: 'flat', trendDelta: 0, scanCount: 7 },
  { rank: 19, domain: 'datadoghq.com', category: 'Developer', geoScore: 89, citationWinRate: 86, zeroClickResilience: 84, trend: 'up', trendDelta: 1, scanCount: 10 },
  { rank: 20, domain: 'posthog.com', category: 'Developer', geoScore: 88, citationWinRate: 85, zeroClickResilience: 83, trend: 'up', trendDelta: 4, scanCount: 11 },
  { rank: 21, domain: 'postman.com', category: 'Developer', geoScore: 88, citationWinRate: 85, zeroClickResilience: 83, trend: 'flat', trendDelta: 0, scanCount: 8 },
  { rank: 22, domain: 'mistral.ai', category: 'AI/Tech', geoScore: 88, citationWinRate: 86, zeroClickResilience: 84, trend: 'up', trendDelta: 3, scanCount: 6 },
  { rank: 23, domain: 'wise.com', category: 'Fintech', geoScore: 88, citationWinRate: 86, zeroClickResilience: 84, trend: 'up', trendDelta: 1, scanCount: 9 },
  { rank: 24, domain: 'ramp.com', category: 'Fintech', geoScore: 87, citationWinRate: 85, zeroClickResilience: 83, trend: 'up', trendDelta: 4, scanCount: 8 },
  { rank: 25, domain: 'webflow.com', category: 'SaaS/Design', geoScore: 87, citationWinRate: 84, zeroClickResilience: 82, trend: 'flat', trendDelta: 0, scanCount: 12 },
  { rank: 26, domain: 'neon.tech', category: 'Developer', geoScore: 87, citationWinRate: 84, zeroClickResilience: 82, trend: 'up', trendDelta: 3, scanCount: 7 },
  { rank: 27, domain: 'segment.com', category: 'Developer', geoScore: 87, citationWinRate: 84, zeroClickResilience: 82, trend: 'flat', trendDelta: 0, scanCount: 10 },
  { rank: 28, domain: 'turso.tech', category: 'Developer', geoScore: 86, citationWinRate: 84, zeroClickResilience: 82, trend: 'up', trendDelta: 4, scanCount: 8 },
  { rank: 29, domain: 'intercom.com', category: 'SaaS/Tools', geoScore: 86, citationWinRate: 83, zeroClickResilience: 81, trend: 'up', trendDelta: 2, scanCount: 11 },
  { rank: 30, domain: 'framer.com', category: 'SaaS/Design', geoScore: 86, citationWinRate: 83, zeroClickResilience: 81, trend: 'up', trendDelta: 3, scanCount: 9 },
  { rank: 31, domain: 'cohere.com', category: 'AI/Tech', geoScore: 86, citationWinRate: 83, zeroClickResilience: 81, trend: 'down', trendDelta: -1, scanCount: 5 },
  { rank: 32, domain: 'brex.com', category: 'Fintech', geoScore: 85, citationWinRate: 82, zeroClickResilience: 80, trend: 'up', trendDelta: 3, scanCount: 9 },
  { rank: 33, domain: 'miro.com', category: 'SaaS/Tools', geoScore: 85, citationWinRate: 82, zeroClickResilience: 80, trend: 'up', trendDelta: 2, scanCount: 10 },
  { rank: 34, domain: 'klaviyo.com', category: 'E-Commerce', geoScore: 85, citationWinRate: 82, zeroClickResilience: 80, trend: 'flat', trendDelta: 0, scanCount: 8 },
  { rank: 35, domain: 'airtable.com', category: 'SaaS/Tools', geoScore: 84, citationWinRate: 81, zeroClickResilience: 79, trend: 'flat', trendDelta: 0, scanCount: 11 },
  { rank: 36, domain: 'scale.com', category: 'AI/Tech', geoScore: 84, citationWinRate: 81, zeroClickResilience: 79, trend: 'up', trendDelta: 2, scanCount: 6 },
  { rank: 37, domain: 'cal.com', category: 'Developer', geoScore: 84, citationWinRate: 81, zeroClickResilience: 79, trend: 'up', trendDelta: 3, scanCount: 7 },
  { rank: 38, domain: 'dub.co', category: 'Developer', geoScore: 83, citationWinRate: 80, zeroClickResilience: 78, trend: 'up', trendDelta: 6, scanCount: 9 },
  { rank: 39, domain: 'railway.app', category: 'Developer', geoScore: 83, citationWinRate: 80, zeroClickResilience: 78, trend: 'up', trendDelta: 2, scanCount: 6 },
  { rank: 40, domain: 'adyen.com', category: 'Fintech', geoScore: 83, citationWinRate: 80, zeroClickResilience: 78, trend: 'flat', trendDelta: 0, scanCount: 8 },
  { rank: 41, domain: 'asana.com', category: 'SaaS/Tools', geoScore: 82, citationWinRate: 79, zeroClickResilience: 77, trend: 'down', trendDelta: -1, scanCount: 10 },
  { rank: 42, domain: 'bigcommerce.com', category: 'E-Commerce', geoScore: 82, citationWinRate: 78, zeroClickResilience: 76, trend: 'down', trendDelta: -2, scanCount: 6 },
  { rank: 43, domain: 'clickup.com', category: 'SaaS/Tools', geoScore: 81, citationWinRate: 77, zeroClickResilience: 75, trend: 'up', trendDelta: 1, scanCount: 7 },
  { rank: 44, domain: 'mercury.com', category: 'Fintech', geoScore: 81, citationWinRate: 78, zeroClickResilience: 76, trend: 'down', trendDelta: -2, scanCount: 8 },
  { rank: 45, domain: 'gorgias.com', category: 'E-Commerce', geoScore: 80, citationWinRate: 76, zeroClickResilience: 74, trend: 'up', trendDelta: 2, scanCount: 5 },
  { rank: 46, domain: 'loom.com', category: 'SaaS/Tools', geoScore: 79, citationWinRate: 76, zeroClickResilience: 74, trend: 'down', trendDelta: -3, scanCount: 7 },
  { rank: 47, domain: 'spline.design', category: 'SaaS/Design', geoScore: 78, citationWinRate: 74, zeroClickResilience: 72, trend: 'up', trendDelta: 4, scanCount: 4 },
  { rank: 48, domain: 'attentive.com', category: 'E-Commerce', geoScore: 78, citationWinRate: 74, zeroClickResilience: 72, trend: 'flat', trendDelta: 0, scanCount: 5 },
];
