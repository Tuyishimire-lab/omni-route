import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // GitHub and Google avatar CDNs — used for OAuth profile pictures
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  env: {
    // Used client-side for canonical URLs, OG tags, sitemaps, share links.
    // NEVER use this server-side for OAuth redirect URIs — derive from req.nextUrl instead.
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.googletagmanager.com https://r.jina.ai https://*.turso.io",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              ...(process.env.NODE_ENV === 'development' ? [] : ['upgrade-insecure-requests']),
            ].join('; '),
          },
        ],
      },
      // The tracking snippet must be embeddable cross-origin
      {
        source: '/api/v1/track.js',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

export default nextConfig;
