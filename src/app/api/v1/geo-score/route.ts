import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ValidatedKey } from '../../../../lib/apiAuth';
import { validateAndSanitizeUrl } from '../../../../lib/security';
import { prisma } from '../../../../lib/prisma';
import { crawlAndAnalyzeUrl } from '../../../../lib/liveCrawler';
import { saveScanToDB } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/v1/geo-score
 * ─────────────────────────
 * Programmatic GEO score and audit API for any domain.
 * Pricing: $0.02/call (2 LemonSqueezy credits) for usage beyond plan limits.
 *
 * Query Params (GET):
 *   - domain: Hostname or URL (e.g. stripe.com)
 *   - bypassCache: boolean (optional, defaults to false)
 *
 * JSON Body (POST):
 *   - domain or url: string (e.g. https://stripe.com)
 *   - bypassCache: boolean (optional)
 */
async function handleGeoScore(req: NextRequest, { apiKey }: { apiKey?: ValidatedKey }) {
  let targetInput: string | null = null;
  let bypassCache = false;

  if (req.method === 'GET') {
    targetInput = req.nextUrl.searchParams.get('domain') || req.nextUrl.searchParams.get('url');
    bypassCache = req.nextUrl.searchParams.get('bypassCache') === 'true';
  } else {
    try {
      const body = await req.json();
      targetInput = body.domain || body.url || null;
      bypassCache = Boolean(body.bypassCache);
    } catch {
      targetInput = null;
    }
  }

  if (!targetInput || typeof targetInput !== 'string' || targetInput.trim().length === 0) {
    return NextResponse.json(
      { error: 'domain or url parameter is required' },
      { status: 400 }
    );
  }

  const rawUrl = targetInput.startsWith('http') ? targetInput.trim() : `https://${targetInput.trim()}`;
  const validation = validateAndSanitizeUrl(rawUrl);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error || 'Invalid domain or URL' }, { status: 400 });
  }

  const domain = validation.domain;

  // If not bypassing cache, check for existing domain scores in DB
  if (!bypassCache) {
    const existing = await prisma.domain.findUnique({
      where: { domain },
      include: {
        scanEvents: {
          orderBy: { scannedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      let rawReport = null;
      if (existing.scanEvents[0]?.rawReport) {
        try {
          rawReport = JSON.parse(existing.scanEvents[0].rawReport);
        } catch {
          rawReport = null;
        }
      }

      return NextResponse.json({
        success: true,
        cached: true,
        data: {
          domain: existing.domain,
          overallGeoScore: existing.latestGeoScore,
          citationRate: existing.latestCitationRate,
          zeroClickResilience: existing.latestZeroClickResilience,
          infoGainScore: existing.latestInfoGainScore,
          entityScore: existing.latestEntityScore,
          vectorReadiness: existing.latestVectorReadiness,
          status: existing.status,
          trend: existing.trend,
          trendDelta: existing.trendDelta,
          lastScanned: existing.lastScanned,
          engineBreakdown: rawReport?.engineBreakdown || [
            { engine: 'Perplexity', citationProbability: existing.latestCitationRate, status: existing.status },
            { engine: 'ChatGPT Search', citationProbability: Math.max(0, existing.latestCitationRate - 5), status: existing.status },
            { engine: 'Claude', citationProbability: Math.min(100, existing.latestCitationRate + 2), status: existing.status },
            { engine: 'Google Gemini', citationProbability: existing.latestCitationRate, status: existing.status },
          ],
          recommendations: rawReport?.recommendations || [],
        },
      });
    }
  }

  // Live crawl & analyze
  const report = await crawlAndAnalyzeUrl(validation.normalizedUrl, { bypassCache: true });

  // Save to DB asynchronously
  saveScanToDB(report, undefined, true).catch((e) => console.error('[geo-score] DB persist error:', e));

  return NextResponse.json({
    success: true,
    cached: false,
    data: report,
  });
}

export const GET = withAuth(handleGeoScore, { required: true });
export const POST = withAuth(handleGeoScore, { required: true });
