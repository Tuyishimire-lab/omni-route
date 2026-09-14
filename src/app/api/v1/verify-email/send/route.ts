import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimiter';
import { sendVerificationCodeEmail } from '../../../../../lib/email';

/** Generate a cryptographically random 6-digit numeric code */
function generateCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, '0');
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Parse body while rate limit checks run (non-blocking)
    const bodyPromise = req.json().catch(() => ({}));

    // Run both rate limit checks in parallel (biggest latency win)
    const [ipRate, body] = await Promise.all([
      checkRateLimit(ip, 'verify-email:send', 60_000, 5),
      bodyPromise as Promise<{ email?: string }>,
    ]);

    if (!ipRate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(ipRate.retryAfter ?? 60) } }
      );
    }

    const email = body.email?.toLowerCase().trim();
    if (!email || !email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    // Per-email rate limit (runs after validation to avoid wasting quota on bad input)
    const emailRate = await checkRateLimit(`email:${email}`, 'verify-email:send', 10 * 60_000, 3);
    if (!emailRate.allowed) {
      return NextResponse.json(
        { error: 'Verification code already sent. Check your inbox or wait a few minutes.' },
        { status: 429 }
      );
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up old codes AND store new code in parallel
    await Promise.all([
      prisma.emailVerification.deleteMany({ where: { email, verified: false } }),
      prisma.emailVerification.create({ data: { email, code, expiresAt } }),
    ]);

    // Fire-and-forget: code is stored, respond immediately.
    // Email delivery is best-effort - the user can always click "Resend".
    sendVerificationCodeEmail({ to: email, code }).catch((err) => {
      console.error('[verify-email/send] Email dispatch failed:', err);
    });

    return NextResponse.json({ success: true, message: 'Verification code sent.' });
  } catch (error: unknown) {
    console.error('[verify-email/send] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to process verification request.' },
      { status: 500 }
    );
  }
}

