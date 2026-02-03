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
    const schemas = await sql`
      SELECT cs.id, cs.charger_id, cs.max_price, cs.enabled, cs.updated_at,
             c.name as charger_name, c.charger_id as easee_charger_id, c.brand
      FROM charging_schemas cs
      JOIN chargers c ON c.id = cs.charger_id
      WHERE cs.user_id = ${session.userId}
      ORDER BY cs.created_at DESC
    `;

    return NextResponse.json(schemas);
  } catch (error) {
    console.error('Get schemas error:', error);
    return NextResponse.json({ error: 'Failed to fetch schemas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chargerId, maxPrice } = await request.json();

    if (!chargerId || maxPrice === undefined || maxPrice === null) {
      return NextResponse.json({ error: 'Charger and max price are required' }, { status: 400 });
    }

    const price = parseFloat(maxPrice);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Max price must be a positive number' }, { status: 400 });
    }

    const sql = getDb();

    // Verify the charger belongs to this user
    const chargers = await sql`
      SELECT id FROM chargers WHERE id = ${chargerId} AND user_id = ${session.userId}
    `;
    if (chargers.length === 0) {
      return NextResponse.json({ error: 'Charger not found' }, { status: 404 });
    }

    const result = await sql`
      INSERT INTO charging_schemas (user_id, charger_id, max_price, updated_at)
      VALUES (${session.userId}, ${chargerId}, ${price}, NOW())
      ON CONFLICT (user_id, charger_id)
      DO UPDATE SET max_price = ${price}, updated_at = NOW()
      RETURNING id, charger_id, max_price, enabled
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Create schema error:', error);
    return NextResponse.json({ error: 'Failed to save schema' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schemaId, enabled } = await request.json();

    if (!schemaId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Schema ID and enabled status are required' }, { status: 400 });
    }

    const sql = getDb();
    const result = await sql`
      UPDATE charging_schemas
      SET enabled = ${enabled}, updated_at = NOW()
      WHERE id = ${schemaId} AND user_id = ${session.userId}
      RETURNING id, enabled
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Toggle schema error:', error);
    return NextResponse.json({ error: 'Failed to update schema' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schemaId } = await request.json();

    if (!schemaId) {
      return NextResponse.json({ error: 'Schema ID is required' }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      DELETE FROM charging_schemas
      WHERE id = ${schemaId} AND user_id = ${session.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete schema error:', error);
    return NextResponse.json({ error: 'Failed to delete schema' }, { status: 500 });
  }
}
