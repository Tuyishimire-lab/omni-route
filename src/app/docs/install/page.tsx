'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Copy, CheckCircle2, Code, Globe, Zap, Shield,
  ArrowRight, Terminal, AlertCircle, ChevronRight
} from 'lucide-react';

const ENDPOINT = 'https://omni-route-rho.vercel.app';

const FRAMEWORKS = [
  { id: 'html',         label: 'HTML',            icon: '🌐', description: 'Any static or server-rendered site' },
  { id: 'nextjs-app',  label: 'Next.js App',      icon: '▲',  description: 'App Router (Next.js 13+)' },
  { id: 'nextjs-pages',label: 'Next.js Pages',    icon: '▲',  description: 'Pages Router (classic)' },
  { id: 'react',       label: 'React / Vite',     icon: '⚛',  description: 'Vite, Create React App, etc.' },
  { id: 'wordpress',   label: 'WordPress',        icon: '🔵', description: 'functions.php or Code Snippets plugin' },
  { id: 'shopify',     label: 'Shopify',          icon: '🛒', description: 'theme.liquid' },
  { id: 'webflow',     label: 'Webflow',          icon: '🌊', description: 'Site Settings → Custom Code' },
  { id: 'nuxt',        label: 'Nuxt.js',          icon: '💚', description: 'nuxt.config.ts head scripts' },
];

