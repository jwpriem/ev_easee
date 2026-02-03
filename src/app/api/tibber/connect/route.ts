import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { encryptToken } from '@/lib/easee';
import { fetchTibberPrices } from '@/lib/tibber';
import getDb from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    const trimmedToken = token.trim();

    // Validate the token by making a test API call
    try {
      await fetchTibberPrices(trimmedToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token. Please check your Tibber personal access token and try again.' },
        { status: 400 }
      );
    }

    const encryptedToken = encryptToken(trimmedToken);

    const sql = getDb();
    await sql`
      INSERT INTO tibber_connections (user_id, encrypted_access_token, updated_at)
      VALUES (${session.userId}, ${encryptedToken}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        encrypted_access_token = ${encryptedToken},
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tibber connect error:', error);
    return NextResponse.json(
      { error: 'Failed to save Tibber token' },
      { status: 500 }
    );
  }
}
