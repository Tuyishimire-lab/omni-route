import { createClient } from '@libsql/client';
import crypto from 'node:crypto';

const url = process.env.DATABASE_URL || "libsql://omniroute-prod-tuyishimire-lab.aws-us-east-1.turso.io";
const authToken = process.env.DATABASE_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMzkzMDgsImlkIjoiMDFhMDFmYzItYWIwMS03YjVhLWFiOGItYzQ3OTA3ZTczYWVkIiwia2lkIjoiaGhXVEttQm5fZDVHY1NhYnJRUGh5UzBqai1iUTNZTXVhZ04wVUZxekUxMCIsInJpZCI6IjlhYzI2MzNhLTZjNTEtNDE1OS1iZGJkLTZjMmE0YTI5ZDZkYiJ9.okS0Tibgt0rk3O1Jqr5pTGdtRmmVymojBARky1tOllLUi1ZsLHaYXeTsXZHp26RhdCljeORc9pCetlrxg3EcDQ";

const client = createClient({ url, authToken });

const SOURCES = [
  { name: 'Perplexity Pro Sonar Node-East', channel: 'Perplexity' },
  { name: 'OpenAI SearchBot Latent Router', channel: 'OpenAI' },
  { name: 'Claude-3.5-Sonnet Web Citation Cluster', channel: 'Claude' },
  { name: 'Google Gemini Grounding Cluster #4', channel: 'Gemini' },
  { name: 'Autonomous Buyer Bot #9102', channel: 'agent.json' },
  { name: 'LangChain Agent Tool Runner', channel: 'agent.json' },
  { name: 'P2P Verified Human Mesh Node #18', channel: 'P2P Mesh' },
];

const PATHS = [
  '/.well-known/agent.json',
  '/api/agent/catalog',
  '/pricing',
  '/docs/vector-embeddings',
  '/solutions/enterprise-api',
  '/products/checkout'
];

const INTENTS = [
  { text: 'Direct Catalog Purchase ($349.00)', type: 'AGENT_TX', valueRange: [120, 650] },
  { text: 'Primary Source Citation Extraction', type: 'AI_CITATION', valueRange: null },
  { text: 'Vector Semantic Grounding Verification', type: 'GEO_INDEX_PING', valueRange: null },
  { text: 'Autonomous B2B Service Booking', type: 'AGENT_TX', valueRange: [250, 1200] },
  { text: 'Empirical Performance Benchmark Lookup', type: 'GEO_INDEX_PING', valueRange: null },
  { text: 'Verified Human Referral Influx', type: 'P2P_MESH_CLICK', valueRange: null }
];

async function migrate() {
  console.log('Creating TelemetryEvent table...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "TelemetryEvent" (
      "id" TEXT PRIMARY KEY,
      "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "type" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "domain" TEXT NOT NULL,
      "destinationUrl" TEXT NOT NULL,
      "intent" TEXT NOT NULL,
      "geoScoreAtTime" INTEGER NOT NULL DEFAULT 80,
      "settlementValue" REAL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS "TelemetryEvent_timestamp_idx" ON "TelemetryEvent"("timestamp");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "TelemetryEvent_domain_idx" ON "TelemetryEvent"("domain");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "TelemetryEvent_type_idx" ON "TelemetryEvent"("type");`);
  console.log('✓ TelemetryEvent table and indexes created');

  // Fetch registered domains
  const domainRows = await client.execute('SELECT domain, latestGeoScore FROM "Domain"');
  const domains = domainRows.rows.map(r => ({ domain: String(r.domain), score: Number(r.latestGeoScore) || 85 }));
  
  if (domains.length === 0) {
    domains.push({ domain: 'stripe.com', score: 94 }, { domain: 'openai.com', score: 97 });
  }

  console.log(`Generating 120 historical telemetry records across ${domains.length} domains...`);

  for (let i = 0; i < 120; i++) {
    const id = crypto.randomUUID();
    const dObj = domains[Math.floor(Math.random() * domains.length)];
    const sourceObj = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    const path = PATHS[Math.floor(Math.random() * PATHS.length)];
    const intentObj = INTENTS[Math.floor(Math.random() * INTENTS.length)];
    
    // Spread timestamps across the last 7 days
    const pastMinutes = Math.floor(Math.random() * 60 * 24 * 7);
    const eventTime = new Date(Date.now() - pastMinutes * 60 * 1000).toISOString();

    const settlementValue = intentObj.valueRange 
      ? Math.floor(intentObj.valueRange[0] + Math.random() * (intentObj.valueRange[1] - intentObj.valueRange[0]))
      : null;

    await client.execute({
      sql: `
        INSERT INTO "TelemetryEvent" (
          id, timestamp, type, source, domain, destinationUrl, intent, geoScoreAtTime, settlementValue
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      args: [
        id,
        eventTime,
        intentObj.type,
        sourceObj.name,
        dObj.domain,
        `https://${dObj.domain}${path}`,
        intentObj.text,
        Math.max(50, Math.min(99, dObj.score + Math.floor((Math.random() - 0.5) * 6))),
        settlementValue
      ]
    });
  }

  const countRes = await client.execute('SELECT COUNT(*) as count, SUM(settlementValue) as gmv FROM "TelemetryEvent"');
  console.log(`✓ Telemetry populated! Total Events: ${countRes.rows[0]?.count}, Total Attested GMV: $${Math.round(Number(countRes.rows[0]?.gmv) || 0)}`);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