const SNIPPETS: Record<string, { file: string; code: string; note: string }> = {
  html: {
    file: 'index.html  ·  before </body>',
    note: 'Works with plain HTML, PHP, Ruby on Rails, Django — any framework that outputs HTML.',
    code: `<!-- Add this before </body> on every page -->
<script
  async
  src="${ENDPOINT}/api/v1/track.js"
  data-omniroute-endpoint="${ENDPOINT}">
</script>`,
  },

  'nextjs-app': {
    file: 'app/layout.tsx',
    note: 'Use strategy="afterInteractive" so the script never blocks your page render.',
    code: `import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* OmniRoute — AI traffic classifier, no cookies, no PII */}
        <Script
          src="${ENDPOINT}/api/v1/track.js"
          data-omniroute-endpoint="${ENDPOINT}"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`,
  },

  'nextjs-pages': {
    file: 'pages/_app.tsx',
    note: 'Adding it in _app.tsx ensures it loads once across all page navigations.',
    code: `import Script from 'next/script';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />

      {/* OmniRoute — AI traffic classifier, no cookies, no PII */}
      <Script
        src="${ENDPOINT}/api/v1/track.js"
        data-omniroute-endpoint="${ENDPOINT}"
        strategy="afterInteractive"
      />
    </>
  );
}`,
  },

  react: {
    file: 'src/App.tsx',
    note: 'The cleanup function prevents duplicate script tags in React Strict Mode development re-renders.',
    code: `import { useEffect } from 'react';

function OmniRouteTracker() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${ENDPOINT}/api/v1/track.js';
    script.setAttribute('data-omniroute-endpoint', '${ENDPOINT}');
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);
  return null;
}

export default function App() {
  return (
    <>
      <OmniRouteTracker />
      {/* ... rest of your app */}
    </>
  );
}`,
  },

  wordpress: {
    file: 'functions.php  ·  or Code Snippets plugin',
    note: 'Hooked to wp_footer so it loads after page content — zero impact on Core Web Vitals.',
    code: `<?php
/**
 * OmniRoute — AI traffic classifier
 * Add to your theme's functions.php or via the Code Snippets plugin.
 */
function omniroute_tracking_snippet() {
    echo '<script async'
       . ' src="${ENDPOINT}/api/v1/track.js"'
       . ' data-omniroute-endpoint="${ENDPOINT}">'
       . '</script>';
}
add_action( 'wp_footer', 'omniroute_tracking_snippet' );`,
  },

  shopify: {
    file: 'layout/theme.liquid  ·  before </body>',
    note: 'In Shopify Admin: Online Store → Themes → Edit Code → layout/theme.liquid.',
    code: `{%- comment -%}
  OmniRoute — AI traffic classifier
  Place just before the closing </body> tag
{%- endcomment -%}
<script
  async
  src="${ENDPOINT}/api/v1/track.js"
  data-omniroute-endpoint="${ENDPOINT}">
</script>

</body>`,
  },

  webflow: {
    file: 'Site Settings → Custom Code → Footer Code',
    note: 'In Webflow: Site Settings → Custom Code → paste into "Footer Code" → Save & Publish.',
    code: `<!-- OmniRoute — AI traffic classifier, no cookies, GDPR-safe -->
<script
  async
  src="${ENDPOINT}/api/v1/track.js"
  data-omniroute-endpoint="${ENDPOINT}">
</script>`,
  },

  nuxt: {
    file: 'nuxt.config.ts',
    note: 'tagPosition: "bodyClose" loads the script after your page content.',
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: '${ENDPOINT}/api/v1/track.js',
          async: true,
          'data-omniroute-endpoint': '${ENDPOINT}',
          tagPosition: 'bodyClose',
        },
      ],
    },
  },
});`,
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-[rgba(187,191,191,0.12)] bg-[#111514] hover:bg-[#1a2020] text-[#878787] hover:text-white"
    >
      {copied ? (
        <><CheckCircle2 className="w-3.5 h-3.5 text-[#05AD98]" /><span className="text-[#05AD98]">Copied!</span></>
      ) : (
        <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
      )}
    </button>
  );
}

const FAQ = [
  { q: 'Does it slow down my site?', a: 'No. The script uses async so it never blocks rendering. The beacon fires via navigator.sendBeacon — fire-and-forget, no response wait.' },
  { q: 'Is it GDPR / CCPA compliant?', a: 'Yes. No cookies are set. No IP addresses are stored. No personal data is collected. The only data sent is the URL path and an anonymous sessionStorage ID. Human visits are never written to the database.' },
  { q: 'What does "recorded: false" mean?', a: 'Human visits are intentionally not stored — OmniRoute only persists AI crawler and agent traffic. recorded: false for a human visit is correct behavior.' },
  { q: 'Do I need an API key?', a: 'No API key is required for the tracking snippet. The domain is automatically determined from the Host header of the incoming request.' },
  { q: 'Can I verify what\'s being sent?', a: 'Yes — the snippet source is public at /api/v1/track.js. It only POSTs { path, sessionId }. User-Agent and Referer are read server-side from headers — the same data every web server already logs.' },
];

export default function InstallPage() {
  const [active, setActive] = useState('nextjs-app');
  const snippet = SNIPPETS[active];

  return (
    <div className="space-y-10 max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#878787]">
        <Link href="/docs" className="hover:text-[#05AD98] transition-colors">Docs</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white">Installation</span>
      </div>

      {/* Hero */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Terminal className="w-3.5 h-3.5" />
          <span>Quickstart — 2 minutes</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Install the <span className="gradient-text">Tracking Snippet</span>
        </h1>

        <p className="text-sm sm:text-base text-[#BBBFBF] leading-relaxed max-w-3xl">
          One script tag. No API key. OmniRoute classifies every AI crawler, LLM agent, and
          generative search referral — server-side, using request headers only. No cookies,
          no fingerprinting, GDPR-safe.
        </p>

        <div className="flex flex-wrap gap-3">
          {[
            { icon: Shield, text: 'No cookies or PII' },
            { icon: Zap, text: 'Non-blocking (async)' },
            { icon: Globe, text: 'Works on any domain' },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.10)] text-xs text-[#BBBFBF]">
              <b.icon className="w-3.5 h-3.5 text-[#05AD98]" />
              {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* Framework selector + code block */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Code className="w-5 h-5 text-[#05AD98]" />
          Pick your framework
        </h2>

        <div className="flex flex-wrap gap-2">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setActive(fw.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                active === fw.id
                  ? 'bg-[rgba(5,173,152,0.15)] border-[rgba(5,173,152,0.40)] text-[#05AD98]'
                  : 'bg-[#111514] border-[rgba(187,191,191,0.10)] text-[#878787] hover:text-white hover:border-[rgba(187,191,191,0.25)]'
              }`}
            >
              <span>{fw.icon}</span>
              {fw.label}
            </button>
          ))}
        </div>

        {snippet && (
          <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0A0E0E]/80 border-b border-[rgba(187,191,191,0.08)]">
              <span className="text-[11px] font-mono text-[#878787]">{snippet.file}</span>
              <CopyButton text={snippet.code} />
            </div>
            <pre className="p-5 text-xs font-mono text-[#05AD98] leading-relaxed overflow-x-auto whitespace-pre">
              {snippet.code}
            </pre>
            <div className="px-5 py-3 bg-[#0A0E0E]/60 border-t border-[rgba(187,191,191,0.06)] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#878787] leading-relaxed">{snippet.note}</p>
            </div>
          </div>
        )}
      </section>

      {/* Verification */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
        <h2 className="text-lg font-bold text-white">Verify the installation</h2>
        <div className="space-y-5">
          {[
            { n: '1', title: 'Open your site + DevTools', body: 'Network tab → filter "track". You should see a POST request to omni-route-rho.vercel.app/api/v1/track fire on page load.' },
            { n: '2', title: 'Inspect the response', body: 'You will see:', code: '{ "success": true, "recorded": false, "classification": "HUMAN" }' },
            { n: '3', title: 'recorded: false is correct', body: 'Human visits are intentionally not stored. AI crawlers will appear in your analytics within 24–48 hours after crawlers index your site. Run a GEO Audit to kick off initial indexing.' },
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
            { href: '/audit',     icon: Globe, title: 'Run a GEO Audit',      desc: 'Score your domain across Perplexity, GPT-4o, Claude, and Gemini.' },
            { href: '/manifest',  icon: Code,  title: 'Generate agent.json',  desc: 'Make your site machine-readable for autonomous buyer agents.' },
            { href: '/watchlist', icon: Zap,   title: 'Add to Watchlist',     desc: 'Monitor your GEO score with automated daily re-scans.' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
