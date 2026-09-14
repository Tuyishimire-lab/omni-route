import type { MetadataRoute } from 'next';
import { createClient } from '@libsql/client';

/**
 * Dynamic sitemap that includes all core routes AND all /audit/{domain} pages
 * from the database. This is the backbone of programmatic SEO - every seeded
 * domain automatically appears in the sitemap for Google to crawl.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.citeroute.com';
  const lastModified = new Date();

  // ── Static core routes ─────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs/install`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/manifest`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/audit`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/benchmark`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/directory`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/analytics`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // ── Dynamic audit page routes from database ────────────────────────────────
  let auditRoutes: MetadataRoute.Sitemap = [];

  try {
    const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    if (dbUrl) {
      const client = createClient({
        url: dbUrl,
        authToken: dbToken,
      });

      const result = await client.execute(
        'SELECT domain, lastScanned FROM "Domain" ORDER BY latestGeoScore DESC'
      );

      auditRoutes = result.rows.map((row) => ({
        url: `${baseUrl}/audit/${row.domain}`,
        lastModified: row.lastScanned ? new Date(row.lastScanned as string) : lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

      console.log(`[sitemap] Generated ${auditRoutes.length} audit page entries from database`);
    }
  } catch (err) {
    // Silently fall back to static-only sitemap if DB is unavailable
    console.warn('[sitemap] Could not fetch domains from database:', err instanceof Error ? err.message : err);
  }

  return [...staticRoutes, ...auditRoutes];
}
