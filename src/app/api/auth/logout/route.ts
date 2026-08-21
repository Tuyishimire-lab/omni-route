import { NextResponse } from 'next/server';
import { destroySession } from '../../../../lib/auth';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[auth/logout] Error:', err);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
