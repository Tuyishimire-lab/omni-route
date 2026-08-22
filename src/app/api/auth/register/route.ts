import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '../../../../lib/auth';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Limit registrations to 5 per IP per hour - blocks account factory abuse
    const rateCheck = await checkRateLimit(ip, 'register', 60 * 60_000, 5);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 3600) } }
      );
    }

    const body = await req.json();
    const { email, name, password } = body;

    const result = await registerUser(email, name, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err) {
    console.error('[auth/register] Error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
