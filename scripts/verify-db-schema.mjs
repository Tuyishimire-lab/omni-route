import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import dotenv from 'dotenv';
import path from 'node:path';

// Load .env.local if present
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

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
    try {
      await probe();
      console.log(`  ✔ [PASS] ${name.padEnd(20)} - Schema & columns match`);
    } catch (err) {
      hasErrors = true;
      console.error(`  ✖ [FAIL] ${name.padEnd(20)} - ${err.message || err}`);
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
