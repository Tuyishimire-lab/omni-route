import { NextRequest, NextResponse } from 'next/server';

// Redirect to GitHub OAuth authorization
export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' }, { status: 501 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
