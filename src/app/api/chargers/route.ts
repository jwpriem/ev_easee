import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const chargers = await sql`
      SELECT id, brand, name, charger_id, created_at
      FROM chargers
      WHERE user_id = ${session.userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ chargers });
  } catch (error) {
    console.error('Get chargers error:', error);
    return NextResponse.json(
      { error: 'Failed to get chargers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      brand,
      name,
      chargerId,
      encryptedAccessToken,
      encryptedRefreshToken,
    } = await request.json();

    if (!brand || !name) {
      return NextResponse.json(
        { error: 'Brand and name are required' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO chargers (
        user_id, brand, name, charger_id,
        encrypted_access_token, encrypted_refresh_token
      )
      VALUES (
        ${session.userId}, ${brand}, ${name}, ${chargerId || null},
        ${encryptedAccessToken || null}, ${encryptedRefreshToken || null}
      )
      RETURNING id, brand, name, charger_id, created_at
    `;

    return NextResponse.json({
      success: true,
      charger: result[0]
    });
  } catch (error) {
    console.error('Save charger error:', error);
    return NextResponse.json(
      { error: 'Failed to save charger' },
      { status: 500 }
    );
  }
}
