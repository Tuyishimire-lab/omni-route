import { NextRequest, NextResponse } from 'next/server';
import { classifyRequest, extractDomainFromHost } from '../../../../lib/agentTraffic';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/track
 *
 * Records a REAL traffic event, classified server-side from request headers.
 * Called by the OmniRoute tracking snippet installed on customer sites
 * (or by their edge worker / middleware proxying request headers).
 *
 * Body: { path?: string, sessionId?: string }
 * Headers used: user-agent, referer, host
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Skip rate-limiting for internal proxy calls — they come from our own
    // edge function, not an external client, so they can't be abused.
    const isInternalProxyCall = req.headers.get('x-omniroute-proxy') === '1';
    if (!isInternalProxyCall) {
      const rateCheck = await checkRateLimit(ip, 'track', 60_000, 120);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: 'Too many tracking requests.' },
          { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) } }
        );
      }
    }

    let body: { path?: string; sessionId?: string; domain?: string; pageReferrer?: string | null } = {};
    try { body = await req.json(); } catch { body = {}; }

    // When the call originates from our own proxy.ts (server-side capture),
    // the real visitor UA/referer are forwarded in custom headers because
    // the internal fetch() UA would be the edge runtime, not the actual bot.
    const userAgent = req.headers.get('x-forwarded-user-agent') ?? req.headers.get('user-agent');
    // Referrer priority:
    //  1. pageReferrer from JS payload — the original AI engine URL captured by
    //     document.referrer in the browser (most accurate for human click-throughs).
    //  2. x-forwarded-referer — set by proxy.ts for server-side bot captures.
    //  3. Raw HTTP Referer — fallback (will be the customer's own page URL for
    //     cross-origin beacon requests, so least useful for classification).
    const referer =
      (typeof body.pageReferrer === 'string' && body.pageReferrer.trim() ? body.pageReferrer.trim() : null) ??
      req.headers.get('x-forwarded-referer') ??
      req.headers.get('referer');
    const host = req.headers.get('host');

    // Prefer the explicit ?site= domain the client sends in the body
    // (set by the one-tag snippet). Falls back to Host-header extraction
    // for backwards compatibility.
    const rawBodyDomain = typeof body.domain === 'string' ? body.domain.trim() : null;
    const isValidHostname = rawBodyDomain
      ? /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(rawBodyDomain)
      : false;
    const domain = (isValidHostname ? rawBodyDomain : null) ?? extractDomainFromHost(host);
    if (!domain) {
      return NextResponse.json({ error: 'Unable to determine domain from request' }, { status: 400 });
    }

    const classified = classifyRequest(userAgent, referer);

    // Always record a heartbeat so the verifier knows the tag is live on this domain.
    // Fire-and-forget - a heartbeat failure must never affect the tracking response.
    prisma.tagHeartbeat.upsert({
      where:  { domain },
      update: { lastSeen: new Date() },
      create: { domain, lastSeen: new Date(), firstSeen: new Date() },
    }).catch((e: unknown) => {
      console.warn('[track] heartbeat upsert failed:', e instanceof Error ? e.message : e);
    });

    // Only persist non-human traffic - human analytics is not our product.
    if (classified.classification === 'HUMAN') {
      return NextResponse.json({ success: true, recorded: false, classification: classified.classification });
    }

    const destinationUrl = body.path
      ? `https://${domain}${body.path.startsWith('/') ? body.path : '/' + body.path}`
      : `https://${domain}`;

    // Ingestion endpoint: a dropped event is lost forever. Retry once on
    // transient DB failures before giving up.
    const record = () =>
      prisma.telemetryEvent.create({
        data: {
          type: classified.eventType,
          source: classified.agentName ?? 'Unknown Agent',
          domain,
          destinationUrl,
          intent: `${classified.classification}${classified.referredBy ? ` via ${classified.referredBy}` : ''}`,
          geoScoreAtTime: 0, // enriched later by the rescan cron
          settlementValue: null,
        },
      });

    try {
      await record();
    } catch (firstError) {
      console.error('[track] Write failed, retrying:', firstError instanceof Error ? firstError.message : firstError);
      await new Promise((r) => setTimeout(r, 150));
      await record();
    }

    return NextResponse.json({ success: true, recorded: true, classification: classified.classification });
  } catch (error: unknown) {
    // Log everything - ingestion failures must be diagnosable
    console.error('[track] Error:', error);
    return NextResponse.json({ error: 'Failed to record traffic event' }, { status: 500 });
  }
}
