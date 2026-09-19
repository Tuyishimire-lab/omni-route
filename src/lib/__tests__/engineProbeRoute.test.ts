import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/v1/engine-probe/route';
import * as rateLimiter from '../rateLimiter';
import * as citationProber from '../citationProber';

describe('POST /api/v1/engine-probe', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects with 429 when rate limit is exceeded', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetMs: 30000,
      retryAfter: 30,
    });

    const req = new NextRequest('http://localhost:3000/api/v1/engine-probe', {
      method: 'POST',
      body: JSON.stringify({ domain: 'stripe.com' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain('Rate limit exceeded');
  });

  it('rejects with 400 when body is invalid or domain is missing', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });

    const req = new NextRequest('http://localhost:3000/api/v1/engine-probe', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('domain is required');
  });

  it('rejects with 400 for an invalid domain', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });

    const req = new NextRequest('http://localhost:3000/api/v1/engine-probe', {
      method: 'POST',
      body: JSON.stringify({ domain: 'not a valid url' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('dispatches probeAllEngines and returns engines on valid domain', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });

    const mockResults: any[] = [
      {
        engine: 'perplexity',
        name: 'Perplexity Pro / Sonar',
        score: 88,
        citationProbability: 85,
        sentimentRating: 'High Authority',
        isLiveQuery: true,
        probeQuery: 'What is stripe.com?',
        isCited: true,
        citationSnippet: 'Stripe is an industry-standard payments provider.',
        latencyMs: 820,
        testedAt: new Date().toISOString(),
      },
    ];

    vi.spyOn(citationProber, 'probeAllEngines').mockResolvedValue(mockResults);

    const req = new NextRequest('http://localhost:3000/api/v1/engine-probe', {
      method: 'POST',
      body: JSON.stringify({ domain: 'stripe.com' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.domain).toBe('stripe.com');
    expect(json.engines).toHaveLength(1);
    expect(json.engines[0].isCited).toBe(true);
  });

  it('dispatches single engine probe when engine field is specified', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });

    const mockResult: any = {
      engine: 'chatgpt',
      name: 'OpenAI GPT-4o Search',
      score: 90,
      citationProbability: 88,
      sentimentRating: 'High Authority',
      isLiveQuery: true,
      probeQuery: 'custom query',
      isCited: true,
      citationSnippet: 'OpenAI cites stripe.com.',
      latencyMs: 910,
      testedAt: new Date().toISOString(),
    };

    vi.spyOn(citationProber, 'probeSingleEngine').mockResolvedValue(mockResult);

    const req = new NextRequest('http://localhost:3000/api/v1/engine-probe', {
      method: 'POST',
      body: JSON.stringify({ domain: 'stripe.com', query: 'best payment api', engine: 'chatgpt' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.engines).toHaveLength(1);
    expect(json.engines[0].engine).toBe('chatgpt');
    expect(citationProber.probeSingleEngine).toHaveBeenCalled();
  });
});
