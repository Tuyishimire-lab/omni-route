import { NextRequest, NextResponse } from 'next/server';
import { getWatchlistDomains, addToWatchlist, removeFromWatchlist, getDomainHistory } from '../../../../lib/db';
import { getSession } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Watchlist resolution order:
 * 1. Logged-in user → server-side User.watchlist (persists across devices)
 * 2. Anonymous → Session.watchlist via sessionId param (current behavior)
 */

async function getUserWatchlist(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { watchlist: true } });
  try {
    return user?.watchlist ? JSON.parse(user.watchlist) : [];
  } catch {
    return [];
  }
}

async function setUserWatchlist(userId: string, domains: string[]) {
  await prisma.user.update({ where: { id: userId }, data: { watchlist: JSON.stringify(domains) } });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  if (!session && !sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  try {
    let domains;
    if (session) {
      // Logged-in: build domain cards from the user's server-side watchlist
      const watched = await getUserWatchlist(session.userId);
      const rows = watched.length
        ? await prisma.domain.findMany({ where: { domain: { in: watched } } })
        : [];
      domains = watched
        .map((d) => rows.find((r) => r.domain === d))
        .filter(Boolean)
        .map((r) => ({
          id: r!.id,
          domain: r!.domain,
          url: r!.url ?? `https://${r!.domain}`,
          lastGeoScore: r!.latestGeoScore,
          zeroClickResilience: r!.latestZeroClickResilience,
          citationProbability: r!.latestCitationRate,
          status: r!.status as 'OPTIMAL' | 'MODERATE' | 'AT_RISK',
          lastScannedAt: r!.lastScanned.toLocaleTimeString(),
          addedAt: r!.firstScanned.toISOString().split('T')[0],
          scanCount: r!.scanCount,
        }));
    } else {
      domains = await getWatchlistDomains(sessionId!);
    }

    // Attach score history to each domain
    const withHistory = await Promise.all(
      domains.map(async (d: Awaited<ReturnType<typeof getWatchlistDomains>>[number]) => ({
        ...d,
        scoreHistory: await getDomainHistory(d.domain, 14),
      }))
    );

    return NextResponse.json({ domains: withHistory, source: session ? 'user' : 'session' });
  } catch (e) {
    console.error('[watchlist GET]', e);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, domain } = await req.json();
    if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

    const session = await getSession();
    if (session) {
      const current = await getUserWatchlist(session.userId);
      if (!current.includes(domain)) {
        await setUserWatchlist(session.userId, [domain, ...current]);
      }
      return NextResponse.json({ watchlist: current.includes(domain) ? current : [domain, ...current], source: 'user' });
    }

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    const updated = await addToWatchlist(sessionId, domain);
    return NextResponse.json({ watchlist: updated, source: 'session' });
  } catch (e) {
    console.error('[watchlist POST]', e);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sessionId, domain } = await req.json();
    if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

    const session = await getSession();
    if (session) {
      const updated = (await getUserWatchlist(session.userId)).filter((d) => d !== domain);
      await setUserWatchlist(session.userId, updated);
      return NextResponse.json({ watchlist: updated, source: 'user' });
    }

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    const updated = await removeFromWatchlist(sessionId, domain);
    return NextResponse.json({ watchlist: updated, source: 'session' });
  } catch (e) {
    console.error('[watchlist DELETE]', e);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}
