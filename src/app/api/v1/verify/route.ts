import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '../../../../lib/security';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export interface VerifyResult {
  found: boolean;
  method: 'heartbeat' | 'query-param' | 'data-attribute' | 'bare' | null;
  siteDomain: string | null;
  domainMatch: boolean;
  tagUrl: string | null;
  checkedUrl: string;
  heartbeatAge?: string | null; // ISO timestamp of last heartbeat
  error?: string;
}

/**
 * GET /api/v1/verify?domain=yourdomain.com
 *
 * Fetches the customer homepage server-side and checks whether the OmniRoute
 * tracking tag is present. Returns diagnostics for the verify widget.
 */
export async function GET(req: NextRequest) {
  const rawDomain = req.nextUrl.searchParams.get('domain')?.trim();
  if (!rawDomain) {
    return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
  }

  const target = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;
  const validation = validateAndSanitizeUrl(target);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error ?? 'Invalid domain' }, { status: 400 });
  }

  const checkedUrl = validation.normalizedUrl;
  // Extract the raw hostname — do NOT use validation.domain which strips www.
  const checkedHostname = new URL(checkedUrl).hostname;
  const checkedHostnameNoWww = checkedHostname.replace(/^www\./, '');

  // ── Heartbeat check (framework-agnostic) ──────────────────────────────
  // When track.js loads on any site it upserts a TagHeartbeat row.
  // If we have a recent heartbeat (≤ 7 days) we trust it — no HTML scrape needed.
  // This works for Next.js Script component, React SPAs, GTM, etc.
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const heartbeat = await prisma.tagHeartbeat.findFirst({
    where: {
      domain: { in: [checkedHostname, checkedHostnameNoWww] },
      lastSeen: { gte: new Date(Date.now() - SEVEN_DAYS) },
    },
    orderBy: { lastSeen: 'desc' },
  }).catch(() => null);

  if (heartbeat) {
    return NextResponse.json<VerifyResult>({
      found: true,
      method: 'heartbeat',
      siteDomain: heartbeat.domain,
      domainMatch: true,
      tagUrl: null,
      checkedUrl,
      heartbeatAge: heartbeat.lastSeen.toISOString(),
    });
  }

  // ── Fallback: HTML scrape ─────────────────────────────────────────────
  let html = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(checkedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OmniRoute-Verify/1.0 (+https://omni-route-rho.vercel.app/docs/install)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json<VerifyResult>({
        found: false, method: null, siteDomain: null, domainMatch: false,
        tagUrl: null, checkedUrl,
        error: `Site returned HTTP ${res.status}`,
      });
    }

    // Read first 128 KB — enough to find any script tag in <head> or early <body>
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (totalBytes < 128 * 1024) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.byteLength;
    }
    reader.cancel();
    html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length);
        merged.set(acc); merged.set(c, acc.length);
        return merged;
      }, new Uint8Array(0))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json<VerifyResult>({
      found: false, method: null, siteDomain: null, domainMatch: false,
      tagUrl: null, checkedUrl,
      error: msg.includes('abort') ? 'Request timed out (10 s)' : `Fetch failed: ${msg}`,
    });
  }

  // Parse <script src="...track.js..."> tags
  const scriptTagRe = /<script[^>]+src\s*=\s*["']([^"']*track\.js[^"']*)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  let tagUrl: string | null = null;
  let method: VerifyResult['method'] = null;
  let siteDomain: string | null = null;

  while ((match = scriptTagRe.exec(html)) !== null) {
    const src = match[1];
    if (!src.includes('/api/v1/track.js')) continue;

    tagUrl = src;
    try {
      const u = new URL(src.startsWith('//') ? `https:${src}` : src);
      const siteParam = u.searchParams.get('site');
      if (siteParam) {
        method = 'query-param';
        siteDomain = siteParam;
      } else {
        method = match[0].includes('data-omniroute-endpoint') ? 'data-attribute' : 'bare';
      }
    } catch {
      method = 'bare';
    }
    break;
  }

  const found = tagUrl !== null;
  // Normalize site domain — strip trailing slash and compare against both
  // the exact hostname (www.uselocalpdf.com) and the www-stripped form (uselocalpdf.com)
  // so either value in ?site= is accepted as a valid match.
  const normSite = siteDomain?.replace(/\/$/, '') ?? null;
  const domainMatch = method === 'query-param'
    ? normSite === checkedHostname || normSite === checkedHostnameNoWww
    : found;

  return NextResponse.json<VerifyResult>({ found, method, siteDomain, domainMatch, tagUrl, checkedUrl });
}
