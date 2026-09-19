import { NextRequest, NextResponse } from 'next/server';
import { generateAgentManifestWithAi } from '@/lib/aiManifestGenerator';
import { isAiEngineConfigured } from '@/lib/openrouter';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

/**
 * POST /api/v1/tools/generate-manifest
 * Crawls a domain via Jina Reader and generates a complete agent.json with AI.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = await checkRateLimit(ip, 'generate-manifest', 5, 300_000); // 5 per 5 min
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before generating another manifest.' },
        { status: 429 }
      );
    }

    if (!isAiEngineConfigured()) {
      return NextResponse.json(
        { error: 'CiteRoute Engine is not available on this instance.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const domain = (body.domain || '').trim().replace(/^https?:\/\//, '').split('/')[0].toLowerCase();

    if (!domain || !domain.includes('.')) {
      return NextResponse.json({ error: 'A valid domain is required.' }, { status: 400 });
    }

    // Crawl the site via Jina Reader
    const jinaUrl = `https://r.jina.ai/https://${domain}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    let markdown = '';
    let title = '';
    let description = '';

    try {
      const jinaRes = await fetch(jinaUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'markdown',
          'X-No-Cache': 'true',
        },
      });
      clearTimeout(timer);

      if (jinaRes.ok) {
        const json = await jinaRes.json();
        markdown = json.data?.content || json.data?.text || '';
        title = json.data?.title || '';
        description = json.data?.description || '';
      }
    } catch {
      clearTimeout(timer);
    }

    if (!markdown || markdown.length < 50) {
      return NextResponse.json(
        { error: `Could not crawl ${domain}. Make sure the site is accessible.` },
        { status: 422 }
      );
    }

    const manifest = await generateAgentManifestWithAi(domain, markdown, { title, description });

    if (!manifest) {
      return NextResponse.json(
        { error: 'CiteRoute Engine could not generate a manifest. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, manifest });
  } catch (error) {
    console.error('[generate-manifest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
