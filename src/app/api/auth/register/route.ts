import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password } = body;

    const result = await registerUser(email, name, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (err) {
    console.error('[auth/register] Error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
