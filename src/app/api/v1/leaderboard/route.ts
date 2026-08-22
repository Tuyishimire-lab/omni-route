import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getGlobalStats } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? 'All';

  try {
    const [entries, stats] = await Promise.all([
      getLeaderboard(category),
      getGlobalStats(),
    ]);

    return NextResponse.json(
      { entries, stats },
      {
        headers: {
          // Edge-cached for 5 min; leaderboard only changes via daily cron.
          // stale-while-revalidate lets Vercel serve the old response while
          // quietly refreshing in the background - zero added latency.
          'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (e) {
    console.error('[leaderboard GET]', e);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
