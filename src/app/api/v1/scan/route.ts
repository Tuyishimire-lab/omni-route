import { NextRequest, NextResponse } from 'next/server';
import { crawlAndAnalyzeUrl } from '../../../../lib/liveCrawler';
import { saveScanToDB } from '../../../../lib/db';
import { publicApiRateLimiter } from '../../../../lib/security';

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIdentifier(req);
    const rateCheck = publicApiRateLimiter.check(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many scan requests. Please slow down.', retryAfterMs: rateCheck.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetMs / 1000)) } }
      );
    }

    let body: { url?: string; sessionId?: string; bypassCache?: boolean } = {};
    try { body = await req.json(); } catch { body = {}; }

    const url = body?.url || 'stripe.com';
    const sessionId = body?.sessionId;
    const bypassCache = Boolean(body?.bypassCache);

    const report = await crawlAndAnalyzeUrl(url, { bypassCache });

    // Persist to DB (fire-and-forget — don't block the response)
    saveScanToDB(report, sessionId, report.liveMetadata?.isLiveScanned ?? false)
      .catch((e) => console.error('[scan] DB persist failed:', e));

    return NextResponse.json(
      { success: true, data: report, cached: !bypassCache },
      { status: 200, headers: { 'X-RateLimit-Remaining': String(rateCheck.remaining) } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error in /api/v1/scan POST:', msg);
    return NextResponse.json(
      { error: 'Failed to complete GEO audit scan', details: msg },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIdentifier(req);
    const rateCheck = publicApiRateLimiter.check(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many scan requests. Please slow down.', retryAfterMs: rateCheck.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetMs / 1000)) } }
      );
    }

    const targetUrl = req.nextUrl.searchParams.get('url') || 'stripe.com';
    const sessionId = req.nextUrl.searchParams.get('sessionId') ?? undefined;
    const bypassCache = req.nextUrl.searchParams.get('refresh') === 'true' || req.nextUrl.searchParams.get('force') === 'true';

    const report = await crawlAndAnalyzeUrl(targetUrl, { bypassCache });

    saveScanToDB(report, sessionId, report.liveMetadata?.isLiveScanned ?? false)
      .catch((e) => console.error('[scan] DB persist failed:', e));

    return NextResponse.json(
      { success: true, data: report, cached: !bypassCache },
      { status: 200, headers: { 'X-RateLimit-Remaining': String(rateCheck.remaining) } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error in /api/v1/scan GET:', msg);
    return NextResponse.json({ error: 'Failed to complete GEO audit scan', details: msg }, { status: 400 });
  }
}
