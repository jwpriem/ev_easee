import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/session';
import { EaseeClient, encryptToken } from '@/lib/easee';

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

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chargerId, username, password } = await request.json();

    if (!chargerId || !username || !password) {
      return NextResponse.json(
        { error: 'Charger ID, username, and password are required' },
        { status: 400 }
      );
    }

    const sql = getDb();

    const chargers = await sql`
      SELECT id FROM chargers
      WHERE id = ${chargerId} AND user_id = ${session.userId}
    `;
    if (chargers.length === 0) {
      return NextResponse.json({ error: 'Charger not found' }, { status: 404 });
    }

    const client = new EaseeClient();
    const loginResult = await client.login(username, password);

    if (!loginResult.success) {
      return NextResponse.json(
        { error: loginResult.error || 'Failed to connect to Easee' },
        { status: 401 }
      );
    }

    const encryptedAccessToken = loginResult.accessToken ? encryptToken(loginResult.accessToken) : null;
    const encryptedRefreshToken = loginResult.refreshToken ? encryptToken(loginResult.refreshToken) : null;

    await sql`
      UPDATE chargers
      SET encrypted_access_token = ${encryptedAccessToken},
          encrypted_refresh_token = ${encryptedRefreshToken}
      WHERE id = ${chargerId} AND user_id = ${session.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reconnect charger error:', error);
    return NextResponse.json(
      { error: 'Failed to reconnect charger' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chargerId } = await request.json();

    if (!chargerId) {
      return NextResponse.json(
        { error: 'Charger ID is required' },
        { status: 400 }
      );
    }

    const sql = getDb();

    await sql`
      DELETE FROM charging_schemas
      WHERE charger_id = ${chargerId} AND user_id = ${session.userId}
    `;

    const result = await sql`
      DELETE FROM chargers
      WHERE id = ${chargerId} AND user_id = ${session.userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Charger not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete charger error:', error);
    return NextResponse.json(
      { error: 'Failed to delete charger' },
      { status: 500 }
    );
  }
}
