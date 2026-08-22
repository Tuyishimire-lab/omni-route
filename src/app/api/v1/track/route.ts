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
    const rateCheck = await checkRateLimit(ip, 'track', 60_000, 120);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many tracking requests.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) } }
      );
    }

    let body: { path?: string; sessionId?: string; domain?: string } = {};
    try { body = await req.json(); } catch { body = {}; }

    const userAgent = req.headers.get('user-agent');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');

    // Prefer the explicit ?site= domain the client sends in the body
    // (set by the new one-tag snippet). Falls back to Host-header extraction
    // for backwards compatibility with the old data-omniroute-endpoint style.
    const rawBodyDomain = typeof body.domain === 'string' ? body.domain.trim() : null;
    // Basic validation - must look like a hostname, not a URL or IP injection
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
