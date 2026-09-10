import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  // Single scan lookup (e.g. for raw report inspection)
  const id = searchParams.get('id');
  if (id) {
    const scan = await prisma.scanEvent.findUnique({
      where: { id },
      include: {
        domainRef: true,
      },
    });
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
    return NextResponse.json({ scan });
  }

  // Filters
  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status')?.trim().toUpperCase() || '';
  const isLiveScanParam = searchParams.get('isLiveScan');
  const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined;
  const maxScore = searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!, 10) : undefined;
  const format = searchParams.get('format');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ScanEventWhereInput = {};

  if (search) {
    where.domain = { contains: search };
  }

  if (status && ['OPTIMAL', 'MODERATE', 'AT_RISK'].includes(status)) {
    where.status = status;
  }

  if (isLiveScanParam === 'true') {
    where.isLiveScan = true;
  } else if (isLiveScanParam === 'false') {
    where.isLiveScan = false;
  }

  if (minScore !== undefined || maxScore !== undefined) {
    where.geoScore = {};
    if (minScore !== undefined && !isNaN(minScore)) where.geoScore.gte = minScore;
    if (maxScore !== undefined && !isNaN(maxScore)) where.geoScore.lte = maxScore;
  }

  // Handle CSV export
  if (format === 'csv') {
    const allScans = await prisma.scanEvent.findMany({
      where,
      orderBy: { scannedAt: 'desc' },
      take: 2000, // safety cap for single export
      select: {
        id: true,
        domain: true,
        scannedAt: true,
        geoScore: true,
        status: true,
        citationRate: true,
        zeroClickResilience: true,
        infoGainScore: true,
        entityScore: true,
        vectorReadiness: true,
        isLiveScan: true,
      },
    });

    const headers = [
      'Scan ID',
      'Domain',
      'Scanned At (UTC)',
      'GEO Score',
      'Status',
      'Citation Rate (%)',
      'Zero-Click Resilience (%)',
      'Info Gain Score',
      'Entity Score',
      'Vector Readiness',
      'Scan Type',
    ];

    const rows = allScans.map((s) => [
      s.id,
      s.domain,
      s.scannedAt.toISOString(),
      s.geoScore,
      s.status,
      s.citationRate,
      s.zeroClickResilience,
      s.infoGainScore,
      s.entityScore,
      s.vectorReadiness,
      s.isLiveScan ? 'Live User Scan' : 'Automated Cron Rescan',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="citeroute-scans-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Paginated JSON response with aggregate stats
  const [total, scans, optimalCount, moderateCount, atRiskCount] = await Promise.all([
    prisma.scanEvent.count({ where }),
    prisma.scanEvent.findMany({
      where,
      orderBy: { scannedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        domain: true,
        scannedAt: true,
        geoScore: true,
        status: true,
        citationRate: true,
        zeroClickResilience: true,
        infoGainScore: true,
        entityScore: true,
        vectorReadiness: true,
        isLiveScan: true,
      },
    }),
    prisma.scanEvent.count({ where: { ...where, status: 'OPTIMAL' } }),
    prisma.scanEvent.count({ where: { ...where, status: 'MODERATE' } }),
    prisma.scanEvent.count({ where: { ...where, status: 'AT_RISK' } }),
  ]);

  return NextResponse.json({
    scans,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      totalMatching: total,
      optimalCount,
      moderateCount,
      atRiskCount,
    },
  });
}
