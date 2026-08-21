import { NextRequest, NextResponse } from 'next/server';
import { crawlAndAnalyzeUrl } from '../../../../lib/liveCrawler';
import { saveScanToDB } from '../../../../lib/db';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'scan', 60_000, 30);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many scan requests. Please slow down.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) },
        }
      );
    }

    let body: { url?: string; sessionId?: string; bypassCache?: boolean } = {};
    try { body = await req.json(); } catch { body = {}; }

    // P0-4: Require an explicit URL — no silent fallback that wastes compute
    const url = body?.url;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const sessionId = body?.sessionId;
    const bypassCache = Boolean(body?.bypassCache);

    const report = await crawlAndAnalyzeUrl(url, { bypassCache });

    // Fire-and-forget DB persist — don't block the response
    saveScanToDB(report, sessionId, report.liveMetadata?.isLiveScanned ?? false)
      .catch((e) => console.error('[scan] DB persist failed:', e));

    return NextResponse.json(
      { success: true, data: report, cached: !bypassCache },
      { status: 200, headers: { 'X-RateLimit-Remaining': String(rateCheck.remaining) } }
    );
  } catch (error: unknown) {
    // P0-4: Log full error server-side but never expose internal details to callers
    console.error('[scan POST] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to complete GEO audit scan. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'scan', 60_000, 30);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many scan requests. Please slow down.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) },
        }
      );
    }

    const targetUrl = req.nextUrl.searchParams.get('url');
    if (!targetUrl || targetUrl.trim().length === 0) {
      return NextResponse.json({ error: 'url query parameter is required' }, { status: 400 });
    }

    const sessionId = req.nextUrl.searchParams.get('sessionId') ?? undefined;
    const bypassCache =
      req.nextUrl.searchParams.get('refresh') === 'true' ||
      req.nextUrl.searchParams.get('force') === 'true';

    const report = await crawlAndAnalyzeUrl(targetUrl, { bypassCache });

    saveScanToDB(report, sessionId, report.liveMetadata?.isLiveScanned ?? false)
      .catch((e) => console.error('[scan] DB persist failed:', e));

    return NextResponse.json(
      { success: true, data: report, cached: !bypassCache },
      { status: 200, headers: { 'X-RateLimit-Remaining': String(rateCheck.remaining) } }
    );
  } catch (error: unknown) {
    console.error('[scan GET] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to complete GEO audit scan. Please try again.' },
      { status: 500 }
    );
  }
}
