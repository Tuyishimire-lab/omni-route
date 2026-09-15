import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * GET /api/health
 *
 * Used by uptime monitors (UptimeRobot, BetterStack, etc.).
 * Returns 200 when the service, DB schema, and auth models are healthy, 503 otherwise.
 *
 * Probes all mission-critical models with full-column queries so that any
 * schema drift (e.g. missing columns on remote DB) is detected immediately.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // ── 1. Database & Schema Integrity Probe ───────────────────────────────────
  // We execute findFirst on the core operational models. In Prisma, querying
  // without a select projection automatically selects all schema columns.
  // If any column or table is missing in the database, this throws immediately.
  try {
    const dbStart = Date.now();
    await Promise.all([
      prisma.domain.findFirst(),
      prisma.user.findFirst(),
      prisma.apiKey.findFirst(),
      prisma.rateLimitRecord.findFirst(),
      prisma.watchlistEntry.findFirst(),
    ]);
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.db = {
      ok: false,
      error: err instanceof Error ? err.message : 'Database schema probe failed',
    };
  }

  // ── 2. Critical Configuration Check ───────────────────────────────────────
  const missingEnv: string[] = [];
  if (!process.env.DATABASE_URL) {
    missingEnv.push('DATABASE_URL');
  }
  if (process.env.DATABASE_URL?.startsWith('libsql://') && !process.env.DATABASE_AUTH_TOKEN) {
    missingEnv.push('DATABASE_AUTH_TOKEN');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    missingEnv.push('JWT_SECRET');
  }

  checks.config = missingEnv.length === 0
    ? { ok: true }
    : { ok: false, error: `Missing env vars: ${missingEnv.join(', ')}` };

  // ── Derive overall status ────────────────────────────────────────────────
  const allOk = Object.values(checks).every((c) => c.ok);
  const httpStatus = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - start,
      checks,
    },
    {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
