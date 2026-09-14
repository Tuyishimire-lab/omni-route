import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { crawlAndAnalyzeUrl } from '../../../../lib/liveCrawler';
import { saveScanToDB } from '../../../../lib/db';
import { cleanupExpiredRateLimits } from '../../../../lib/rateLimiter';

export const dynamic = 'force-dynamic';

/**
 * Automated domain rescan cron.
 *
 * Runs daily (or more frequently via vercel.json) and processes domains in
 * two priority tiers:
 *
 *   1. NEVER-SCANNED: Domains seeded by the directory pipeline that have
 *      latestGeoScore = 0 and scanCount = 0. These are prioritized so
 *      that new domains get real scores as quickly as possible.
 *
 *   2. STALE: Domains that DO have a score but haven't been rescanned
 *      in the last 7 days. These keep existing scores fresh.
 *
 * Batch size is tuned to stay well within Vercel Pro function timeout
 * (300 s). Each Jina crawl takes ~2-12 s, so 20 domains is safe.
 */

const BATCH_SIZE = 20;
const STALE_THRESHOLD_DAYS = 7;

export async function GET(req: NextRequest) {
  try {
    // 1. Auth - mandatory in production
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    // 2. Housekeeping: purge expired rate-limit rows
    await cleanupExpiredRateLimits();

    // 3. Prioritize never-scanned domains (from directory seed)
    const neverScanned = await prisma.domain.findMany({
      where: { scanCount: 0 },
      orderBy: { lastScanned: 'asc' },
      take: BATCH_SIZE,
      select: { domain: true, url: true, latestGeoScore: true },
    });

    // 4. Fill remaining slots with stale domains
    const remainingSlots = BATCH_SIZE - neverScanned.length;
    let staleDomains: typeof neverScanned = [];

    if (remainingSlots > 0) {
      const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
      staleDomains = await prisma.domain.findMany({
        where: {
          scanCount: { gt: 0 },
          lastScanned: { lt: staleThreshold },
        },
        orderBy: { lastScanned: 'asc' },
        take: remainingSlots,
        select: { domain: true, url: true, latestGeoScore: true },
      });
    }

    const domainsToRefresh = [...neverScanned, ...staleDomains];

    if (domainsToRefresh.length === 0) {
      // Count total stats for the response
      const totalDomains = await prisma.domain.count();
      const scannedDomains = await prisma.domain.count({ where: { scanCount: { gt: 0 } } });

      return NextResponse.json({
        success: true,
        message: 'All domains are up to date - nothing to refresh',
        refreshedCount: 0,
        stats: { total: totalDomains, scanned: scannedDomains, coverage: `${Math.round((scannedDomains / Math.max(totalDomains, 1)) * 100)}%` },
      });
    }

    const results: Array<{ domain: string; previousScore: number; newScore: number; delta: number; source: string }> = [];
    const errors: Array<{ domain: string; error: string }> = [];

    // 5. Re-scan each domain with cache bypass
    for (const d of domainsToRefresh) {
      try {
        const report = await crawlAndAnalyzeUrl(d.url || d.domain, { bypassCache: true });
        await saveScanToDB(report, 'cron-rescan-worker', report.liveMetadata?.isLiveScanned ?? false);

        results.push({
          domain: d.domain,
          previousScore: d.latestGeoScore,
          newScore: report.overallGeoScore,
          delta: report.overallGeoScore - d.latestGeoScore,
          source: d.latestGeoScore === 0 ? 'new' : 'refresh',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron/rescan] Failed to re-scan ${d.domain}:`, msg);
        errors.push({ domain: d.domain, error: msg });
      }
    }

    // 6. Alert on significant score drops (webhook if configured)
    const alertWebhook = process.env.ALERT_WEBHOOK_URL;
    const drops = results.filter((r) => r.delta <= -10 && r.source === 'refresh');
    if (alertWebhook && drops.length > 0) {
      try {
        await fetch(alertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `CiteRoute GEO score drop${drops.length > 1 ? 's' : ''} detected`,
            drops: drops.map((d) => ({
              domain: d.domain,
              previous: d.previousScore,
              current: d.newScore,
              delta: d.delta,
            })),
            timestamp: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (e) {
        console.error('[cron/rescan] Alert webhook failed:', e);
      }
    }

    // 7. Stats for response
    const totalDomains = await prisma.domain.count();
    const scannedDomains = await prisma.domain.count({ where: { scanCount: { gt: 0 } } });
    const newlyScanned = results.filter((r) => r.source === 'new').length;
    const refreshed = results.filter((r) => r.source === 'refresh').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      batch: {
        total: domainsToRefresh.length,
        succeeded: results.length,
        failed: errors.length,
        newlyScanned,
        refreshed,
      },
      stats: {
        total: totalDomains,
        scanned: scannedDomains,
        remaining: totalDomains - scannedDomains,
        coverage: `${Math.round((scannedDomains / Math.max(totalDomains, 1)) * 100)}%`,
      },
      alertsSent: drops.length,
      domains: results,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/rescan] Cron worker error:', msg);
    return NextResponse.json({ error: 'Cron execution failed', details: msg }, { status: 500 });
  }
}
