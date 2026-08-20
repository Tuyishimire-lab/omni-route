import { createClient } from '@libsql/client';
import crypto from 'node:crypto';

const url = "libsql://omniroute-prod-tuyishimire-lab.aws-us-east-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMzkzMDgsImlkIjoiMDFhMDFmYzItYWIwMS03YjVhLWFiOGItYzQ3OTA3ZTczYWVkIiwia2lkIjoiaGhXVEttQm5fZDVHY1NhYnJRUGh5UzBqai1iUTNZTXVhZ04wVUZxekUxMCIsInJpZCI6IjlhYzI2MzNhLTZjNTEtNDE1OS1iZGJkLTZjMmE0YTI5ZDZkYiJ9.okS0Tibgt0rk3O1Jqr5pTGdtRmmVymojBARky1tOllLUi1ZsLHaYXeTsXZHp26RhdCljeORc9pCetlrxg3EcDQ";

const client = createClient({ url, authToken });

const SEED_DOMAINS = [
  { domain: 'stripe.com', url: 'https://stripe.com', score: 94, citation: 91, zeroClick: 88, infoGain: 96, entity: 95, vector: 94, category: 'Fintech', status: 'OPTIMAL' },
  { domain: 'shopify.com', url: 'https://shopify.com', score: 91, citation: 88, zeroClick: 85, infoGain: 92, entity: 90, vector: 89, category: 'E-commerce', status: 'OPTIMAL' },
  { domain: 'linear.app', url: 'https://linear.app', score: 87, citation: 84, zeroClick: 82, infoGain: 89, entity: 86, vector: 88, category: 'Developer Tools', status: 'OPTIMAL' },
  { domain: 'vercel.com', url: 'https://vercel.com', score: 92, citation: 89, zeroClick: 86, infoGain: 94, entity: 91, vector: 93, category: 'Developer Tools', status: 'OPTIMAL' },
  { domain: 'notion.so', url: 'https://notion.so', score: 85, citation: 80, zeroClick: 79, infoGain: 88, entity: 84, vector: 86, category: 'Productivity', status: 'OPTIMAL' },
  { domain: 'figma.com', url: 'https://figma.com', score: 83, citation: 78, zeroClick: 76, infoGain: 84, entity: 82, vector: 85, category: 'Design', status: 'OPTIMAL' },
  { domain: 'hubspot.com', url: 'https://hubspot.com', score: 79, citation: 72, zeroClick: 70, infoGain: 81, entity: 78, vector: 80, category: 'Marketing', status: 'MODERATE' },
  { domain: 'intercom.com', url: 'https://intercom.com', score: 76, citation: 68, zeroClick: 65, infoGain: 79, entity: 75, vector: 77, category: 'Support', status: 'MODERATE' },
];

async function main() {
  console.log('Seeding initial benchmark domains into Turso...');

  for (const item of SEED_DOMAINS) {
    const id = crypto.randomUUID();
    await client.execute({
      sql: `
        INSERT INTO "Domain" (
          id, domain, url, latestGeoScore, latestCitationRate, latestZeroClickResilience,
          latestInfoGainScore, latestEntityScore, latestVectorReadiness, category, status, scanCount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(domain) DO UPDATE SET
          latestGeoScore = excluded.latestGeoScore,
          latestCitationRate = excluded.latestCitationRate,
          latestZeroClickResilience = excluded.latestZeroClickResilience,
          latestInfoGainScore = excluded.latestInfoGainScore,
          latestEntityScore = excluded.latestEntityScore,
          latestVectorReadiness = excluded.latestVectorReadiness;
      `,
      args: [id, item.domain, item.url, item.score, item.citation, item.zeroClick, item.infoGain, item.entity, item.vector, item.category, item.status]
    });

    const eventId = crypto.randomUUID();
    await client.execute({
      sql: `
        INSERT INTO "ScanEvent" (
          id, domain, domainId, geoScore, zeroClickResilience, citationRate,
          infoGainScore, entityScore, vectorReadiness, status, isLiveScan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
      `,
      args: [eventId, item.domain, id, item.score, item.zeroClick, item.citation, item.infoGain, item.entity, item.vector, item.status]
    });
  }

  console.log(`✓ Successfully seeded ${SEED_DOMAINS.length} benchmark domains into Turso!`);
}

main().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
