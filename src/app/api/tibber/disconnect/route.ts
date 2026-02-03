import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import getDb from '@/lib/db';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    await sql`
      DELETE FROM tibber_connections
      WHERE user_id = ${session.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tibber disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Tibber' },
      { status: 500 }
    );
  }
}
