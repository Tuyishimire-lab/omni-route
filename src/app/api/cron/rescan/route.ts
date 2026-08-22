import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { crawlAndAnalyzeUrl } from '../../../../lib/liveCrawler';
import { saveScanToDB } from '../../../../lib/db';
import { cleanupExpiredRateLimits } from '../../../../lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Vercel Cron Secret - mandatory in production so the endpoint
    //    can't be abused as a free scan farm.
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    // 2. Housekeeping: purge expired rate-limit rows (table would grow unbounded)
    await cleanupExpiredRateLimits();

    // 2. Fetch the oldest scanned domains to refresh (e.g. top 15 per batch)
    const domainsToRefresh = await prisma.domain.findMany({
      orderBy: { lastScanned: 'asc' },
      take: 15,
      select: { domain: true, url: true, latestGeoScore: true }
    });

    if (domainsToRefresh.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No domains registered in database to refresh',
        refreshedCount: 0
      });
    }

    const results: Array<{ domain: string; previousScore: number; newScore: number; delta: number }> = [];

    // 3. Re-scan each domain with cache bypass
    for (const d of domainsToRefresh) {
      try {
        const report = await crawlAndAnalyzeUrl(d.url || d.domain, { bypassCache: true });
        await saveScanToDB(report, 'cron-automated-worker', report.liveMetadata?.isLiveScanned ?? false);

        results.push({
          domain: d.domain,
          previousScore: d.latestGeoScore,
          newScore: report.overallGeoScore,
          delta: report.overallGeoScore - d.latestGeoScore
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron] Failed to re-scan domain ${d.domain}:`, msg);
      }
    }

    // 4. Alert on significant score drops (webhook if configured)
    const alertWebhook = process.env.ALERT_WEBHOOK_URL;
    const drops = results.filter((r) => r.delta <= -10);
    if (alertWebhook && drops.length > 0) {
      try {
        await fetch(alertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ OmniRoute GEO score drop${drops.length > 1 ? 's' : ''} detected`,
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      refreshedCount: results.length,
      alertsSent: drops.length,
      domains: results
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/rescan] Cron worker error:', msg);
    return NextResponse.json({ error: 'Cron execution failed', details: msg }, { status: 500 });
  }
}
