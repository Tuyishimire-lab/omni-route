import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/v1/track.js
 * Serves the tracking snippet with cache + CORS headers so any customer
 * site can embed it cross-origin.
 */
export async function GET() {
  try {
    const snippet = readFileSync(join(process.cwd(), 'public', 'track.js'), 'utf-8');
    return new NextResponse(snippet, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        // 5-minute CDN cache + 60s stale-while-revalidate keeps latency low
        // while ensuring bug fixes reach customer sites quickly.
        // Browser cache stays at 5 minutes too — short enough to be practical.
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse('// OmniRoute tracking snippet unavailable', {
      status: 404,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }
}
