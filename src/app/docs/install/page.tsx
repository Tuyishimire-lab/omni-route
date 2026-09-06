'use client';

import React from 'react';
import Link from 'next/link';
import {
  Copy, CheckCircle2, Code, Globe, Zap, Shield,
  ArrowRight, Terminal, AlertCircle, ChevronRight
} from 'lucide-react';
import TagVerifier from '../../../components/TagVerifier';

const ENDPOINT = 'https://omni-route-rho.vercel.app';

const TAG = `<!-- OmniRoute Tag -->
<script async src="${ENDPOINT}/api/v1/track.js?site=yourdomain.com"></script>`;

const MIDDLEWARE_FRAMEWORKS = [
  { id: 'nextjs-middleware', label: 'Next.js / Vercel', icon: '▲' },
  { id: 'cloudflare-worker', label: 'Cloudflare Worker', icon: '⚡' },
  { id: 'express-node',      label: 'Node.js / Express', icon: '🟢' },
];

const CLIENT_FRAMEWORKS = [
  { id: 'html',          label: 'HTML',          icon: '🌐' },
  { id: 'nextjs-app',   label: 'Next.js App',    icon: '▲'  },
  { id: 'nextjs-pages', label: 'Next.js Pages',  icon: '▲'  },
  { id: 'react',        label: 'React / Vite',   icon: '⚛'  },
  { id: 'wordpress',    label: 'WordPress',      icon: '🔵' },
  { id: 'shopify',      label: 'Shopify',        icon: '🛒' },
  { id: 'webflow',      label: 'Webflow',        icon: '🌊' },
  { id: 'nuxt',         label: 'Nuxt.js',        icon: '💚' },
];

const MIDDLEWARE_SNIPPETS: Record<string, { file: string; code: string; note: string }> = {
  'nextjs-middleware': {
    file: 'middleware.ts (or src/middleware.ts) · Project Root',
    note: 'Next.js Edge Middleware intercepts 100% of headless AI crawlers (GPTBot, ClaudeBot, etc.) before page render. Uses event.waitUntil() for zero added latency and sets an x-omniroute-tracked header for instant verification.',
    code: `import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';

const OMNIROUTE_ENDPOINT = '${ENDPOINT}/api/v1/track';
const YOUR_DOMAIN = 'yourdomain.com'; // Replace with your domain

const AI_BOTS = [
  'gptbot', 'claudebot', 'perplexitybot', 'bytespider', 'oai-searchbot',
  'applebot-extended', 'google-extended', 'diffbot', 'cohere-ai', 'anthropic-ai'
];

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const referer = request.headers.get('referer') || '';
  const isAiCrawler = AI_BOTS.some(bot => ua.includes(bot));
  const isAiReferral = /chatgpt|perplexity|claude|gemini|copilot/i.test(referer);

  // If non-human or AI referral, capture telemetry in background
  if (isAiCrawler || isAiReferral) {
    event.waitUntil(
      fetch(OMNIROUTE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-user-agent': request.headers.get('user-agent') || '',
          'x-forwarded-referer': referer,
        },
        body: JSON.stringify({
          domain: YOUR_DOMAIN,
          path: request.nextUrl.pathname,
        }),
      }).catch(() => {})
    );
  }

  // Attach diagnostic header so OmniRoute Verifier detects your middleware
  const response = NextResponse.next();
  response.headers.set('x-omniroute-tracked', '1');
  return response;
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|robots.txt).*)'],
};`,
  },
  'cloudflare-worker': {
    file: 'worker.js · Cloudflare Workers / Wrangler',
    note: 'Universal Edge Proxy: Runs globally on Cloudflare edge in <5ms. Works in front of ANY origin (WordPress, Webflow, Shopify custom domains, PHP, Rails). Captures raw AI bots and passes normal traffic directly to your site.',
    code: `const OMNIROUTE_ENDPOINT = '${ENDPOINT}/api/v1/track';
const YOUR_DOMAIN = 'yourdomain.com'; // Replace with your domain

const AI_BOTS = [
  'gptbot', 'claudebot', 'perplexitybot', 'bytespider', 'oai-searchbot',
  'applebot-extended', 'google-extended', 'diffbot', 'cohere-ai'
];

export default {
  async fetch(request, env, ctx) {
    const ua = (request.headers.get('user-agent') || '').toLowerCase();
    const referer = request.headers.get('referer') || '';
    const url = new URL(request.url);

    if (AI_BOTS.some(b => ua.includes(b)) || /chatgpt|perplexity|claude|gemini/i.test(referer)) {
      ctx.waitUntil(
        fetch(OMNIROUTE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-user-agent': request.headers.get('user-agent') || '',
            'x-forwarded-referer': referer,
          },
          body: JSON.stringify({ domain: YOUR_DOMAIN, path: url.pathname }),
        }).catch(() => {})
      );
    }

    const response = await fetch(request);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('x-omniroute-tracked', '1');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  },
};`,
  },
  'express-node': {
    file: 'middleware/omniroute.js · Node.js / Express Server',
    note: 'Drop-in Express middleware for API backends and server-rendered Node apps. Non-blocking asynchronous logging.',
    code: `const AI_BOTS = ['gptbot', 'claudebot', 'perplexitybot', 'bytespider', 'oai-searchbot'];

function omnirouteMiddleware(req, res, next) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const referer = req.headers['referer'] || '';
  const isAi = AI_BOTS.some(b => ua.includes(b)) || /chatgpt|perplexity|claude/i.test(referer);

  if (isAi) {
    fetch('${ENDPOINT}/api/v1/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-user-agent': req.headers['user-agent'] || '',
        'x-forwarded-referer': referer,
      },
      body: JSON.stringify({
        domain: 'yourdomain.com', // Replace with your domain
        path: req.originalUrl,
      }),
    }).catch(() => {});
  }

  res.setHeader('x-omniroute-tracked', '1');
  next();
}

module.exports = omnirouteMiddleware;`,
  },
};

