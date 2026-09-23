/**
 * POST /api/v1/engine-probe
 * ─────────────────────────
 * Dispatches live empirical citation probes via OpenRouter to measure if
 * Perplexity, OpenAI ChatGPT, Anthropic Claude, and Google Gemini cite a domain.
 * Supports both standard domain authority probes and custom user search queries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { probeAllEngines, probeSingleEngine, TARGET_ENGINES } from '../../../../lib/citationProber';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';
import { validateAndSanitizeUrl } from '../../../../lib/security';
import { getSession } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Rate limit: 10 live probe requests per minute per IP
  const rl = await checkRateLimit(ip, 'engine-probe', 60_000, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment before running another probe.', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    );
  }

  let body: { domain?: string; query?: string; engine?: string; bypassCache?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { domain, query, engine } = body;

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 });
  }

  const validation = validateAndSanitizeUrl(domain.startsWith('http') ? domain : `https://${domain}`);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error ?? 'Invalid domain' }, { status: 400 });
  }

  const cleanDomain = validation.domain;
  const customQuery = typeof query === 'string' && query.trim().length > 0 ? query.trim().slice(0, 300) : undefined;

  // Resolve session: privileged users (pro, agency, admin) can force live re-probe
  const session = await getSession().catch(() => null);
  const isPrivileged = session?.role === 'admin' || Boolean(session?.tier && session.tier !== 'free');
  const bypassCache = Boolean(isPrivileged && body.bypassCache);

  try {
    if (engine && typeof engine === 'string') {
      const targetEngine = TARGET_ENGINES.find((e) => e.id === engine.toLowerCase());
      if (targetEngine) {
        const result = await probeSingleEngine(cleanDomain, targetEngine, customQuery);
        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          query: customQuery,
          engines: [result],
          probedAt: new Date().toISOString(),
          cached: Boolean(result.isCached),
        });
      }
    }

    const results = await probeAllEngines(cleanDomain, customQuery, { bypassCache });

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      query: customQuery,
      engines: results,
      probedAt: results[0]?.testedAt || new Date().toISOString(),
      cached: Boolean(results[0]?.isCached),
    });
  } catch (error) {
    console.error('[Engine Probe] Execution error:', error);
    return NextResponse.json(
      { error: 'Engine probe execution failed. Please try again later.' },
      { status: 500 }
    );
  }
}
