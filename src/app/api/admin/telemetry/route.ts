import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get('domain')?.trim();

  if (!rawDomain) {
    return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 });
  }

  const cleanDomain = rawDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const source = searchParams.get('source')?.trim() || '';
  const type = searchParams.get('type')?.trim() || '';
  const format = searchParams.get('format');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const skip = (page - 1) * limit;

  const where: Prisma.TelemetryEventWhereInput = {
    domain: cleanDomain,
  };

  if (source) {
    where.source = { contains: source };
  }

  if (type) {
    where.type = type;
  }

  // Handle CSV export for the selected domain
  if (format === 'csv') {
    const allEvents = await prisma.telemetryEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 2000,
    });

    const headers = [
      'Event ID',
      'Domain',
      'Timestamp (UTC)',
      'AI Bot / Source',
      'Event Type',
      'Intent / Query',
      'Destination URL',
      'GEO Score at Time',
      'Settlement Value ($)',
    ];

    const rows = allEvents.map((ev) => [
      ev.id,
      ev.domain,
      ev.timestamp.toISOString(),
      ev.source,
      ev.type,
      ev.intent,
      ev.destinationUrl,
      ev.geoScoreAtTime,
      ev.settlementValue ?? 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="telemetry-${cleanDomain}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Paginated telemetry events + domain aggregations
  const [total, events, botGroups, firstEvent, lastEvent] = await Promise.all([
    prisma.telemetryEvent.count({ where }),
    prisma.telemetryEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.telemetryEvent.groupBy({
      by: ['source'],
      where: { domain: cleanDomain },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.telemetryEvent.findFirst({
      where: { domain: cleanDomain },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    }),
    prisma.telemetryEvent.findFirst({
      where: { domain: cleanDomain },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
  ]);

  const botBreakdown = botGroups.map((b) => ({
    source: b.source,
    count: b._count.id,
    percentage: total > 0 ? Math.round((b._count.id / total) * 100) : 0,
  }));

  return NextResponse.json({
    domain: cleanDomain,
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      totalEvents: total,
      uniqueBotsCount: botGroups.length,
      topBot: botGroups[0]?.source || 'None',
      firstSeen: firstEvent?.timestamp.toISOString() || null,
      lastSeen: lastEvent?.timestamp.toISOString() || null,
      botBreakdown,
    },
  });
}
