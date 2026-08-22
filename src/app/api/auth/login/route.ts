import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '../../../../lib/auth';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // P0-5: Rate limit by IP - 10 attempts per 15 minutes
    const ipCheck = await checkRateLimit(ip, 'login', 15 * 60_000, 10);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfter ?? 900) } }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // P0-5: Also rate limit per email address - 5 attempts per 15 minutes
    // This catches distributed brute force from multiple IPs targeting one account.
    const emailCheck = await checkRateLimit(
      `email:${String(email).toLowerCase().trim()}`,
      'login',
      15 * 60_000,
      5
    );
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts for this account. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(emailCheck.retryAfter ?? 900) } }
      );
    }

    const result = await loginUser(email, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err) {
    console.error('[auth/login] Error:', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
