import React from 'react';
import type { Metadata } from 'next';
import DirectoryClient from './DirectoryClient';

export const metadata: Metadata = {
  title: 'AI Citation Readiness Directory — GEO Scores for 1,000+ SaaS Companies | CiteRoute',
  description:
    'Browse GEO scores and AI citation readiness for 1,000+ SaaS companies. See how brands like Stripe, Notion, and Vercel perform across ChatGPT, Claude, Gemini, and Perplexity.',
  alternates: {
    canonical: 'https://www.citeroute.com/directory',
  },
  openGraph: {
    title: 'AI Citation Readiness Directory | CiteRoute',
    description:
      'Explore the most comprehensive directory of GEO scores across 20 industry categories. Discover how the world\'s top SaaS companies perform in AI search engines.',
    url: 'https://www.citeroute.com/directory',
    siteName: 'CiteRoute',
    type: 'website',
  },
  keywords: [
    'GEO score directory',
    'AI citation readiness',
    'SaaS GEO leaderboard',
    'generative engine optimization',
    'AI search optimization scores',
  ],
};

export default function DirectoryPage() {
  return <DirectoryClient />;
}
