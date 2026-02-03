import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { buildAuthorizationUrl, createOAuthState } from '@/lib/tibber';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const origin = url.origin;
    const redirectUri = `${origin}/api/tibber/callback`;

    const { state, codeVerifier } = createOAuthState();

    // Store state and code_verifier in cookies for verification in callback
    const cookieStore = await cookies();
    cookieStore.set('tibber_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    cookieStore.set('tibber_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    const authUrl = buildAuthorizationUrl(redirectUri, state, codeVerifier);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Tibber authorize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start authorization';
    return NextResponse.redirect(new URL(`/prices?error=${encodeURIComponent(message)}`, request.url));
  }
}
