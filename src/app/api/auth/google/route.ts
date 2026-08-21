import { NextRequest, NextResponse } from 'next/server';

// Redirect to Google OAuth consent screen
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' }, { status: 501 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
