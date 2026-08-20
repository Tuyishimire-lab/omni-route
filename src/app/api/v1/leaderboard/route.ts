import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getGlobalStats } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? 'All';

  try {
    const [entries, stats] = await Promise.all([
      getLeaderboard(category),
      getGlobalStats(),
    ]);

    return NextResponse.json({ entries, stats });
  } catch (e) {
    console.error('[leaderboard GET]', e);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
