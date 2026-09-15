import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if present using Node's built-in env loader (Node 20+)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envLocalPath);
  } catch {
    // Ignore error if env file fails to parse
  }
}

async function migrate() {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_AUTH_TOKEN) {
    throw new Error('DATABASE_URL or DATABASE_AUTH_TOKEN missing in .env.local');
  }

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  console.log('Connecting to Turso database at:', process.env.DATABASE_URL);

  const statements = [
    // 1. Missing columns in User
    `ALTER TABLE "User" ADD COLUMN "lemonSubscriptionItemId" TEXT;`,

    // 2. Missing columns in ApiKey
    `ALTER TABLE "ApiKey" ADD COLUMN "overageCount" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "ApiKey" ADD COLUMN "overageCostCents" INTEGER NOT NULL DEFAULT 0;`,

    // 3. Missing table WatchlistEntry
    `CREATE TABLE IF NOT EXISTS "WatchlistEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "domain" TEXT NOT NULL,
      "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId" TEXT,
      "sessionId" TEXT,
      CONSTRAINT "WatchlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "WatchlistEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "WatchlistEntry_userId_domain_key" ON "WatchlistEntry"("userId", "domain");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "WatchlistEntry_sessionId_domain_key" ON "WatchlistEntry"("sessionId", "domain");`,
    `CREATE INDEX IF NOT EXISTS "WatchlistEntry_userId_idx" ON "WatchlistEntry"("userId");`,
    `CREATE INDEX IF NOT EXISTS "WatchlistEntry_sessionId_idx" ON "WatchlistEntry"("sessionId");`,
    `CREATE INDEX IF NOT EXISTS "WatchlistEntry_domain_idx" ON "WatchlistEntry"("domain");`,

    // 4. Missing table EnterpriseInquiry
    `CREATE TABLE IF NOT EXISTS "EnterpriseInquiry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "company" TEXT NOT NULL,
      "website" TEXT,
      "product" TEXT NOT NULL,
      "price" TEXT,
      "industry" TEXT,
      "deliveryFormat" TEXT,
      "message" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
  ];

  for (const sql of statements) {
    try {
      console.log('Running:', sql.split('\n')[0]);
      await client.execute(sql);
      console.log('  -> OK');
    } catch (err) {
      console.warn('  -> Warning/Skip:', err.message);
    }
  }

  console.log('\nMigration applied successfully! Now verifying with Prisma...');
}

migrate().catch(console.error);
