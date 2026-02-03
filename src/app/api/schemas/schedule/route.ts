import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchTibberPrices } from '@/lib/tibber';
import { decryptToken } from '@/lib/easee';
import getDb from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schemaId = searchParams.get('schemaId');

    const sql = getDb();

    // Get Tibber token
    const tibberRows = await sql`
      SELECT encrypted_access_token FROM tibber_connections
      WHERE user_id = ${session.userId}
    `;
    if (tibberRows.length === 0) {
      return NextResponse.json(
        { error: 'Tibber not connected. Connect your Tibber account on the Prices page first.' },
        { status: 400 }
      );
    }

    // Get schemas (specific or all enabled)
    let schemas;
    if (schemaId) {
      schemas = await sql`
        SELECT cs.id, cs.charger_id, cs.max_price, cs.enabled,
               c.name as charger_name, c.charger_id as easee_charger_id
        FROM charging_schemas cs
        JOIN chargers c ON c.id = cs.charger_id
        WHERE cs.id = ${schemaId} AND cs.user_id = ${session.userId}
      `;
    } else {
      schemas = await sql`
        SELECT cs.id, cs.charger_id, cs.max_price, cs.enabled,
               c.name as charger_name, c.charger_id as easee_charger_id
        FROM charging_schemas cs
        JOIN chargers c ON c.id = cs.charger_id
        WHERE cs.user_id = ${session.userId} AND cs.enabled = true
      `;
    }

    if (schemas.length === 0) {
      return NextResponse.json({ schedules: [] });
    }

    // Fetch current prices
    const accessToken = decryptToken(tibberRows[0].encrypted_access_token);
    const prices = await fetchTibberPrices(accessToken);
    const allPrices = [...prices.today, ...prices.tomorrow];

    // Expand hourly prices into 15-minute slots
    const slots15min = allPrices.flatMap((price) => {
      const hourStart = new Date(price.startsAt);
      return [0, 15, 30, 45].map((minuteOffset) => {
        const slotStart = new Date(hourStart.getTime() + minuteOffset * 60 * 1000);
        return {
          startsAt: slotStart.toISOString(),
          price: price.total,
          level: price.level,
        };
      });
    });

    // Calculate schedule for each schema
    const schedules = schemas.map((schema: Record<string, unknown>) => {
      const maxPrice = parseFloat(schema.max_price as string);
      const slots = slots15min.map((slot) => ({
        ...slot,
        active: slot.price <= maxPrice,
      }));

      const activeSlots = slots.filter((s) => s.active).length;
      const totalSlots = slots.length;

      return {
        schemaId: schema.id,
        chargerId: schema.charger_id,
        chargerName: schema.charger_name,
        easeeChargerId: schema.easee_charger_id,
        maxPrice,
        enabled: schema.enabled,
        slots,
        summary: {
          activeSlots,
          totalSlots,
          activeHours: activeSlots / 4,
          totalHours: totalSlots / 4,
          cheapestPrice: allPrices.length > 0 ? Math.min(...allPrices.map((p) => p.total)) : 0,
          mostExpensivePrice: allPrices.length > 0 ? Math.max(...allPrices.map((p) => p.total)) : 0,
        },
      };
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Schedule calculation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate schedule' },
      { status: 500 }
    );
  }
}
