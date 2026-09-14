import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ValidatedKey } from '../../../../lib/apiAuth';
import { validateAndSanitizeUrl } from '../../../../lib/security';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/ai-traffic?domain=stripe.com&days=30
 * ────────────────────────────────────────────────
 * Returns AI crawler visit volume, bot breakdown, and telemetry history for a domain.
 * Pricing: $0.05/call (5 LemonSqueezy credits) for usage beyond plan limits.
 */
async function handleAiTraffic(req: NextRequest, { apiKey }: { apiKey?: ValidatedKey }) {
  const rawDomain = req.nextUrl.searchParams.get('domain');
  const daysParam = parseInt(req.nextUrl.searchParams.get('days') || '30', 10);
  const days = isNaN(daysParam) ? 30 : Math.min(Math.max(1, daysParam), 90);

  if (!rawDomain || typeof rawDomain !== 'string' || rawDomain.trim().length === 0) {
    return NextResponse.json({ error: 'domain query parameter is required' }, { status: 400 });
  }

  const rawUrl = rawDomain.startsWith('http') ? rawDomain.trim() : `https://${rawDomain.trim()}`;
  const validation = validateAndSanitizeUrl(rawUrl);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error || 'Invalid domain' }, { status: 400 });
  }

  const domain = validation.domain;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch telemetry events for this domain
  const events = await prisma.telemetryEvent.findMany({
    where: {
      domain: { contains: domain },
      timestamp: { gte: cutoff },
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  // Calculate bot distributions & volume metrics
  const botDistribution: Record<string, number> = {};
  const eventTypes: Record<string, number> = {};
  let totalSettlementValue = 0;

  for (const ev of events) {
    botDistribution[ev.source] = (botDistribution[ev.source] || 0) + 1;
    eventTypes[ev.type] = (eventTypes[ev.type] || 0) + 1;
    if (ev.settlementValue) {
      totalSettlementValue += ev.settlementValue;
    }
  }

  // Check tag verification status on this domain
  const tagHeartbeat = await prisma.tagHeartbeat.findFirst({
    where: {
      OR: [{ domain }, { domain: `www.${domain}` }],
    },
  });

  return NextResponse.json({
    success: true,
    domain,
    windowDays: days,
    isTagInstalled: Boolean(tagHeartbeat),
    lastTagSeen: tagHeartbeat?.lastSeen || null,
    metrics: {
      totalCrawlerHits: events.length,
      estimatedMonthlyVisits: Math.round((events.length / Math.max(1, days)) * 30),
      botBreakdown: Object.entries(botDistribution).map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / Math.max(1, events.length)) * 100),
      })),
      eventTypeBreakdown: eventTypes,
      totalSettlementValue: Number(totalSettlementValue.toFixed(2)),
    },
    recentEvents: events.slice(0, 50).map((ev) => ({
      id: ev.id,
      timestamp: ev.timestamp.toISOString(),
      source: ev.source,
      type: ev.type,
      intent: ev.intent,
      destinationUrl: ev.destinationUrl,
      geoScoreAtTime: ev.geoScoreAtTime,
    })),
  });
}

export const GET = withAuth(handleAiTraffic, { required: true });
