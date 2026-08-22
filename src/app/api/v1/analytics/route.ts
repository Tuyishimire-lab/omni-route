import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsSummary } from '../../../../lib/db';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const summary = await getAnalyticsSummary();
    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, source, domain, destinationUrl, intent, geoScoreAtTime, settlementValue } = body;

    if (!domain || !source) {
      return NextResponse.json({ success: false, error: 'Domain and source required' }, { status: 400 });
    }

    const event = await prisma.telemetryEvent.create({
      data: {
        type: type || 'GEO_INDEX_PING',
        source,
        domain,
        destinationUrl: destinationUrl || `https://${domain}`,
        intent: intent || 'Citation Extraction',
        geoScoreAtTime: geoScoreAtTime || 85,
        settlementValue: settlementValue ? parseFloat(settlementValue) : null,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record telemetry' },
      { status: 500 }
    );
  }
}
