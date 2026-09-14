import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendWeeklyDigestEmail, MonitoredDomainDigest, getWeeklyTip } from '../../../../lib/email';
import { normalizeTier } from '../../../../lib/tierLimits';

export const dynamic = 'force-dynamic';

/** Per-tier limits for how many domains appear in the weekly digest email. */
const DIGEST_DOMAIN_LIMITS: Record<string, number> = {
  free: 3,
  pro: 10,
  agency: 20,
  enterprise: Infinity,
};

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

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tip = getWeeklyTip();

    // Date range string for the digest header
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const digestDate = `${fmt(weekAgo)} - ${fmt(now)}`;

    // Fetch active users with registered sites AND relational watchlist entries
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        role: true,
        watchlist: true, // legacy JSON column (fallback)
        registeredSites: {
          select: { domain: true },
        },
        watchlistEntries: {
          select: { domain: true },
        },
      },
    });

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // ── Collect domains from all sources ────────────────────────────────
      const domainSet = new Set<string>();

      // 1. WatchlistEntry relational table (primary - the new system)
      for (const entry of user.watchlistEntries) {
        domainSet.add(entry.domain.toLowerCase().trim());
      }

      // 2. RegisteredSites
      for (const site of user.registeredSites) {
        domainSet.add(site.domain.toLowerCase().trim());
      }

      // 3. Legacy JSON watchlist column (fallback for users not yet migrated)
      try {
        const watchlistArr: string[] = JSON.parse(user.watchlist || '[]');
        for (const d of watchlistArr) {
          if (d && typeof d === 'string') domainSet.add(d.toLowerCase().trim());
        }
      } catch {
        // Ignore JSON parse errors on legacy column
      }

      // Remove empty strings
      domainSet.delete('');

      if (domainSet.size === 0) {
        skippedCount++;
        continue;
      }

      // Apply tier-aware domain limit
      const tier = user.role === 'admin' ? 'enterprise' : normalizeTier(user.tier);
      const maxDomains = DIGEST_DOMAIN_LIMITS[tier] ?? 3;
      const targetDomains = [...domainSet].slice(0, maxDomains);

      // ── Fetch full Domain rows ─────────────────────────────────────────
      const dbDomains = await prisma.domain.findMany({
        where: { domain: { in: targetDomains } },
        select: {
          domain: true,
          latestGeoScore: true,
          latestCitationRate: true,
          latestZeroClickResilience: true,
          latestInfoGainScore: true,
          latestEntityScore: true,
          latestVectorReadiness: true,
          status: true,
          scanCount: true,
          lastScanned: true,
        },
      });
      const domainMap = new Map(dbDomains.map(d => [d.domain, d]));

      // ── Compute real trendDelta from ScanEvent history ─────────────────
      // For each domain, find the scan closest to 7 days ago and compare
      const scanEvents = await prisma.scanEvent.findMany({
        where: {
          domain: { in: targetDomains },
          scannedAt: { gte: weekAgo },
        },
        orderBy: { scannedAt: 'asc' },
        select: { domain: true, geoScore: true, scannedAt: true },
      });

      // Group scan events by domain
      const scansByDomain = new Map<string, { geoScore: number; scannedAt: Date }[]>();
      for (const ev of scanEvents) {
        if (!scansByDomain.has(ev.domain)) scansByDomain.set(ev.domain, []);
        scansByDomain.get(ev.domain)!.push({ geoScore: ev.geoScore, scannedAt: ev.scannedAt });
      }

      // ── Fetch 7-day TelemetryEvent counts per domain ──────────────────
      // Also includes www. variants for telemetry matching
      const allVariants: string[] = [];
      const variantToDomain = new Map<string, string>();
      for (const d of targetDomains) {
        const bare = d.replace(/^www\./, '');
        const www = `www.${bare}`;
        for (const v of [d, bare, www]) {
          if (!variantToDomain.has(v)) {
            allVariants.push(v);
            variantToDomain.set(v, bare);
          }
        }
      }

      const telemetryEvents = await prisma.telemetryEvent.findMany({
        where: {
          domain: { in: allVariants },
          timestamp: { gte: weekAgo },
        },
        select: { domain: true, source: true },
      });

      // Aggregate: { "stripe.com" => { hits: 12, bots: Set<"GPTBot", "PerplexityBot"> } }
      const trafficMap = new Map<string, { hits: number; bots: Set<string> }>();
      for (const ev of telemetryEvents) {
        const canonDomain = variantToDomain.get(ev.domain) || ev.domain;
        if (!trafficMap.has(canonDomain)) trafficMap.set(canonDomain, { hits: 0, bots: new Set() });
        const entry = trafficMap.get(canonDomain)!;
        entry.hits++;
        if (ev.source) entry.bots.add(ev.source);
      }

      // ── Build digest items ─────────────────────────────────────────────
      const digestItems: MonitoredDomainDigest[] = targetDomains.map((domainName) => {
        const record = domainMap.get(domainName);
        const traffic = trafficMap.get(domainName.replace(/^www\./, ''));
        const scans = scansByDomain.get(domainName) || [];

        // Never scanned: no DB record exists
        if (!record) {
          return {
            domain: domainName,
            geoScore: 0,
            previousGeoScore: null,
            trendDelta: 0,
            citationRate: 0,
            status: 'AT_RISK' as const,
            zeroClickResilience: 0,
            infoGainScore: 0,
            entityScore: 0,
            vectorReadiness: 0,
            agentHits7d: traffic?.hits ?? 0,
            topBots: traffic ? [...traffic.bots].slice(0, 4) : [],
            scanCount: 0,
            lastScannedAt: null,
            dataSource: 'never_scanned' as const,
          };
        }

        // Compute real trendDelta: latest score minus oldest scan in the 7-day window
        let trendDelta = 0;
        let previousGeoScore: number | null = null;
        if (scans.length >= 2) {
          const oldest = scans[0];
          const latest = scans[scans.length - 1];
          previousGeoScore = oldest.geoScore;
          trendDelta = latest.geoScore - oldest.geoScore;
        } else if (scans.length === 1) {
          // Only one scan in the window - no delta available
          previousGeoScore = scans[0].geoScore;
          trendDelta = 0;
        }

        return {
          domain: domainName,
          geoScore: record.latestGeoScore,
          previousGeoScore,
          trendDelta,
          citationRate: record.latestCitationRate,
          status: record.status as 'OPTIMAL' | 'MODERATE' | 'AT_RISK',
          zeroClickResilience: record.latestZeroClickResilience,
          infoGainScore: record.latestInfoGainScore,
          entityScore: record.latestEntityScore,
          vectorReadiness: record.latestVectorReadiness,
          agentHits7d: traffic?.hits ?? 0,
          topBots: traffic ? [...traffic.bots].slice(0, 4) : [],
          scanCount: record.scanCount,
          lastScannedAt: record.lastScanned.toISOString(),
          dataSource: 'live_crawl' as const,
        };
      });

      // Dispatch digest email
      const result = await sendWeeklyDigestEmail({
        to: user.email,
        userName: user.name,
        domains: digestItems,
        weeklyTip: tip,
        digestDate,
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
