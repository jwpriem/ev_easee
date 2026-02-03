import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, token_expires_at, created_at, updated_at
      FROM tibber_connections
      WHERE user_id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ connected: false });
    }

    const connection = rows[0];
    const isExpired = connection.token_expires_at
      ? new Date(connection.token_expires_at) < new Date()
      : false;

    return NextResponse.json({
      connected: true,
      expired: isExpired,
      connectedAt: connection.created_at,
      updatedAt: connection.updated_at,
    });
  } catch (error) {
    console.error('Tibber status error:', error);
    return NextResponse.json(
      { error: 'Failed to check Tibber connection status' },
      { status: 500 }
    );
  }
}
