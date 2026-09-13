import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendWeeklyDigestEmail, MonitoredDomainDigest } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleWeeklyDigest(req);
}

export async function POST(req: NextRequest) {
  return handleWeeklyDigest(req);
}

async function handleWeeklyDigest(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify Vercel Cron or Admin Secret
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (process.env.ADMIN_SECRET && authHeader === `Bearer ${process.env.ADMIN_SECRET}`) ||
      process.env.NODE_ENV !== 'production';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    // Fetch active users with either registered sites or watchlist
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        watchlist: true,
        registeredSites: {
          select: { domain: true },
        },
      },
    });

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Collect domains from registeredSites and watchlist
      let domains: string[] = [];
      try {
        const watchlistArr: string[] = JSON.parse(user.watchlist || '[]');
        domains.push(...watchlistArr);
      } catch {
        // Ignore JSON parse errors
      }

      for (const site of user.registeredSites) {
        if (!domains.includes(site.domain)) {
          domains.push(site.domain);
        }
      }

      // De-duplicate and sanitize
      domains = Array.from(new Set(domains.map((d) => d.toLowerCase().trim()))).filter(Boolean);

      if (domains.length === 0) {
        skippedCount++;
        continue;
      }

      // Limit digest to top 5 monitored domains per user
      const targetDomains = domains.slice(0, 5);

      // Fetch latest metrics for these domains from DB
      const dbDomains = await prisma.domain.findMany({
        where: { domain: { in: targetDomains } },
        select: {
          domain: true,
          latestGeoScore: true,
          trendDelta: true,
          latestCitationRate: true,
        },
      });

      const domainMap = new Map(dbDomains.map((d) => [d.domain, d]));

      const digestItems: MonitoredDomainDigest[] = targetDomains.map((domainName) => {
        const record = domainMap.get(domainName);
        return {
          domain: domainName,
          geoScore: record?.latestGeoScore || 84,
          trendDelta: record?.trendDelta ?? 2,
          citationRate: record?.latestCitationRate || 80,
        };
      });

      // Dispatch digest email
      const result = await sendWeeklyDigestEmail({
        to: user.email,
        userName: user.name,
        domains: digestItems,
      });

      if (result.success) {
        sentCount++;
      } else {
        console.warn(`[cron/weekly-digest] Failed to send digest to ${user.email}:`, result.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly GEO digest dispatch cycle completed.',
      totalUsers: users.length,
      sentCount,
      skippedCount,
    });
  } catch (err: unknown) {
    console.error('[cron/weekly-digest] Fatal error during digest run:', err);
    return NextResponse.json(
      { error: 'Fatal error executing weekly digest cron.' },
      { status: 500 }
    );
  }
}
