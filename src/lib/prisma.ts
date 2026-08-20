import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const DB_URL = process.env.DATABASE_URL || 'file:./omniroute.db';
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || undefined;

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: DB_URL,
    authToken: AUTH_TOKEN,
  });
  return new PrismaClient({ adapter } as object);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
