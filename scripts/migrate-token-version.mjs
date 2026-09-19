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

const statement = `ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 1;`;

async function applyToDb(url, authToken, label) {
  console.log(`\nMigrating ${label} at: ${url}`);
  const client = createClient({ url, authToken });
  try {
    console.log('Running:', statement);
    await client.execute(statement);
    console.log('  -> OK');
  } catch (err) {
    if (err.message && err.message.includes('duplicate column')) {
      console.log('  -> Column tokenVersion already exists.');
    } else {
      console.warn('  -> Warning/Skip:', err.message);
    }
  }
}

async function run() {
  if (process.env.DATABASE_URL) {
    await applyToDb(process.env.DATABASE_URL, process.env.DATABASE_AUTH_TOKEN, 'Target Database (from env)');
  }

  // Also ensure local citeroute.db has column if present
  const localDbPath = path.resolve(process.cwd(), 'citeroute.db');
  if (fs.existsSync(localDbPath) && process.env.DATABASE_URL !== 'file:./citeroute.db') {
    await applyToDb('file:./citeroute.db', undefined, 'Local SQLite (citeroute.db)');
  }

  console.log('\ntokenVersion column migration complete.');
}

run().catch(console.error);
