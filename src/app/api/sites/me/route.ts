import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sites = await prisma.registeredSite.findMany({
    where: { userId: session.userId },
    orderBy: { addedAt: 'desc' },
  });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await Promise.all(sites.map(async (site) => {
    const events = await prisma.telemetryEvent.findMany({
      where: { domain: site.domain, timestamp: { gte: since } },
      select: { type: true, timestamp: true },
    });

    const lastEvent = events.length > 0
      ? new Date(Math.max(...events.map(e => new Date(e.timestamp).getTime()))).toISOString()
      : null;

    return {
      domain: site.domain,
      addedAt: site.addedAt.toISOString(),
      verifiedAt: site.verifiedAt.toISOString(),
      aiEvents:  events.length,
      crawlers:  events.filter(e => e.type === 'GEO_INDEX_PING').length,
      agentTx:   events.filter(e => e.type === 'AGENT_TX').length,
      citations: events.filter(e => e.type === 'AI_CITATION').length,
      lastEvent,
    };
  }));

  return NextResponse.json(result);
}
