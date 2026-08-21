import { PrismaClient } from '@prisma/client';

const DB_URL = process.env.DATABASE_URL || 'file:./omniroute.db';
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

function createPrismaClient(): PrismaClient {
  // Warn loudly in production if env vars are missing
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    console.error('[prisma] CRITICAL: DATABASE_URL is not set on this deployment!');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_AUTH_TOKEN) {
    console.error('[prisma] CRITICAL: DATABASE_AUTH_TOKEN is not set on this deployment!');
  }

  // Use libsql adapter only for remote Turso URLs (libsql:// or https://)
  // Fall back to standard SQLite for local file:// development
  if (DB_URL.startsWith('libsql://') || DB_URL.startsWith('https://') || DB_URL.startsWith('http://')) {
    // Dynamic import to avoid issues when adapter isn't needed
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    const adapter = new PrismaLibSql({
      url: DB_URL,
      authToken: AUTH_TOKEN,
    });
    return new PrismaClient({ adapter } as object);
  }

  // Local SQLite (development)
  return new PrismaClient();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
