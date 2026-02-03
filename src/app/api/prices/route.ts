import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchTibberPrices } from '@/lib/tibber';
import { decryptToken } from '@/lib/easee';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT encrypted_access_token
      FROM tibber_connections
      WHERE user_id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Tibber not connected. Please add your personal access token first.' },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(rows[0].encrypted_access_token);
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