const CLIENT_SNIPPETS: Record<string, { file: string; code: string; note: string }> = {
  html: {
    file: 'index.html  ·  before </body>',
    note: 'Replace yourdomain.com with your actual domain. Works with PHP, Rails, Django - any HTML.',
    code: TAG,
  },
  'nextjs-app': {
    file: 'app/layout.tsx',
    note: 'Use a native <script> tag in <head> - NOT the Next.js <Script> component. The Script component injects via JS at runtime, so the tag won\'t appear in raw HTML and our verifier (and some crawlers) won\'t detect it.',
    code: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* OmniRoute Tag - native script tag so it appears in raw HTML */}
        <script async src="${ENDPOINT}/api/v1/track.js?site=yourdomain.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
  },
  'nextjs-pages': {
    file: 'pages/_app.tsx',
    note: 'Use a native <script> tag - the Next.js <Script> component with afterInteractive injects via JS, hiding the tag from raw HTML. A native tag in <Head> is visible to crawlers and our verifier.',
    code: `import Head from 'next/head';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* OmniRoute Tag */}
        <script async src="${ENDPOINT}/api/v1/track.js?site=yourdomain.com" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}`,
  },
  react: {
    file: 'src/App.tsx',
    note: 'The cleanup prevents duplicate script tags during React Strict Mode dev re-renders.',
    code: `import { useEffect } from 'react';

function OmniRouteTag() {
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '${ENDPOINT}/api/v1/track.js?site=yourdomain.com';
    s.async = true;
    document.body.appendChild(s);
    return () => { if (document.body.contains(s)) document.body.removeChild(s); };
  }, []);
  return null;
}

export default function App() {
  return (
    <>
      <OmniRouteTag />
      {/* rest of your app */}
    </>
  );
}`,
  },
  wordpress: {
    file: 'functions.php  ·  or Code Snippets plugin',
    note: 'Hooked to wp_footer - loads after page content, no impact on Core Web Vitals.',
    code: `<?php
function omniroute_tag() {
    echo '<script async src="${ENDPOINT}/api/v1/track.js?site=yourdomain.com"></script>';
}
add_action( 'wp_footer', 'omniroute_tag' );`,
  },
  shopify: {
    file: 'layout/theme.liquid  ·  before </body>',
    note: 'Online Store → Themes → Edit Code → layout/theme.liquid',
    code: `<!-- OmniRoute Tag -->
<script async src="${ENDPOINT}/api/v1/track.js?site=yourdomain.com"></script>

</body>`,
  },
  webflow: {
    file: 'Site Settings → Custom Code → Footer Code',
    note: 'Site Settings → Custom Code → paste into Footer Code → Save & Publish.',
    code: `<!-- OmniRoute Tag -->
<script async src="${ENDPOINT}/api/v1/track.js?site=yourdomain.com"></script>`,
  },
  nuxt: {
    file: 'nuxt.config.ts',
    note: 'tagPosition bodyClose loads the script after page content.',
    code: `export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: '${ENDPOINT}/api/v1/track.js?site=yourdomain.com',
          async: true,
          tagPosition: 'bodyClose',
        },
      ],
    },
  },
});`,
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-[rgba(187,191,191,0.12)] bg-[#111514] hover:bg-[#1a2020] text-[#878787] hover:text-white"
    >
      {copied
        ? <><CheckCircle2 className="w-3.5 h-3.5 text-[#05AD98]" /><span className="text-[#05AD98]">Copied!</span></>
        : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>}
    </button>
  );
}

