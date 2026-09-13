/**
 * POST /api/v1/engine-query
 * ─────────────────────────
 * Accepts a domain and a set of AI engine API keys from the client.
 * Runs live queries against each engine the user has configured and returns
 * real EngineQueryResult[] data.
 *
 * Security notes:
 * - API keys are passed in the request body, used immediately, and NEVER persisted.
 * - Keys are not logged. The route does not store any key material.
 * - Rate-limited to 5 requests/minute per IP to prevent key-bruteforce enumeration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryAllEngines, EngineKeySet } from '../../../../lib/engineIntegrations';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';
import { validateAndSanitizeUrl } from '../../../../lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Rate limit: 5 engine queries per minute per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(ip, 'engine-query', 60_000, 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a moment.', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    );
  }

  let body: { domain?: string; engineKeys?: EngineKeySet };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { domain, engineKeys } = body;

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 });
  }

  // Re-use the SSRF-hardened URL validator to clean the domain input
  const validation = validateAndSanitizeUrl(domain.startsWith('http') ? domain : `https://${domain}`);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error ?? 'Invalid domain' }, { status: 400 });
  }

  const cleanDomain = validation.domain;

  if (!engineKeys || typeof engineKeys !== 'object') {
    return NextResponse.json({ error: 'engineKeys object is required' }, { status: 400 });
  }

  // Validate that at least one key was provided
  const providedKeys = Object.values(engineKeys).filter(k => typeof k === 'string' && k.trim().length > 0);
  if (providedKeys.length === 0) {
    return NextResponse.json({ error: 'At least one engine API key must be provided' }, { status: 400 });
  }

  // Run live engine queries - keys are used here and never stored
  const results = await queryAllEngines(cleanDomain, engineKeys);

  return NextResponse.json({
    success: true,
    domain: cleanDomain,
    results,
    queriedAt: new Date().toISOString(),
  });
}
