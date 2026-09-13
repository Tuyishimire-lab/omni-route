import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { createPasswordResetToken } from '../../../../lib/auth';
import { sendPasswordResetEmail } from '../../../../lib/email';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit: 5 requests per 15 minutes per IP
    const ipCheck = await checkRateLimit(ip, 'forgot-password', 15 * 60_000, 5);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please wait a few minutes before trying again.' },
        { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfter ?? 900) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = rawEmail.toLowerCase();

    // Rate limit per email address: 3 requests per 15 minutes
    const emailCheck = await checkRateLimit(
      `forgot:${normalizedEmail}`,
      'forgot-password',
      15 * 60_000,
      3
    );
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests for this email address. Please check your inbox or try again later.' },
        { status: 429, headers: { 'Retry-After': String(emailCheck.retryAfter ?? 900) } }
      );
    }

    // Lookup user in DB
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      // Create single-use 30m signed token
      const token = await createPasswordResetToken(user);

      // Determine application base URL
      const forwardedHost = req.headers.get('x-forwarded-host');
      const hostHeader = req.headers.get('host');
      const host = forwardedHost || hostHeader || 'localhost:3000';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const proto = isLocal ? 'http' : 'https';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

      // Send transactional reset email via Resend
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        userName: user.name,
      });
    }

    // Constant response to prevent user enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (err: unknown) {
    console.error('[auth/forgot-password] Error:', err);
    return NextResponse.json(
      { error: 'Unable to process password reset request. Please try again later.' },
      { status: 500 }
    );
  }
}
