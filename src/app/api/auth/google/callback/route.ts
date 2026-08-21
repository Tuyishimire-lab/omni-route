import { NextRequest, NextResponse } from 'next/server';
import { upsertOAuthUser } from '../../../../../lib/auth';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error('[Google OAuth] Token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=token_failed', req.url));
    }

    // Get user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', req.url));
    }

    // Upsert user and set session
    const result = await upsertOAuthUser({
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      avatarUrl: profile.picture || null,
      provider: 'google',
      providerId: profile.id,
    });

    if (!result.success) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || 'unknown')}`, req.url));
    }

    return NextResponse.redirect(new URL('/', req.url));
  } catch (err) {
    console.error('[Google OAuth] Callback error:', err);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url));
  }
}
