import { LiveTelemetryEvent } from './types';

const sources = [
  'Perplexity Pro Agent #841',
  'OpenAI SearchBot Node-US-East',
  'Claude-3.5-Sonnet-Crawler',
  'Apple Intelligence Discovery Subagent',
  'Gemini Grounding Cluster #4',
  'Autonomous Shopping Bot #9102',
  'P2P Verified Human Mesh Node #18'
];

const paths = [
  '/products/enterprise-geo',
  '/docs/agent-protocol',
  '/.well-known/agent.json',
  '/solutions/zero-click-defense',
  '/pricing/agent-tier',
  '/research/geo-index'
];

const intents = [
  'Direct Catalog Purchase ($299.00)',
  'Generative Citation Extraction',
  'Vector Semantic Grounding',
  'Autonomous Service Booking',
  'Empirical Dataset Lookup',
  'Verified Human Referral Visit'
];

export function generateMockTelemetryEvent(): LiveTelemetryEvent {
  const source = sources[Math.floor(Math.random() * sources.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const isTx = source.includes('Shopping Bot') || Math.random() > 0.7;

  let eventType: LiveTelemetryEvent['type'] = 'AI_CITATION';
  if (isTx) eventType = 'AGENT_TX';
  else if (source.includes('Human')) eventType = 'P2P_MESH_CLICK';
  else if (Math.random() > 0.5) eventType = 'GEO_INDEX_PING';

  return {
    id: 'evt-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    type: eventType,
    source,
    destinationUrl: path,
    intent: intents[Math.floor(Math.random() * intents.length)],
    geoScoreAtTime: Math.floor(78 + Math.random() * 18),
    settlementValue: isTx ? Math.floor(50 + Math.random() * 450) : undefined
  };
}

export function getInitialTelemetry(count: number = 7): LiveTelemetryEvent[] {
  return Array.from({ length: count }, () => generateMockTelemetryEvent());
}
