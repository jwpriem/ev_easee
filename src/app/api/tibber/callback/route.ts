import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDb from '@/lib/db';
import { getSession } from '@/lib/session';
import { exchangeCodeForTokens } from '@/lib/tibber';
import { encryptToken } from '@/lib/easee';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/prices?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/prices?error=Missing+authorization+code', request.url)
      );
    }

    // Verify state
    const cookieStore = await cookies();
    const savedState = cookieStore.get('tibber_oauth_state')?.value;
    const codeVerifier = cookieStore.get('tibber_code_verifier')?.value;

    // Clean up cookies
    cookieStore.delete('tibber_oauth_state');
    cookieStore.delete('tibber_code_verifier');

    if (!savedState || state !== savedState) {
      return NextResponse.redirect(
        new URL('/prices?error=Invalid+state+parameter', request.url)
      );
    }

    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL('/prices?error=Missing+code+verifier', request.url)
      );
    }

    // Exchange code for tokens
    const origin = url.origin;
    const redirectUri = `${origin}/api/tibber/callback`;

    const tokenResponse = await exchangeCodeForTokens(code, redirectUri, codeVerifier);

    // Encrypt and store tokens
    const encryptedAccessToken = encryptToken(tokenResponse.access_token);
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encryptToken(tokenResponse.refresh_token)
      : null;

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    const sql = getDb();
    await sql`
      INSERT INTO tibber_connections (user_id, encrypted_access_token, encrypted_refresh_token, token_expires_at, updated_at)
      VALUES (${session.userId}, ${encryptedAccessToken}, ${encryptedRefreshToken}, ${expiresAt.toISOString()}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        encrypted_access_token = ${encryptedAccessToken},
        encrypted_refresh_token = ${encryptedRefreshToken},
        token_expires_at = ${expiresAt.toISOString()},
        updated_at = NOW()
    `;

    return NextResponse.redirect(new URL('/prices?connected=true', request.url));
  } catch (error) {
    console.error('Tibber callback error:', error);
    const message = error instanceof Error ? error.message : 'Authorization failed';
    return NextResponse.redirect(
      new URL(`/prices?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
