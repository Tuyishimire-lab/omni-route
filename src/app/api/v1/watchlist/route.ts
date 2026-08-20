import { NextRequest, NextResponse } from 'next/server';
import { getWatchlistDomains, addToWatchlist, removeFromWatchlist, getDomainHistory } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  try {
    const domains = await getWatchlistDomains(sessionId);

    // Attach score history to each domain
    const withHistory = await Promise.all(
      domains.map(async (d: Awaited<ReturnType<typeof getWatchlistDomains>>[number]) => ({
        ...d,
        scoreHistory: await getDomainHistory(d.domain, 14),
      }))
    );

    return NextResponse.json({ domains: withHistory });
  } catch (e) {
    console.error('[watchlist GET]', e);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, domain } = await req.json();
    if (!sessionId || !domain) return NextResponse.json({ error: 'sessionId and domain required' }, { status: 400 });

    const updated = await addToWatchlist(sessionId, domain);
    return NextResponse.json({ watchlist: updated });
  } catch (e) {
    console.error('[watchlist POST]', e);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sessionId, domain } = await req.json();
    if (!sessionId || !domain) return NextResponse.json({ error: 'sessionId and domain required' }, { status: 400 });

    const updated = await removeFromWatchlist(sessionId, domain);
    return NextResponse.json({ watchlist: updated });
  } catch (e) {
    console.error('[watchlist DELETE]', e);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}
