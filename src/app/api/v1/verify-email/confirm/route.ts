import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimiter';

const VERIFIED_EMAIL_COOKIE = 'citeroute_verified_email';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Brute-force protection: 10 confirm attempts per IP per 10 minutes
    const ipRate = await checkRateLimit(ip, 'verify-email:confirm', 10 * 60_000, 10);
    if (!ipRate.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(ipRate.retryAfter ?? 60) } }
      );
    }

    let body: { email?: string; code?: string } = {};
    try { body = await req.json(); } catch { body = {}; }

    const email = body.email?.toLowerCase().trim();
    const code = body.code?.trim();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    // Per-email brute-force: 5 attempts per email per 10 minutes
    const emailRate = await checkRateLimit(`email:${email}`, 'verify-email:confirm', 10 * 60_000, 5);
    if (!emailRate.allowed) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Look up the code
    const record = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        verified: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark as verified
    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    // Set cookie so user doesn't need to re-verify
    const response = NextResponse.json({ success: true, email });
    response.cookies.set(VERIFIED_EMAIL_COOKIE, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('[verify-email/confirm] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to verify code.' },
      { status: 500 }
    );
  }
}
