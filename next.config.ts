import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Used client-side for canonical URLs, OG tags, sitemaps, share links.
    // NEVER use this server-side for OAuth redirect URIs — derive from req.nextUrl instead.
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
