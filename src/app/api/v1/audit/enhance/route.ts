import { NextRequest, NextResponse } from 'next/server';
import { enhanceAuditReportWithAi } from '@/lib/aiReportEnhancer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { GeoAuditReport } from '@/lib/types';
import { isAiEngineConfigured } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'ai-enhance', 60_000, 20);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for report enhancement. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) } }
      );
    }

    if (!isAiEngineConfigured()) {
      return NextResponse.json(
        { error: 'CiteRoute Engine is not available on this instance. Please contact support or verify server configuration.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const report = body?.report as GeoAuditReport | undefined;

    if (!report || !report.domain) {
      return NextResponse.json(
        { error: 'A valid GeoAuditReport object is required in the request body.' },
        { status: 400 }
      );
    }

    const enhanced = await enhanceAuditReportWithAi(report, body?.pageContent);

    return NextResponse.json({
      success: true,
      data: enhanced,
      modelUsed: enhanced.aiInsights?.modelUsed || 'fallback',
    });
  } catch (error: unknown) {
    console.error('[audit/enhance POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI report enhancements.' },
      { status: 500 }
    );
  }
}
