import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { domain?: string };
  const domain = body.domain?.trim() ?? '';
  if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 });

  await prisma.registeredSite.deleteMany({ where: { userId: session.userId, domain } });
  return NextResponse.json({ success: true });
}
