import { NextRequest, NextResponse } from 'next/server';
import { upsertOAuthUser } from '../../../../../lib/auth';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error('[GitHub OAuth] Token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=token_failed', req.url));
    }

    // Get user profile
    const profileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // Get primary email (may not be public)
    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const emails = await emailsRes.json();
      const primary = emails.find((e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified);
      email = primary?.email;
    }

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', req.url));
    }

    const result = await upsertOAuthUser({
      email,
      name: profile.name || profile.login,
      avatarUrl: profile.avatar_url || null,
      provider: 'github',
      providerId: String(profile.id),
    });

    if (!result.success) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || 'unknown')}`, req.url));
    }

    return NextResponse.redirect(new URL('/', req.url));
  } catch (err) {
    console.error('[GitHub OAuth] Callback error:', err);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url));
  }
}
