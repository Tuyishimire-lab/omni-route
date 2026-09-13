import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../../app/audit/[domain]/page';

describe('Shareable Audit Dynamic Metadata', () => {
  it('generates correct SEO title and OpenGraph tags for a given domain', async () => {
    const params = Promise.resolve({ domain: 'stripe.com' });
    const metadata = await generateMetadata({ params });

    expect(metadata.title).toContain('stripe.com');
    expect(metadata.title).toContain('GEO Score');
    expect(metadata.description).toContain('stripe.com');
    expect(metadata.openGraph?.url).toBe('https://www.citeroute.com/audit/stripe.com');
    expect((metadata.twitter as any)?.card).toBe('summary_large_image');
  });

  it('normalizes protocol and trailing slashes in the domain param', async () => {
    const params = Promise.resolve({ domain: 'https%3A%2F%2Flinear.app%2F' });
    const metadata = await generateMetadata({ params });

    expect(metadata.title).toContain('linear.app');
    expect(metadata.openGraph?.url).toBe('https://www.citeroute.com/audit/linear.app');
  });
});
