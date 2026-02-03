import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchTibberPrices } from '@/lib/tibber';
import { EaseeClient, decryptToken, persistRefreshedTokens } from '@/lib/easee';
import getDb from '@/lib/db';

interface ApplyResult {
  schemaId: number;
  chargerName: string;
  easeeChargerId: string;
  currentPrice: number;
  maxPrice: number;
  shouldCharge: boolean;
  action: 'start' | 'pause' | 'none';
  actionResult: 'success' | 'error' | 'skipped';
  message: string;
}

function getCurrentPrice(
  todayPrices: { total: number; startsAt: string }[],
  tomorrowPrices: { total: number; startsAt: string }[]
): { total: number; startsAt: string } | null {
  const now = new Date();
  const allPrices = [...todayPrices, ...tomorrowPrices];

  for (const price of allPrices) {
    const start = new Date(price.startsAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    if (now >= start && now < end) {
      return price;
    }
  }
  return null;
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Fetch current prices
    const tibberToken = decryptToken(tibberRows[0].encrypted_access_token);
    const prices = await fetchTibberPrices(tibberToken);
    const currentPrice = getCurrentPrice(prices.today, prices.tomorrow);

    if (!currentPrice) {
      return NextResponse.json(
        { error: 'Could not determine current electricity price.' },
        { status: 500 }
      );
    }

    // Get all enabled schemas with charger details
    const schemas = await sql`
      SELECT cs.id, cs.max_price, cs.charger_id,
             c.name as charger_name, c.charger_id as easee_charger_id,
             c.encrypted_access_token as charger_token,
             c.encrypted_refresh_token as charger_refresh_token
      FROM charging_schemas cs
      JOIN chargers c ON c.id = cs.charger_id
      WHERE cs.user_id = ${session.userId} AND cs.enabled = true
    `;

    if (schemas.length === 0) {
      return NextResponse.json({ results: [], message: 'No enabled schemas found.' });
    }

    const results: ApplyResult[] = [];

    for (const schema of schemas) {
      const maxPrice = parseFloat(schema.max_price);
      const shouldCharge = currentPrice.total <= maxPrice;

      const result: ApplyResult = {
        schemaId: schema.id,
        chargerName: schema.charger_name || schema.easee_charger_id,
        easeeChargerId: schema.easee_charger_id,
        currentPrice: currentPrice.total,
        maxPrice,
        shouldCharge,
        action: 'none',
        actionResult: 'skipped',
        message: '',
      };

      if (!schema.charger_token || !schema.easee_charger_id) {
        result.actionResult = 'error';
        result.message = 'Charger has no stored token or charger ID.';
        results.push(result);
        continue;
      }

      try {
        const accessToken = decryptToken(schema.charger_token);
        const refreshToken = schema.charger_refresh_token
          ? decryptToken(schema.charger_refresh_token)
          : undefined;

        const client = new EaseeClient();
        client.setTokens(accessToken, refreshToken);

        // Get current charger state to decide if action is needed
        const state = await client.getChargerState(schema.easee_charger_id);

        // opMode: 1=Disconnected, 2=Awaiting Start, 3=Charging, 4=Completed, 5=Error, 6=Ready to Charge
        if (shouldCharge) {
          // Price is below threshold: ensure charger is active
          if (state.chargerOpMode === 2 || state.chargerOpMode === 6) {
            // Awaiting start or Ready to charge → start
            result.action = 'start';
            await client.startCharging(schema.easee_charger_id);
            result.actionResult = 'success';
            result.message = `Started charging (price €${currentPrice.total.toFixed(4)} ≤ max €${maxPrice.toFixed(4)})`;
          } else if (state.chargerOpMode === 3) {
            result.action = 'none';
            result.actionResult = 'skipped';
            result.message = 'Already charging.';
          } else {
            result.action = 'start';
            try {
              await client.resumeCharging(schema.easee_charger_id);
              result.actionResult = 'success';
              result.message = `Resumed charging (price €${currentPrice.total.toFixed(4)} ≤ max €${maxPrice.toFixed(4)})`;
            } catch {
              result.actionResult = 'skipped';
              result.message = `Charger in state "${state.chargerOpMode}" — no car connected or cannot start.`;
            }
          }
        } else {
          // Price is above threshold: pause charger
          if (state.chargerOpMode === 3) {
            // Currently charging → pause
            result.action = 'pause';
            await client.pauseCharging(schema.easee_charger_id);
            result.actionResult = 'success';
            result.message = `Paused charging (price €${currentPrice.total.toFixed(4)} > max €${maxPrice.toFixed(4)})`;
          } else {
            result.action = 'none';
            result.actionResult = 'skipped';
            result.message = 'Not currently charging — no action needed.';
          }
        }
        // Persist refreshed tokens back to DB so they don't expire
        await persistRefreshedTokens(client, schema.charger_id);
      } catch (error) {
        result.actionResult = 'error';
        result.message = error instanceof Error ? error.message : 'Failed to control charger';
      }

      results.push(result);
    }

    return NextResponse.json({
      results,
      currentPrice: currentPrice.total,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Apply schemas error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply schemas' },
      { status: 500 }
    );
  }
}
