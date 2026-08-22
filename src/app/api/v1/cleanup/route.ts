import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

/**
 * ONE-TIME DATA CLEANUP ENDPOINT
 * Wipes seeded fake TelemetryEvent rows before real users arrive.
 * Protected by CRON_SECRET — delete this file immediately after use.
 *
 * Usage:
 *   curl -X POST https://omni-route-rho.vercel.app/api/v1/cleanup \
 *     -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Count before wipe so we have an audit trail
    const before = await prisma.telemetryEvent.count();

    // Wipe ALL TelemetryEvent rows — these are 100% seeded fake data.
    // ScanEvent, Domain, User rows are preserved (they contain real data).
    await prisma.telemetryEvent.deleteMany({});

    // Also clear expired rate-limit records from testing
    const rlDeleted = await prisma.rateLimitRecord.deleteMany({});

    const after = await prisma.telemetryEvent.count();

    console.log(`[cleanup] Wiped ${before} TelemetryEvent rows. RateLimitRecord: ${rlDeleted.count} cleared.`);

    return NextResponse.json({
      success: true,
      wiped: {
        telemetryEvents: before - after,
        rateLimitRecords: rlDeleted.count,
      },
      preserved: ['Domain', 'ScanEvent', 'User', 'ApiKey', 'Session'],
      message: 'Database cleaned. Delete /api/v1/cleanup now.',
    });
  } catch (err) {
    console.error('[cleanup] Error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
