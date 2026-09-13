import React from 'react';
import type { Metadata } from 'next';
import ShareableAuditClient from './ShareableAuditClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const rawDomain = decodeURIComponent(resolvedParams.domain || 'example.com');
  const cleanDomain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  const canonicalUrl = `https://www.citeroute.com/audit/${cleanDomain}`;

  return {
    title: `${cleanDomain} GEO Score & AI Citation Audit | CiteRoute`,
    description: `Generative Engine Optimization (GEO) audit report for ${cleanDomain}. Measure citation probability across ChatGPT, Claude, and Perplexity with real-time agent telemetry.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${cleanDomain} GEO Audit & AI Citation Score | CiteRoute`,
      description: `See how AI search engines cite ${cleanDomain}. Real-time GEO score, crawler permissions, and zero-click resilience analysis.`,
      url: canonicalUrl,
      siteName: 'CiteRoute',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cleanDomain} GEO Audit & AI Citation Score | CiteRoute`,
      description: `Generative Engine Optimization (GEO) audit report for ${cleanDomain}. Measure citation probability across ChatGPT, Claude, and Perplexity.`,
    },
  };
}

export default async function ShareableAuditPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const resolvedParams = await params;
  const rawDomain = decodeURIComponent(resolvedParams.domain || 'stripe.com');
  const cleanDomain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();

  return <ShareableAuditClient initialDomain={cleanDomain} />;
}
