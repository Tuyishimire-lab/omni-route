import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * GET /api/health
 *
 * Used by uptime monitors (UptimeRobot, BetterStack, etc.).
 * Returns 200 when the service and DB are healthy, 503 otherwise.
 *
 * Response shape:
 *  { status: 'ok' | 'degraded', version, timestamp, checks: { db, config } }
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // ── 1. Database reachability ─────────────────────────────────────────────
  try {
    const dbStart = Date.now();
    await prisma.domain.count();
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.db = { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }

  // ── 2. Critical config present ───────────────────────────────────────────
  const missingEnv = ['JWT_SECRET', 'DATABASE_URL', 'DATABASE_AUTH_TOKEN'].filter(
    (k) => !process.env[k]
  );
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
        // Don't cache — monitors need a fresh probe every time
        'Cache-Control': 'no-store',
      },
    }
  );
}