const FAQ = [
  { q: 'What is yourdomain.com?', a: 'Replace it with your actual domain - e.g. stripe.com or myblog.io. Do not include https:// or a trailing slash. This is how OmniRoute attributes AI traffic to your site.' },
  { q: 'Does it slow down my site?', a: 'No. The async attribute means it never blocks rendering. The beacon fires via navigator.sendBeacon on the load event - fire-and-forget, no response wait.' },
  { q: 'Is it GDPR / CCPA compliant?', a: 'Yes. No cookies. No IP addresses stored. No personal data collected. The only data sent is the URL path and an anonymous sessionStorage ID. Human visits are never written to the database.' },
  { q: 'I see recorded: false - is that normal?', a: 'Yes. Human visits are intentionally not stored. OmniRoute only persists AI crawler and agent traffic. recorded: false means the script is working correctly.' },
  { q: 'Do I need an API key?', a: 'No. The tag works without any account. API keys are only needed if you want to query the OmniRoute REST API directly.' },
];

export default function InstallPage() {
  const [installMode, setInstallMode] = React.useState<'middleware' | 'client'>('middleware');
  const [activeMiddleware, setActiveMiddleware] = React.useState('nextjs-middleware');
  const [activeClient, setActiveClient] = React.useState('nextjs-app');

  const middlewareSnippet = MIDDLEWARE_SNIPPETS[activeMiddleware];
  const clientSnippet = CLIENT_SNIPPETS[activeClient];

  return (
    <div className="space-y-10 max-w-4xl mx-auto">

      <div className="flex items-center gap-2 text-xs text-[#878787]">
        <Link href="/docs" className="hover:text-[#05AD98] transition-colors">Docs</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white">Installation</span>
      </div>

      <section className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Terminal className="w-3.5 h-3.5" />
          <span>Quickstart · 2 minutes</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Install <span className="gradient-text">OmniRoute Telemetry</span>
        </h1>

        <p className="text-sm sm:text-base text-[#BBBFBF] leading-relaxed max-w-3xl">
          Choose the integration method that matches your architecture. Edge Middleware captures 100% of headless AI crawlers before page render, while the Client Script tag offers instant zero-code setup for static sites and CMSs.
        </p>

        {/* Installation Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-2xl bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)]">
          <button
            onClick={() => setInstallMode('middleware')}
            className={`flex flex-col items-start gap-1 p-4 rounded-xl text-left transition-all ${
              installMode === 'middleware'
                ? 'bg-[#151D1C] border border-[rgba(5,173,152,0.40)] shadow-lg shadow-[rgba(5,173,152,0.08)]'
                : 'hover:bg-[#111514] border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#05AD98]" />
                Edge & Server Middleware
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#05AD98]/15 text-[#05AD98] border border-[#05AD98]/30">
                RECOMMENDED
              </span>
            </div>
            <p className="text-xs text-[#878787] mt-1">
              Catches 100% of headless AI crawlers (GPTBot, ClaudeBot, PerplexityBot) with 0ms added page latency.
            </p>
          </button>

          <button
            onClick={() => setInstallMode('client')}
            className={`flex flex-col items-start gap-1 p-4 rounded-xl text-left transition-all ${
              installMode === 'client'
                ? 'bg-[#151D1C] border border-[rgba(5,173,152,0.40)] shadow-lg shadow-[rgba(5,173,152,0.08)]'
                : 'hover:bg-[#111514] border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-[#05AD98]" />
                Client Script Tag (&lt;script&gt;)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-[#878787] bg-white/5 border border-white/10">
                CMS / STATIC
              </span>
            </div>
            <p className="text-xs text-[#878787] mt-1">
              1-line paste for WordPress, Shopify, Webflow, or static HTML. Captures AI referrals and JS-enabled bots.
            </p>
          </button>
        </div>

        {/* Selected Mode Code & Instructions */}
        {installMode === 'middleware' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {MIDDLEWARE_FRAMEWORKS.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => setActiveMiddleware(fw.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    activeMiddleware === fw.id
                      ? 'bg-[rgba(5,173,152,0.15)] border-[rgba(5,173,152,0.40)] text-[#05AD98]'
                      : 'bg-[#111514] border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white hover:border-[rgba(187,191,191,0.25)]'
                  }`}
                >
                  <span>{fw.icon}</span>{fw.label}
                </button>
              ))}
            </div>

            {middlewareSnippet && (
              <div className="glass-panel rounded-2xl border border-[rgba(5,173,152,0.30)] overflow-hidden shadow-lg shadow-[rgba(5,173,152,0.08)]">
                <div className="flex items-center justify-between px-4 py-3 bg-[#0A0E0E]/90 border-b border-[rgba(187,191,191,0.08)]">
                  <span className="text-[11px] font-mono text-[#05AD98]">{middlewareSnippet.file}</span>
                  <CopyButton text={middlewareSnippet.code} />
                </div>
                <pre className="p-5 text-xs font-mono text-[#05AD98] leading-relaxed overflow-x-auto whitespace-pre">{middlewareSnippet.code}</pre>
                <div className="px-5 py-3 bg-[#0A0E0E]/60 border-t border-[rgba(187,191,191,0.06)] flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#05AD98] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#BBBFBF] leading-relaxed">{middlewareSnippet.note}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* The hero tag block */}
            <div className="glass-panel rounded-2xl border border-[rgba(5,173,152,0.30)] overflow-hidden shadow-lg shadow-[rgba(5,173,152,0.08)]">
              <div className="flex items-center justify-between px-4 py-3 bg-[#0A0E0E]/80 border-b border-[rgba(187,191,191,0.08)]">
                <span className="text-[11px] font-mono text-[#878787]">Universal one-liner · paste before &lt;/body&gt;</span>
                <CopyButton text={TAG} />
              </div>
              <pre className="p-5 text-sm font-mono text-[#05AD98] leading-relaxed overflow-x-auto whitespace-pre">{TAG}</pre>
              <div className="px-5 py-3 bg-[rgba(5,173,152,0.05)] border-t border-[rgba(5,173,152,0.15)] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[11px] text-[#878787]">
                  Replace <span className="text-white font-mono">yourdomain.com</span> with your actual domain (no https://, no trailing slash).
                </p>
              </div>
            </div>

            {/* Framework tabs for script */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-[#BBBFBF]">Framework-specific snippet:</p>
              <div className="flex flex-wrap gap-2">
                {CLIENT_FRAMEWORKS.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setActiveClient(fw.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      activeClient === fw.id
                        ? 'bg-[rgba(5,173,152,0.15)] border-[rgba(5,173,152,0.40)] text-[#05AD98]'
                        : 'bg-[#111514] border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white hover:border-[rgba(187,191,191,0.25)]'
                    }`}
                  >
                    <span>{fw.icon}</span>{fw.label}
                  </button>
                ))}
              </div>

              {clientSnippet && (
                <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#0A0E0E]/80 border-b border-[rgba(187,191,191,0.08)]">
                    <span className="text-[11px] font-mono text-[#878787]">{clientSnippet.file}</span>
                    <CopyButton text={clientSnippet.code} />
                  </div>
                  <pre className="p-5 text-xs font-mono text-[#05AD98] leading-relaxed overflow-x-auto whitespace-pre">{clientSnippet.code}</pre>
                  <div className="px-5 py-3 bg-[#0A0E0E]/60 border-t border-[rgba(187,191,191,0.06)] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#878787] leading-relaxed">{clientSnippet.note}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {[
            { icon: Shield, text: 'No cookies or PII' },
            { icon: Zap,    text: 'Zero added page latency' },
            { icon: Globe,  text: 'Serverless & Edge ready' },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] text-xs text-[#BBBFBF]">
              <b.icon className="w-3.5 h-3.5 text-[#05AD98]" />
              {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* Verify widget */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Verify your installation</h2>
          <p className="text-xs text-[#878787] mt-1">Enter your domain and we&apos;ll probe whether Edge Middleware or the Tracking Tag is active.</p>
        </div>
        <TagVerifier />
      </section>

      {/* Verification */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <h2 className="text-lg font-bold text-white">Verify the installation</h2>
        <div className="space-y-5">
          {[
            { n: '1', title: 'Open your site + DevTools', body: 'Network tab → filter "track". You should see a POST to omni-route-rho.vercel.app/api/v1/track fire on page load.', code: undefined },
            { n: '2', title: 'Check the response', body: 'You will see:', code: '{ "success": true, "recorded": false, "classification": "HUMAN" }' },
            { n: '3', title: 'All good', body: 'Human visits are not stored by design. AI crawlers appear in your analytics within 24–48 h. Run a GEO Audit to kick-start crawling.', code: undefined },
          ].map((item) => (
            <div key={item.n} className="flex gap-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] text-xs font-bold shrink-0 mt-0.5">{item.n}</span>
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-[#BBBFBF] leading-relaxed">{item.body}</p>
                {item.code && (
                  <div className="relative">
                    <pre className="bg-[#0A0E0E] rounded-xl px-4 py-3 text-xs font-mono text-[#05AD98] overflow-x-auto">{item.code}</pre>
                    <div className="absolute top-2 right-2"><CopyButton text={item.code} /></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">FAQ</h2>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <div key={item.q} className="glass-card rounded-xl p-5 border border-[rgba(187,191,191,0.08)] space-y-1.5">
              <p className="text-sm font-semibold text-white">{item.q}</p>
              <p className="text-xs text-[#878787] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Next steps */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(5,173,152,0.20)] bg-[rgba(5,173,152,0.04)] space-y-4">
        <h2 className="text-lg font-bold text-white">What to do next</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: '/audit',     icon: Globe, title: 'Run a GEO Audit',     desc: 'Score your domain across Perplexity, GPT-4o, Claude, and Gemini.' },
            { href: '/manifest',  icon: Code,  title: 'Generate agent.json', desc: 'Make your site machine-readable for autonomous buyer agents.' },
            { href: '/watchlist', icon: Zap,   title: 'Add to Watchlist',    desc: 'Monitor your GEO score with automated daily re-scans.' },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex flex-col gap-3 p-4 rounded-xl bg-[#111514] border border-[rgba(187,191,191,0.10)] hover:border-[rgba(5,173,152,0.30)] transition-all group"
            >
              <item.icon className="w-5 h-5 text-[#05AD98]" />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-[#05AD98] transition-colors">{item.title}</p>
                <p className="text-[11px] text-[#878787] mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#878787] group-hover:text-[#05AD98] transition-colors mt-auto self-end" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
