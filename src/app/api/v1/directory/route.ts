import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/directory
 * Returns all domains in the database for the public directory page.
 * No auth required - this is a public browsing endpoint.
 */
export async function GET() {
  try {
    const domains = await prisma.domain.findMany({
      select: {
        domain: true,
        category: true,
        latestGeoScore: true,
        status: true,
        trend: true,
        trendDelta: true,
        scanCount: true,
      },
      orderBy: { latestGeoScore: 'desc' },
    });

    return NextResponse.json({
      domains,
      total: domains.length,
    });
  } catch (err) {
    console.error('[directory] Error fetching domains:', err);
    return NextResponse.json({ domains: [], total: 0 });
  }
}
