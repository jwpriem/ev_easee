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
      SELECT id, created_at, updated_at
      FROM tibber_connections
      WHERE user_id = ${session.userId}
    `;

    return NextResponse.json({ connected: rows.length > 0 });
  } catch (error) {
    console.error('Tibber status error:', error);
    return NextResponse.json(
      { error: 'Failed to check Tibber connection status' },
      { status: 500 }
    );
  }
}
