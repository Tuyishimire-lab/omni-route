import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const raw = await prisma.telemetryEvent.groupBy({
    by: ['domain'],
    _count: { id: true },
    _max: { timestamp: true },
    orderBy: { _max: { timestamp: 'desc' } },
    take: 200,
  });

  const allSites = await prisma.registeredSite.findMany({
    include: { user: { select: { email: true, name: true, id: true } } },
  });
  const siteMap = new Map(allSites.map(s => [s.domain, s]));

  const rows = raw.map(r => {
    const reg = siteMap.get(r.domain);
    return {
      domain: r.domain,
      totalEvents: r._count.id,
      lastEvent: r._max.timestamp?.toISOString() ?? null,
      owner: reg ? { email: reg.user.email, name: reg.user.name, id: reg.user.id } : null,
      registeredAt: reg?.addedAt.toISOString() ?? null,
    };
  });

  return NextResponse.json(rows);
}
