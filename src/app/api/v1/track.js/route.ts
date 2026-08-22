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
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
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
