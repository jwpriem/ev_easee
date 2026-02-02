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
    const vehicles = await sql`
      SELECT id, brand, model, nickname, vin, region, created_at
      FROM vehicles
      WHERE user_id = ${session.userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json(
      { error: 'Failed to get vehicles' },
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
      model,
      nickname,
      vin,
      encryptedToken,
      encryptedRefreshToken,
      region = 'EU',
      externalUserId
    } = await request.json();

    if (!brand || !nickname) {
      return NextResponse.json(
        { error: 'Brand and nickname are required' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO vehicles (
        user_id, brand, model, nickname, vin,
        encrypted_token, encrypted_refresh_token, region, external_user_id
      )
      VALUES (
        ${session.userId}, ${brand}, ${model || null}, ${nickname}, ${vin || null},
        ${encryptedToken || null}, ${encryptedRefreshToken || null}, ${region}, ${externalUserId || null}
      )
      RETURNING id, brand, model, nickname, vin, region, created_at
    `;

    return NextResponse.json({
      success: true,
      vehicle: result[0]
    });
  } catch (error) {
    console.error('Save vehicle error:', error);
    return NextResponse.json(
      { error: 'Failed to save vehicle' },
      { status: 500 }
    );
  }
}
