import React from 'react';
import type { Metadata } from 'next';
import ShareableAuditClient from './ShareableAuditClient';
import { createClient } from '@libsql/client';

/** Fetch the latest GEO score from DB if available (non-blocking). */
async function getDomainScore(domain: string): Promise<{ score: number | null; status: string | null; category: string | null }> {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
    if (!dbUrl) return { score: null, status: null, category: null };

    const client = createClient({ url: dbUrl, authToken: dbToken });
    const result = await client.execute({
      sql: 'SELECT latestGeoScore, status, category FROM "Domain" WHERE domain = ? LIMIT 1',
      args: [domain],
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const score = Number(row.latestGeoScore) || null;
      return {
        score: score && score > 0 ? score : null,
        status: row.status as string | null,
        category: row.category as string | null,
      };
    }
  } catch {
    // Silent fallback - don't block page render
  }
  return { score: null, status: null, category: null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const rawDomain = decodeURIComponent(resolvedParams.domain || 'example.com');
  const cleanDomain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  const canonicalUrl = `https://www.citeroute.com/audit/${cleanDomain}`;

  const { score, category } = await getDomainScore(cleanDomain);

  const scoreText = score ? `${score}/100` : '';
  const titleScore = score ? `${cleanDomain}: ${scoreText} GEO Score` : `${cleanDomain} GEO Score`;
  const descScore = score
    ? `${cleanDomain} scores ${scoreText} on the CiteRoute GEO Index. `
    : '';

  return {
    title: `${titleScore} & AI Citation Audit | CiteRoute`,
    description: `${descScore}Generative Engine Optimization (GEO) audit report for ${cleanDomain}. Measure citation probability across ChatGPT, Claude, Gemini, and Perplexity with real-time agent telemetry.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${titleScore} & AI Citation Audit | CiteRoute`,
      description: `${descScore}See how AI search engines cite ${cleanDomain}. Real-time GEO score, crawler permissions, and zero-click resilience analysis.`,
      url: canonicalUrl,
      siteName: 'CiteRoute',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${titleScore} & AI Citation Audit | CiteRoute`,
      description: `${descScore}Generative Engine Optimization (GEO) audit report for ${cleanDomain}. Measure citation probability across ChatGPT, Claude, Gemini, and Perplexity.`,
    },
    keywords: [
      `${cleanDomain} GEO score`,
      `${cleanDomain} AI citation`,
      `${cleanDomain} AI readiness`,
      `${cleanDomain} generative engine optimization`,
      'GEO audit',
      'AI search optimization',
      'citation rate',
      category || 'SaaS',
    ].filter(Boolean),
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

  const { score } = await getDomainScore(cleanDomain);

  // JSON-LD structured data for richer Google snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${cleanDomain} GEO Score & AI Citation Audit`,
    description: `Generative Engine Optimization audit for ${cleanDomain}. Real-time AI citation probability and crawler access analysis.`,
    url: `https://www.citeroute.com/audit/${cleanDomain}`,
    mainEntity: {
      '@type': 'Product',
      name: `${cleanDomain} GEO Audit Report`,
      description: `AI citation readiness and generative engine optimization analysis for ${cleanDomain}.`,
      brand: {
        '@type': 'Organization',
        name: 'CiteRoute',
        url: 'https://www.citeroute.com',
      },
      ...(score && score > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: String(score),
              bestRating: '100',
              worstRating: '0',
              ratingCount: '1',
            },
          }
        : {}),
    },
    provider: {
      '@type': 'Organization',
      name: 'CiteRoute',
      url: 'https://www.citeroute.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShareableAuditClient initialDomain={cleanDomain} />
    </>
  );
}
