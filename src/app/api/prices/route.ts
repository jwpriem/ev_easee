import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchTibberPrices, refreshAccessToken } from '@/lib/tibber';
import { decryptToken, encryptToken } from '@/lib/easee';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT encrypted_access_token, encrypted_refresh_token, token_expires_at
      FROM tibber_connections
      WHERE user_id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Tibber not connected. Please connect your Tibber account first.' },
        { status: 400 }
      );
    }

    const connection = rows[0];
    let accessToken = decryptToken(connection.encrypted_access_token);

    // Check if token is expired and try to refresh
    const isExpired = connection.token_expires_at
      ? new Date(connection.token_expires_at) < new Date()
      : false;

    if (isExpired && connection.encrypted_refresh_token) {
      try {
        const refreshToken = decryptToken(connection.encrypted_refresh_token);
        const tokenResponse = await refreshAccessToken(refreshToken);

        accessToken = tokenResponse.access_token;
        const encryptedAccessToken = encryptToken(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
          ? encryptToken(tokenResponse.refresh_token)
          : connection.encrypted_refresh_token;
        const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

        await sql`
          UPDATE tibber_connections
          SET encrypted_access_token = ${encryptedAccessToken},
              encrypted_refresh_token = ${encryptedRefreshToken},
              token_expires_at = ${expiresAt.toISOString()},
              updated_at = NOW()
          WHERE user_id = ${session.userId}
        `;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          { error: 'Tibber token expired. Please reconnect your Tibber account.' },
          { status: 401 }
        );
      }
    }

    const prices = await fetchTibberPrices(accessToken);
    return NextResponse.json(prices);
  } catch (error) {
    console.error('Tibber prices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
