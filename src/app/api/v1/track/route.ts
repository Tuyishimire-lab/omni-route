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

    let body: { path?: string; sessionId?: string } = {};
    try { body = await req.json(); } catch { body = {}; }

    const userAgent = req.headers.get('user-agent');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');

    const domain = extractDomainFromHost(host);
    if (!domain) {
      return NextResponse.json({ error: 'Unable to determine domain from request' }, { status: 400 });
    }

    const classified = classifyRequest(userAgent, referer);

    // Only persist non-human traffic — human analytics is not our product.
    if (classified.classification === 'HUMAN') {
      return NextResponse.json({ success: true, recorded: false, classification: classified.classification });
    }

    const destinationUrl = body.path
      ? `https://${domain}${body.path.startsWith('/') ? body.path : '/' + body.path}`
      : `https://${domain}`;

    await prisma.telemetryEvent.create({
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

    return NextResponse.json({ success: true, recorded: true, classification: classified.classification });
  } catch (error: unknown) {
    console.error('[track] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to record traffic event' }, { status: 500 });
  }
}
