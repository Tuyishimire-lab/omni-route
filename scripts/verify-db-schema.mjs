import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
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

const DB_URL = process.env.DATABASE_URL || 'file:./citeroute.db';
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

console.log('────────────────────────────────────────────────────────');
console.log('🔍 Database Schema Pre-Flight Verification');
console.log(`📡 Target Database: ${DB_URL.startsWith('libsql://') ? 'Turso (Remote)' : 'SQLite (Local)'}`);
console.log('────────────────────────────────────────────────────────');

const adapter = new PrismaLibSql({
  url: DB_URL,
  authToken: AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

const MODELS = [
  { name: 'User', probe: () => prisma.user.findFirst() },
  { name: 'ApiKey', probe: () => prisma.apiKey.findFirst() },
  { name: 'Domain', probe: () => prisma.domain.findFirst() },
  { name: 'ScanEvent', probe: () => prisma.scanEvent.findFirst() },
  { name: 'Session', probe: () => prisma.session.findFirst() },
  { name: 'TelemetryEvent', probe: () => prisma.telemetryEvent.findFirst() },
  { name: 'RegisteredSite', probe: () => prisma.registeredSite.findFirst() },
  { name: 'TagHeartbeat', probe: () => prisma.tagHeartbeat.findFirst() },
  { name: 'RateLimitRecord', probe: () => prisma.rateLimitRecord.findFirst() },
  { name: 'WatchlistEntry', probe: () => prisma.watchlistEntry.findFirst() },
  { name: 'EmailVerification', probe: () => prisma.emailVerification.findFirst() },
  { name: 'EnterpriseInquiry', probe: () => prisma.enterpriseInquiry.findFirst() },
];

async function verify() {
  let hasErrors = false;

  for (const { name, probe } of MODELS) {
    let passed = false;
    let lastError = null;

    // Retry up to 3 times for transient network/handshake blips on remote Turso
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await probe();
        passed = true;
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 3 && String(err?.message || err).includes('fetch failed')) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        break;
      }
    }

    if (passed) {
      console.log(`  ✔ [PASS] ${name.padEnd(20)} - Schema & columns match`);
    } else {
      hasErrors = true;
      console.error(`  ✖ [FAIL] ${name.padEnd(20)} - ${lastError?.message || lastError}`);
    }
  }

  await prisma.$disconnect();

  console.log('────────────────────────────────────────────────────────');
  if (hasErrors) {
    console.error('❌ Schema verification FAILED: Database is missing tables or columns!');
    console.error('👉 Run "node scripts/migrate-turso.mjs" to apply missing migrations.');
    process.exit(1);
  } else {
    console.log('✅ All models and columns verified successfully against target database.');
    process.exit(0);
  }
}

verify().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
