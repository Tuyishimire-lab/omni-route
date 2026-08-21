import { NextRequest, NextResponse } from 'next/server';
import { getDomainHistory } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/v1/leaderboard/history?domains=stripe.com,vercel.com&days=14
export async function GET(req: NextRequest) {
  try {
    const domainsParam = req.nextUrl.searchParams.get('domains') || '';
    const days = parseInt(req.nextUrl.searchParams.get('days') || '14', 10);

    const domains = domainsParam
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20); // Max 20 domains per request

    if (domains.length === 0) {
      return NextResponse.json(
        { error: 'Provide at least one domain via ?domains=example.com' },
        { status: 400 }
      );
    }

    const historyMap: Record<string, { date: string; score: number }[]> = {};

    await Promise.all(
      domains.map(async (domain) => {
        historyMap[domain] = await getDomainHistory(domain, Math.min(days, 90));
      })
    );

    return NextResponse.json({
      success: true,
      days,
      history: historyMap,
    });
  } catch (err) {
    console.error('[leaderboard/history] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
