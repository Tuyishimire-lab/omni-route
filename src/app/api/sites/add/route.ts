import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';
import { validateAndSanitizeUrl } from '../../../../lib/security';

export const dynamic = 'force-dynamic';

async function tagIsLive(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'OmniRoute-Verify/1.0', Accept: 'text/html' },
      redirect: 'follow',
    });
    clearTimeout(t);
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

  const existing = await prisma.registeredSite.findUnique({
    where: { userId_domain: { userId: session.userId, domain: hostname } },
  });
  if (existing) return NextResponse.json({ error: 'Site already registered' }, { status: 409 });

  const live = await tagIsLive(validation.normalizedUrl);
  if (!live) {
    return NextResponse.json({
      error: 'OmniRoute tag not detected. Install and verify the tag before adding your site.',
    }, { status: 422 });
  }

  const site = await prisma.registeredSite.create({
    data: { userId: session.userId, domain: hostname, verifiedAt: new Date() },
  });

  return NextResponse.json({ success: true, domain: site.domain, addedAt: site.addedAt });
}
