/**
 * OmniRoute Traffic Capture Proxy
 * ────────────────────────────────
 * This is the Next.js 16+ middleware file (renamed from middleware.ts to proxy.ts).
 * See node_modules/next/dist/docs/.../file-conventions/proxy.md.
 *
 * Why this exists:
 *   The JS tracking tag (track.js) relies on navigator.sendBeacon, which
 *   requires a browser executing JavaScript.  Real AI crawlers (GPTBot,
 *   ClaudeBot, PerplexityBot, etc.) fetch raw HTML and NEVER execute JS, so
 *   those visits were completely invisible to the Live Attestation Feed.
 *
 *   This proxy runs BEFORE the response is sent, on every page request, and
 *   uses event.waitUntil() to fire-and-forget a classification + DB write
 *   without adding latency to the actual page load.
 *
 * What it does NOT do:
 *   - It does NOT block or redirect any requests (purely observational).
 *   - It does NOT track API routes, static assets, or _next internals.
 *   - It does NOT log human traffic (the track endpoint filters that out).
 */

import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent, NextProxy } from 'next/server';

/** Minimal UA-based pre-filter — mirrors the logic in agentTraffic.ts.
 *  Full classification happens in /api/v1/track so we keep this file
 *  edge-safe (no Node.js-only imports).
 */
function looksLikeNonHuman(ua: string): boolean {
  const u = ua.toLowerCase();
  const knownBots = [
    'gptbot', 'ccbot', 'claudebot', 'claude-web', 'anthropic-ai',
    'google-extended', 'bytespider', 'omgili', 'diffbot', 'oai-searchbot',
    'perplexitybot', 'perplexity-user', 'applebot-extended',
    'meta-externalagent', 'amazonbot', 'cohere-ai', 'youbot',
    'langchain', 'auto-gpt', 'autogpt', 'agentgpt', 'babyagi',
    'crewai', 'openai-operator', 'puppeteer', 'scrapy', 'httpx',
    'python-requests', 'node-fetch', 'got/', 'axios/',
    // Headless Chrome that is NOT Vercel's own ISR renderer.
    // Vercel ISR UA contains 'HeadlessChrome' but agentTraffic.ts
    // does the fine-grained Vercel exclusion, so we capture broadly here.
    'headlesschrome',
  ];
  return knownBots.some((b) => u.includes(b));
}

/** Answer engines that refer traffic — the referrer alone is enough signal. */
const ANSWER_ENGINE_HOSTS = [
  'chatgpt.com', 'chat.openai.com', 'perplexity.ai',
  'claude.ai', 'gemini.google.com', 'copilot.microsoft.com',
  'you.com', 'poe.com', 'arc.net', 'duck.ai',
];

function isAnswerEngineReferral(referer: string | null): boolean {
  if (!referer) return false;
  const r = referer.toLowerCase();
  return ANSWER_ENGINE_HOSTS.some((h) => r.includes(h));
}

export const proxy: NextProxy = (request: NextRequest, event: NextFetchEvent) => {
  const ua = request.headers.get('user-agent') ?? '';
  const referer = request.headers.get('referer');
  const host = request.headers.get('host') ?? '';

  // Only capture non-human traffic to avoid flooding the DB with human hits.
  if (!looksLikeNonHuman(ua) && !isAnswerEngineReferral(referer)) {
    return NextResponse.next();
  }

  // Derive the customer domain from the Host header (strips port + www).
  const domain = host.toLowerCase().replace(/^www\./, '').split(':')[0];
  if (!domain) return NextResponse.next();

  // Build the absolute URL for the internal track endpoint.
  const trackUrl = new URL('/api/v1/track', request.url).toString();

  const payload = JSON.stringify({
    path: request.nextUrl.pathname + request.nextUrl.search,
    domain,
    // No sessionId - crawlers don't have sessions.
  });

  // event.waitUntil keeps the edge function alive until the fetch resolves
  // without blocking the response to the user/crawler.
  event.waitUntil(
    fetch(trackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the original UA and referer so the track endpoint can
        // classify the request properly using its full agentTraffic logic.
        ...(ua ? { 'x-forwarded-user-agent': ua } : {}),
        ...(referer ? { 'x-forwarded-referer': referer } : {}),
        // Mark as an internal proxy call to skip rate-limit on these.
        'x-omniroute-proxy': '1',
      },
      body: payload,
    }).catch((err) => {
      // Never let a tracking failure affect page delivery.
      console.warn('[proxy] track ping failed:', err instanceof Error ? err.message : err);
    })
  );

  return NextResponse.next();
};

export const config = {
  matcher: [
    /*
     * Run on all page routes EXCEPT:
     * - /api/*        (track.ts already handles its own logging)
     * - /_next/*      (static assets, image optimization)
     * - /favicon.ico, /robots.txt, /sitemap.xml, /track.js (static files)
     */
    '/((?!api/|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|track\\.js).*)',
  ],
};
