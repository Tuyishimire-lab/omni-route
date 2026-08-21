import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// @libsql/client handles both local file: paths and remote libsql:// URLs
const DB_URL = process.env.DATABASE_URL || 'file:./omniroute.db';
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

function createPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      console.error('[prisma] CRITICAL: DATABASE_URL is not set on this deployment!');
    }
    if (!process.env.DATABASE_AUTH_TOKEN) {
      console.error('[prisma] CRITICAL: DATABASE_AUTH_TOKEN is not set on this deployment!');
    }
  }

  // Prisma 7+ requires a driver adapter — libsql works for both:
  //   - Remote Turso:  libsql://xxx.turso.io  (production)
  //   - Local SQLite:  file:./omniroute.db    (dev/test)
  const adapter = new PrismaLibSql({
    url: DB_URL,
    authToken: AUTH_TOKEN,
  });

  return new PrismaClient({ adapter } as object);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
