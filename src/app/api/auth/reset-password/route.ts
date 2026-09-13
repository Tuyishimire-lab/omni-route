import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { hashPassword, verifyPasswordResetToken } from '../../../../lib/auth';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Reset token is required.' }, { status: 400 });
    }

    const verification = await verifyPasswordResetToken(token);
    if (!verification.valid) {
      return NextResponse.json({ valid: false, error: verification.error }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    console.error('[auth/reset-password:GET] Error:', err);
    return NextResponse.json({ valid: false, error: 'Failed to verify reset token.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit: 10 attempts per 15 minutes per IP
    const ipCheck = await checkRateLimit(ip, 'reset-password', 15 * 60_000, 10);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfter ?? 900) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'A valid password reset token is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'New password is required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Password cannot exceed 128 characters.' },
        { status: 400 }
      );
    }

    // Verify token validity, signature, expiration, and single-use state
    const verification = await verifyPasswordResetToken(token);
    if (!verification.valid || !verification.userId) {
      return NextResponse.json(
        { error: verification.error || 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt (work factor 12)
    const newHash = await hashPassword(password);

    // Update password hash in database
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        passwordHash: newHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You can now sign in.',
    });
  } catch (err: unknown) {
    console.error('[auth/reset-password:POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
