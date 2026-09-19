import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';
import {
  verifyEmailVerificationToken,
  verifyEmailVerificationOtp,
  issueAndSendVerification,
} from '../../../../lib/emailVerification';
import { getSession, setSessionCookie } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com';

    if (!token) {
      return NextResponse.redirect(new URL('/verify-email?error=Missing+verification+token', req.url));
    }

    const verification = await verifyEmailVerificationToken(token);

    if (!verification.valid || !verification.userId) {
      const errorMsg = encodeURIComponent(verification.error || 'Invalid or expired verification link.');
      return NextResponse.redirect(new URL(`/verify-email?error=${errorMsg}`, req.url));
    }

    // If there is an active session or we can fetch the user, update the session cookie
    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        avatarUrl: true,
        tokenVersion: true,
      },
    });

    if (user) {
      await setSessionCookie({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.role === 'admin' ? 'enterprise' : user.tier,
        avatarUrl: user.avatarUrl,
        emailVerified: true,
        tokenVersion: user.tokenVersion,
      });
    }

    return NextResponse.redirect(new URL('/verify-email?verified=1', req.url));
  } catch (err: unknown) {
    console.error('[auth/verify-email:GET] Error:', err);
    return NextResponse.redirect(new URL('/verify-email?error=Failed+to+verify+link', req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || (body.code ? 'verify_code' : 'resend');

    if (action === 'resend') {
      const email = body.email?.toLowerCase().trim();
      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
      }

      // Rate limit: 3 resends per email per 10 minutes
      const emailRate = await checkRateLimit(`resend:${email}`, 'verify-email:resend', 10 * 60_000, 3);
      if (!emailRate.allowed) {
        return NextResponse.json(
          { error: 'Verification email already sent. Please wait a few minutes before requesting another.' },
          { status: 429, headers: { 'Retry-After': String(emailRate.retryAfter ?? 600) } }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, provider: true },
      });

      if (!user) {
        // Do not reveal email existence - return success response
        return NextResponse.json({
          success: true,
          message: 'If an account exists, a new verification link has been dispatched.',
        });
      }

      if (user.provider !== 'email') {
        return NextResponse.json({
          success: true,
          message: 'Account is pre-verified via identity provider.',
        });
      }

      await issueAndSendVerification(user.id, user.email, user.name);

      return NextResponse.json({
        success: true,
        message: 'A fresh verification link and code have been sent to your email address.',
      });
    }

    if (action === 'verify_code') {
      const email = body.email?.toLowerCase().trim();
      const code = body.code?.trim();

      if (!email || !code) {
        return NextResponse.json({ error: 'Email and 6-digit code are required.' }, { status: 400 });
      }

      // Rate limit attempts: 5 per 10 minutes per IP
      const rate = await checkRateLimit(ip, 'verify-email:code-attempt', 10 * 60_000, 5);
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Please request a new code.' },
          { status: 429 }
        );
      }

      const result = await verifyEmailVerificationOtp(email, code);

      if (!result.valid) {
        return NextResponse.json({ error: result.error || 'Invalid or expired verification code.' }, { status: 400 });
      }

      // Update session cookie if user is currently signed in
      const session = await getSession();
      if (session && session.email.toLowerCase() === email) {
        await setSessionCookie({
          ...session,
          emailVerified: true,
        });
      } else if (result.userId) {
        const user = await prisma.user.findUnique({
          where: { id: result.userId },
          select: { id: true, email: true, name: true, role: true, tier: true, avatarUrl: true, tokenVersion: true },
        });
        if (user) {
          await setSessionCookie({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tier: user.role === 'admin' ? 'enterprise' : user.tier,
            avatarUrl: user.avatarUrl,
            emailVerified: true,
            tokenVersion: user.tokenVersion,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Account activated successfully. You now have full access to CiteRoute.',
      });
    }

    return NextResponse.json({ error: 'Unsupported verification action.' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[auth/verify-email:POST] Error:', err);
    return NextResponse.json({ error: 'Failed to process verification request.' }, { status: 500 });
  }
}
