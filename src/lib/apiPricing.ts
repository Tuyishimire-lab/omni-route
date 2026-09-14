/**
 * CiteRoute API Pricing & Metering Configuration
 *
 * Defines per-call costs and credit units for overage billing:
 * - /api/v1/verify:     $0.01 / call (1 credit unit)
 * - /api/v1/geo-score:  $0.02 / call (2 credit units)
 * - /api/v1/scan:       $0.02 / call (2 credit units)
 * - /api/v1/ai-traffic: $0.05 / call (5 credit units)
 *
 * LemonSqueezy Metered Variant unit price is set to $0.01 per unit.
 * 1 credit unit = $0.01 USD.
 */

export interface EndpointCost {
  pathname: string;
  priceCents: number;
  credits: number;
  description: string;
}

export const ENDPOINT_PRICING: Record<string, EndpointCost> = {
  '/api/v1/verify': {
    pathname: '/api/v1/verify',
    priceCents: 1,
    credits: 1,
    description: 'Verify tracking tag or agent.json installation',
  },
  '/api/v1/geo-score': {
    pathname: '/api/v1/geo-score',
    priceCents: 2,
    credits: 2,
    description: 'Full GEO audit of any domain - scores, citations, agent discoverability',
  },
  '/api/v1/scan': {
    pathname: '/api/v1/scan',
    priceCents: 2,
    credits: 2,
    description: 'Live crawler scan and AI visibility analysis',
  },
  '/api/v1/ai-traffic': {
    pathname: '/api/v1/ai-traffic',
    priceCents: 5,
    credits: 5,
    description: 'AI crawler visit volume and breakdown for a tracked domain',
  },
};

const DEFAULT_COST: EndpointCost = {
  pathname: 'default',
  priceCents: 2,
  credits: 2,
  description: 'Standard CiteRoute REST API Call',
};

/**
 * Resolves the per-call price and credits for a given request path.
 */
export function getEndpointPricing(pathname: string): EndpointCost {
  const normalized = pathname.split('?')[0].replace(/\/+$/, '');
  return ENDPOINT_PRICING[normalized] || DEFAULT_COST;
}

/**
 * Formats a cent amount into USD string, e.g. 50 -> "$0.50", 100 -> "$1.00", 2 -> "$0.02".
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
