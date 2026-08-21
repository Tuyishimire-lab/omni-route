import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const result = await loginUser(email, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (err) {
    console.error('[auth/login] Error:', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
