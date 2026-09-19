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

    const body = await req.json().catch(() => ({}));
    const { email, name, password, hp_website_trap, formRenderTimestamp, turnstileToken } = body;

    // 1. Anti-Bot: Honeypot Trap
    if (hp_website_trap) {
      console.warn(`[auth/register] Honeypot triggered by IP ${ip}`);
      return NextResponse.json({ error: 'Automated registration detected.' }, { status: 400 });
    }

    // 2. Anti-Bot: Timing Entropy Challenge (Submissions under 800ms indicate automated bots)
    if (formRenderTimestamp && typeof formRenderTimestamp === 'number') {
      const elapsed = Date.now() - formRenderTimestamp;
      if (elapsed < 800) {
        console.warn(`[auth/register] Timing anomaly (${elapsed}ms) by IP ${ip}`);
        return NextResponse.json({ error: 'Automated script detected. Please submit manually.' }, { status: 400 });
      }
    }

    // 3. Optional Cloudflare Turnstile verification if secret key is configured
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && turnstileToken) {
      try {
        const formData = new URLSearchParams();
        formData.append('secret', turnstileSecret);
        formData.append('response', turnstileToken);
        formData.append('remoteip', ip);

        const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData,
        });
        const cfData = await cfRes.json();
        if (!cfData.success) {
          return NextResponse.json({ error: 'CAPTCHA verification failed. Please refresh and try again.' }, { status: 400 });
        }
      } catch (cfErr) {
        console.error('[auth/register] Turnstile verification error:', cfErr);
      }
    }

    const result = await registerUser(email, name, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      requiresVerification: true,
    });
  } catch (err) {
    console.error('[auth/register] Error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
