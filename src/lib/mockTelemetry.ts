import { LiveTelemetryEvent } from './types';
import { DEFAULT_LEADERBOARD_ENTRIES } from './defaultLeaderboard';

const sources = [
  'Perplexity Pro Sonar Node-East',
  'OpenAI SearchBot Latent Router',
  'Claude-3.5-Sonnet Web Citation Cluster',
  'Apple Intelligence Discovery Subagent',
  'Google Gemini Grounding Cluster #4',
  'Autonomous Buyer Bot #9102',
  'LangChain Agent Tool Runner',
  'P2P Verified Human Mesh Node #18'
];

const domainList = DEFAULT_LEADERBOARD_ENTRIES.map((d) => d.domain);

const paths = [
  '/.well-known/agent.json',
  '/api/agent/catalog',
  '/pricing',
  '/docs/vector-embeddings',
  '/solutions/enterprise-api',
  '/products/checkout'
];

const intents = [
  'Direct Catalog Purchase ($349.00)',
  'Primary Source Citation Extraction',
  'Vector Semantic Grounding Verification',
  'Autonomous B2B Service Booking',
  'Empirical Performance Benchmark Lookup',
  'Verified Human Referral Influx'
];

export function generateMockTelemetryEvent(): LiveTelemetryEvent {
  const source = sources[Math.floor(Math.random() * sources.length)];
  const targetDomain = domainList[Math.floor(Math.random() * domainList.length)] || 'stripe.com';
  const path = paths[Math.floor(Math.random() * paths.length)];
  const isTx = source.includes('Buyer Bot') || Math.random() > 0.75;

  let eventType: LiveTelemetryEvent['type'] = 'AI_CITATION';
  if (isTx) eventType = 'AGENT_TX';
  else if (source.includes('Human')) eventType = 'P2P_MESH_CLICK';
  else if (Math.random() > 0.5) eventType = 'GEO_INDEX_PING';

  return {
    id: 'evt-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    type: eventType,
    source,
    destinationUrl: `https://${targetDomain}${path}`,
    intent: intents[Math.floor(Math.random() * intents.length)],
    geoScoreAtTime: Math.floor(82 + Math.random() * 16),
    settlementValue: isTx ? Math.floor(80 + Math.random() * 620) : undefined
  };
}

export function getInitialTelemetry(count: number = 7): LiveTelemetryEvent[] {
  return Array.from({ length: count }, () => generateMockTelemetryEvent());
}
