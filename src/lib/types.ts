export type EngineType = 'perplexity' | 'chatgpt' | 'claude' | 'gemini';

export interface EngineScore {
  engine: EngineType;
  name: string;
  score: number; // 0 - 100
  citationProbability: number; // percentage e.g. 78%
  indexedChunks: number;
  sentimentRating: 'High Authority' | 'Moderate' | 'Low / Excluded';
  lastCrawledAgent: string;
}

export interface EntityNode {
  name: string;
  type: 'Brand' | 'Product' | 'Industry' | 'Key Feature' | 'Competitor';
  confidence: number;
  groundedInKG: boolean;
}

export interface Recommendation {
  id: string;
  category: 'Schema' | 'Information Gain' | 'Agentic API' | 'Vector Density';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  impact: string;
  codeSnippet?: string;
}

export interface LiveExtractionMetadata {
  isLiveScanned: boolean;
  httpStatus?: number;
  extractedTitle?: string;
  extractedDescription?: string;
  schemaJsonLdCount: number;
  h1Count: number;
  h2Count: number;
  tableCount: number;
  wordCount: number;
  hasRobotsIndexingAllowed: boolean;
  detectedSchemas: string[];
}

export interface GeoAuditReport {
  domain: string;
  url: string;
  analyzedAt: string;
  overallGeoScore: number; // 0 - 100
  zeroClickResilience: number; // 0 - 100
  informationGainScore: number; // 0 - 100
  entityDisambiguationScore: number; // 0 - 100
  vectorReadinessScore: number; // 0 - 100
  engineBreakdown: EngineScore[];
  detectedEntities: EntityNode[];
  recommendations: Recommendation[];
  summary: string;
  liveMetadata?: LiveExtractionMetadata;
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
}

export interface WatchedDomain {
  id: string;
  domain: string;
  url: string;
  lastGeoScore: number;
  previousGeoScore?: number;
  addedAt: string;
  lastScannedAt: string;
  zeroClickResilience: number;
  citationProbability: number;
  status: 'OPTIMAL' | 'MODERATE' | 'AT_RISK';
  scoreHistory?: ScoreHistoryPoint[];
}

export interface AgentServiceEndpoint {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST';
  description: string;
  authRequired: boolean;
  pricingType: 'free' | 'per_call' | 'subscription' | 'checkout';
}

export interface AgentProductSchema {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  category: string;
  inStock: boolean;
  directAgentCheckoutUrl: string;
}

export interface AgentManifest {
  version: string;
  siteName: string;
  domain: string;
  description: string;
  organization: {
    legalName: string;
    foundedYear: number;
    headquarters: string;
    contactEmail: string;
  };
  capabilities: string[];
  endpoints: AgentServiceEndpoint[];
  products?: AgentProductSchema[];
  semanticVectors: {
    embeddingsUrl: string;
    contextSizeTokens: number;
    lastUpdated: string;
  };
  accessPolicy: {
    allowAgentCrawlers: boolean;
    allowDirectTransactions: boolean;
    rateLimitPerMin: number;
  };
}



export interface LiveTelemetryEvent {
  id: string;
  timestamp: string;
  type: 'AI_CITATION' | 'AGENT_TX' | 'P2P_MESH_CLICK' | 'GEO_INDEX_PING';
  source: string;
  destinationUrl: string;
  intent: string;
  geoScoreAtTime: number;
  settlementValue?: number;
}
