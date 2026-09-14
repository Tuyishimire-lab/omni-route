import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

/**
 * GET /api/v1/directory
 * Returns all domains in the database for the public directory page.
 * No auth required - this is a public browsing endpoint.
 *
 * Protected by:
 *   - Rate limiting: 30 requests per minute per IP
 *   - CDN cache: 5-minute stale-while-revalidate so repeat visits
 *     are served from Vercel's edge without hitting Turso
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit: 30 req/min per IP (generous for browsing, blocks scrapers)
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'directory', 60_000, 30);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) },
        }
      );
    }

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

    return NextResponse.json(
      { domains, total: domains.length },
      {
        headers: {
          // CDN cache: serve stale for 5 min, revalidate in background
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('[directory] Error fetching domains:', err);
    return NextResponse.json({ domains: [], total: 0 });
  }
}
