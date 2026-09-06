import { describe, it, expect } from 'vitest';
import sitemap from '../../app/sitemap';

describe('Sitemap Generator (src/app/sitemap.ts)', () => {
  it('returns valid sitemap entries for Google indexing', () => {
    const entries = sitemap();

    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(8);

    // Root URL should have top priority
    const root = entries.find((e) => e.url === 'https://www.citeroute.com');
    expect(root).toBeDefined();
    expect(root?.priority).toBe(1.0);
    expect(root?.changeFrequency).toBe('daily');

    // Key marketing & documentation routes must be present
    const expectedPaths = [
      'https://www.citeroute.com/docs',
      'https://www.citeroute.com/docs/install',
      'https://www.citeroute.com/manifest',
      'https://www.citeroute.com/audit',
      'https://www.citeroute.com/leaderboard',
      'https://www.citeroute.com/pricing',
      'https://www.citeroute.com/about',
    ];

    for (const path of expectedPaths) {
      const match = entries.find((e) => e.url === path);
      expect(match, `Missing ${path} in sitemap`).toBeDefined();
      expect(match?.lastModified).toBeInstanceOf(Date);
    }
  });

  it('ensures all sitemap URLs use HTTPS and the official domain', () => {
    const entries = sitemap();
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/www\.citeroute\.com/);
    }
  });
});
