import { NextRequest, NextResponse, after } from 'next/server';
import { crawlAndAnalyzeUrl } from '../../../../lib/liveCrawler';
import { saveScanToDB } from '../../../../lib/db';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';
import { getSession } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { cookies } from 'next/headers';

type SessionPayload = Awaited<ReturnType<typeof getSession>>;

const VERIFIED_EMAIL_COOKIE = 'citeroute_verified_email';

async function verifyScanAllowance(ip: string, session: SessionPayload) {
  let tier = 'free';
  let trackingId = `ip:${ip}`;

  if (session) {
    if (session.role === 'admin') {
      return { allowed: true, tier: 'admin' };
    }
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tier: true },
    });
    tier = user?.tier ?? 'free';
    trackingId = `user:${session.userId}`;
  } else {
    // Anonymous user - require verified email
    const cookieStore = await cookies();
    const verifiedEmail = cookieStore.get(VERIFIED_EMAIL_COOKIE)?.value;

    if (!verifiedEmail) {
      return {
        allowed: false,
        tier: 'free',
        error: 'Please verify your email to run a free GEO scan.',
        code: 'EMAIL_REQUIRED',
      };
    }

    // Track by verified email instead of IP
    trackingId = `email:${verifiedEmail}`;
  }

  // Pro, Agency, Enterprise get unlimited scans
  if (tier !== 'free') {
    return { allowed: true, tier };
  }

  // Free / anonymous: 10 scans per 30-day window
  const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const monthlyCheck = await checkRateLimit(trackingId, 'scan:monthly', MONTH_MS, 10);
  if (!monthlyCheck.allowed) {
    return {
      allowed: false,
      tier,
      error: 'You have reached your monthly limit of 10 free GEO scans. Upgrade to Pro for unlimited scans.',
      code: 'TIER_SCAN_LIMIT',
      upgradeTier: 'pro',
    };
  }

  return { allowed: true, tier };
}

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

    // Resolve session once - reused for quota check and bypassCache gating
    const session = await getSession();

    const quotaCheck = await verifyScanAllowance(ip, session);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: quotaCheck.error, code: quotaCheck.code, upgradeTier: quotaCheck.upgradeTier },
        { status: 429 }
      );
    }

    let body: { url?: string; sessionId?: string; bypassCache?: boolean } = {};
    try { body = await req.json(); } catch { body = {}; }

    // P0-4: Require an explicit URL - no silent fallback that wastes compute
    const url = body?.url;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const sessionId = body?.sessionId;

    // bypassCache is a Pro+ feature - free and anonymous users cannot force
    // a live re-crawl on every request (it would exhaust Jina Reader quota).
    const isPrivileged = session?.role === 'admin' || (quotaCheck.tier !== 'free');
    const bypassCache = isPrivileged && Boolean(body?.bypassCache);
    if (!isPrivileged && body?.bypassCache) {
      console.info('[scan] bypassCache requested by free/anonymous user - downgraded to cached response');
    }

    const report = await crawlAndAnalyzeUrl(url, { bypassCache });

    // Persist after the response is sent - survives function completion on Vercel
    after(() =>
      saveScanToDB(report, sessionId, report.liveMetadata?.isLiveScanned ?? false)
        .catch((e) => console.error('[scan] DB persist failed:', e))
    );

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

    // Resolve session once - reused for quota check and bypassCache gating
    const session = await getSession();

    const quotaCheck = await verifyScanAllowance(ip, session);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: quotaCheck.error, code: quotaCheck.code, upgradeTier: quotaCheck.upgradeTier },
        { status: 429 }
      );
    }

    const targetUrl = req.nextUrl.searchParams.get('url');
    if (!targetUrl || targetUrl.trim().length === 0) {
      return NextResponse.json({ error: 'url query parameter is required' }, { status: 400 });
    }

    const sessionId = req.nextUrl.searchParams.get('sessionId') ?? undefined;

    // bypassCache is a Pro+ feature (same rule as POST)
    const isPrivileged = session?.role === 'admin' || (quotaCheck.tier !== 'free');
    const bypassCache = isPrivileged && (
      req.nextUrl.searchParams.get('refresh') === 'true' ||
      req.nextUrl.searchParams.get('force') === 'true'
    );


    const report = await crawlAndAnalyzeUrl(targetUrl, { bypassCache });

    after(() =>
      saveScanToDB(report, sessionId, report.liveMetadata?.isLiveScanned ?? false)
        .catch((e) => console.error('[scan] DB persist failed:', e))
    );

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
