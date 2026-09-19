import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envLocalPath);
  } catch {
    // Ignore error
  }
}

const statements = [
  `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");`,
  `CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");`,
];

async function applyToDb(url, authToken, label) {
  console.log(`\nMigrating ${label} at: ${url}`);
  const client = createClient({ url, authToken });
  for (const sql of statements) {
    try {
      console.log('Running:', sql.trim().split('\n')[0]);
      await client.execute(sql);
      console.log('  -> OK');
    } catch (err) {
      console.warn('  -> Warning:', err.message);
    }
  }
}

async function run() {
  if (process.env.DATABASE_URL) {
    await applyToDb(process.env.DATABASE_URL, process.env.DATABASE_AUTH_TOKEN, 'Target Database (from env)');
  }

  // Also ensure local citeroute.db has table if present
  const localDbPath = path.resolve(process.cwd(), 'citeroute.db');
  if (fs.existsSync(localDbPath) && process.env.DATABASE_URL !== 'file:./citeroute.db') {
    await applyToDb('file:./citeroute.db', undefined, 'Local SQLite (citeroute.db)');
  }

  console.log('\nPasswordResetToken table migration complete.');
}

run().catch(console.error);
