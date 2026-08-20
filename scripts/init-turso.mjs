import { createClient } from '@libsql/client';

const url = "libsql://omniroute-prod-tuyishimire-lab.aws-us-east-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMzkzMDgsImlkIjoiMDFhMDFmYzItYWIwMS03YjVhLWFiOGItYzQ3OTA3ZTczYWVkIiwia2lkIjoiaGhXVEttQm5fZDVHY1NhYnJRUGh5UzBqai1iUTNZTXVhZ04wVUZxekUxMCIsInJpZCI6IjlhYzI2MzNhLTZjNTEtNDE1OS1iZGJkLTZjMmE0YTI5ZDZkYiJ9.okS0Tibgt0rk3O1Jqr5pTGdtRmmVymojBARky1tOllLUi1ZsLHaYXeTsXZHp26RhdCljeORc9pCetlrxg3EcDQ";

const client = createClient({ url, authToken });

async function main() {
  console.log('Connecting to Turso database...');
  
  // 1. Create Domain table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Domain" (
      "id" TEXT PRIMARY KEY,
      "domain" TEXT NOT NULL UNIQUE,
      "url" TEXT,
      "firstScanned" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastScanned" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "latestGeoScore" INTEGER NOT NULL DEFAULT 0,
      "latestCitationRate" INTEGER NOT NULL DEFAULT 0,
      "latestZeroClickResilience" INTEGER NOT NULL DEFAULT 0,
      "latestInfoGainScore" INTEGER NOT NULL DEFAULT 0,
      "latestEntityScore" INTEGER NOT NULL DEFAULT 0,
      "latestVectorReadiness" INTEGER NOT NULL DEFAULT 0,
      "category" TEXT NOT NULL DEFAULT 'General',
      "scanCount" INTEGER NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'MODERATE',
      "trendDelta" INTEGER NOT NULL DEFAULT 0,
      "trend" TEXT NOT NULL DEFAULT 'flat'
    );
  `);
  console.log('✓ Domain table created/verified');

  // 2. Create ScanEvent table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ScanEvent" (
      "id" TEXT PRIMARY KEY,
      "domain" TEXT NOT NULL,
      "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "geoScore" INTEGER NOT NULL,
      "zeroClickResilience" INTEGER NOT NULL DEFAULT 0,
      "citationRate" INTEGER NOT NULL DEFAULT 0,
      "infoGainScore" INTEGER NOT NULL DEFAULT 0,
      "entityScore" INTEGER NOT NULL DEFAULT 0,
      "vectorReadiness" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'MODERATE',
      "sessionId" TEXT,
      "isLiveScan" BOOLEAN NOT NULL DEFAULT 0,
      "rawReport" TEXT,
      "domainId" TEXT
    );
  `);
  console.log('✓ ScanEvent table created/verified');

  // 3. Create Session table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT PRIMARY KEY,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "watchlist" TEXT NOT NULL DEFAULT '[]'
    );
  `);
  console.log('✓ Session table created/verified');

  // Create indexes
  await client.execute(`CREATE INDEX IF NOT EXISTS "Domain_latestGeoScore_idx" ON "Domain"("latestGeoScore");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Domain_domain_idx" ON "Domain"("domain");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "ScanEvent_domain_idx" ON "ScanEvent"("domain");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "ScanEvent_scannedAt_idx" ON "ScanEvent"("scannedAt");`);
  console.log('✓ Indexes created/verified');

  // Seed default initial benchmarks if empty
  const countRes = await client.execute('SELECT COUNT(*) as count FROM "Domain"');
  const count = countRes.rows[0]?.count ?? 0;
  console.log(`Current domain count in Turso: ${count}`);

  console.log('🎉 Turso database schema successfully initialized and ready!');
}

main().catch(err => {
  console.error('Error initializing Turso:', err);
  process.exit(1);
});
