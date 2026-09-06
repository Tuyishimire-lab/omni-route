import { NextRequest, NextResponse } from 'next/server';
import { submitToIndexNow, CORE_CITEROUTE_URLS, DEFAULT_INDEXNOW_KEY } from '../../../lib/indexnow';

export const dynamic = 'force-dynamic';

/**
 * POST /api/indexnow
 * Submits URLs to the IndexNow protocol for instant indexing on Bing, Yandex, etc.
 *
 * Body (optional): { urls?: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    let body: { urls?: string[] } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const urls = Array.isArray(body.urls) && body.urls.length > 0
      ? body.urls
      : CORE_CITEROUTE_URLS;

    const result = await submitToIndexNow(urls);

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/indexnow
 * Diagnostic endpoint showing IndexNow configuration and verification URL.
 */
export async function GET() {
  const key = process.env.INDEXNOW_API_KEY || DEFAULT_INDEXNOW_KEY;
  return NextResponse.json({
    status: 'ready',
    host: 'www.citeroute.com',
    key,
    keyLocation: `https://www.citeroute.com/${key}.txt`,
    endpoints: ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow'],
    monitoredUrls: CORE_CITEROUTE_URLS,
  });
}
