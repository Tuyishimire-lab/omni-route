import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function isAdminAuthorized(): Promise<boolean> {
  const session = await getSession();
  return session?.role === 'admin';
}

// GET /api/admin/inquiries - List all enterprise leads + counts
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
        { product: { contains: search } },
      ];
    }

    const [inquiries, totalCount, pendingCount, contactedCount, qualifiedCount, closedCount] = await Promise.all([
      prisma.enterpriseInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.enterpriseInquiry.count(),
      prisma.enterpriseInquiry.count({ where: { status: 'pending' } }),
      prisma.enterpriseInquiry.count({ where: { status: 'contacted' } }),
      prisma.enterpriseInquiry.count({ where: { status: 'qualified' } }),
      prisma.enterpriseInquiry.count({ where: { status: 'closed' } }),
    ]);

    return NextResponse.json({
      success: true,
      inquiries: inquiries.map((inq) => ({
        ...inq,
        createdAt: inq.createdAt.toISOString(),
        updatedAt: inq.updatedAt.toISOString(),
      })),
      stats: {
        total: totalCount,
        pending: pendingCount,
        contacted: contactedCount,
        qualified: qualifiedCount,
        closed: closedCount,
      },
    });
  } catch (err: unknown) {
    console.error('[admin/inquiries] GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve enterprise inquiries' }, { status: 500 });
  }
}

// PATCH /api/admin/inquiries - Update inquiry status
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, status } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Inquiry ID is required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'contacted', 'qualified', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await prisma.enterpriseInquiry.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      inquiry: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error('[admin/inquiries] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 });
  }
}
