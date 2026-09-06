import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';
import { validateAndSanitizeUrl } from '../../../../lib/security';
import { checkSiteLimit } from '../../../../lib/tierLimits';

export const dynamic = 'force-dynamic';

async function tagIsLive(url: string, hostname: string): Promise<boolean> {
  // 1. Check if we already received a recent heartbeat (from middleware or track.js)
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const hostnameNoWww = hostname.replace(/^www\./, '');
  const heartbeat = await prisma.tagHeartbeat.findFirst({
    where: {
      domain: { in: [hostname, hostnameNoWww] },
      lastSeen: { gte: new Date(Date.now() - SEVEN_DAYS) },
    },
  }).catch(() => null);

  if (heartbeat) return true;

  // 2. Probe the site with AI bot probe User-Agent
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'CiteRoute-Verify-Bot/1.0 (+https://www.citeroute.com/docs/install)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });
    clearTimeout(t);

    // If edge/server middleware returned a CiteRoute (or legacy OmniRoute) diagnostic header
    const hasMiddlewareHeader =
      res.headers.get('x-citeroute-tracked') === '1' ||
      res.headers.get('x-citeroute-middleware') === '1' ||
      res.headers.get('x-citeroute-edge') === '1' ||
      res.headers.get('x-omniroute-tracked') === '1' ||
      res.headers.get('x-omniroute-middleware') === '1' ||
      res.headers.get('x-omniroute-edge') === '1';

    if (hasMiddlewareHeader) return true;

    if (!res.ok) return false;

    const reader = res.body?.getReader();
    if (!reader) return false;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 128 * 1024) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value); total += value.byteLength;
    }
    reader.cancel();
    const html = new TextDecoder().decode(
      chunks.reduce((a, c) => { const m = new Uint8Array(a.length + c.length); m.set(a); m.set(c, a.length); return m; }, new Uint8Array(0))
    );
    return /<script[^>]+src\s*=\s*["'][^"']*\/api\/v1\/track\.js[^"']*["'][^>]*>/i.test(html);
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { domain?: string };
  const rawDomain = body.domain?.trim() ?? '';
  if (!rawDomain) return NextResponse.json({ error: 'domain is required' }, { status: 400 });

  const target = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;
  const validation = validateAndSanitizeUrl(target);
  if (!validation.isValid) return NextResponse.json({ error: validation.error ?? 'Invalid domain' }, { status: 400 });

  const hostname = new URL(validation.normalizedUrl).hostname;

  // Check user tier limits for verified sites
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tier: true },
  });
  const currentCount = await prisma.registeredSite.count({
    where: { userId: session.userId },
  });

  const limitCheck = checkSiteLimit(user?.tier, currentCount);
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: limitCheck.reason,
      code: 'TIER_LIMIT_EXCEEDED',
      limit: limitCheck.limit,
      current: limitCheck.current,
      upgradeTier: limitCheck.upgradeTier,
    }, { status: 403 });
  }

  const existing = await prisma.registeredSite.findUnique({
    where: { userId_domain: { userId: session.userId, domain: hostname } },
  });
  if (existing) return NextResponse.json({ error: 'Site already registered' }, { status: 409 });

  const live = await tagIsLive(validation.normalizedUrl, hostname);
  if (!live) {
    return NextResponse.json({
      error: 'CiteRoute tag or middleware not detected. Install and verify before adding your site.',
    }, { status: 422 });
  }

  const site = await prisma.registeredSite.create({
    data: { userId: session.userId, domain: hostname, verifiedAt: new Date() },
  });

  return NextResponse.json({ success: true, domain: site.domain, addedAt: site.addedAt });
}
