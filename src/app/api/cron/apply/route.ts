import { NextResponse } from 'next/server';
import { fetchTibberPrices } from '@/lib/tibber';
import { EaseeClient, decryptToken } from '@/lib/easee';
import getDb from '@/lib/db';

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

export async function POST(request: Request) {
  try {
    // Authenticate via API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    const apiKey = authHeader.slice(7);

    const sql = getDb();

    // Find user by cron API key
    const automationRows = await sql`
      SELECT user_id FROM automation_settings
      WHERE cron_api_key = ${apiKey} AND active = true
    `;
    if (automationRows.length === 0) {
      return NextResponse.json({ error: 'Invalid API key or automation not active' }, { status: 401 });
    }

    const userId = automationRows[0].user_id;

    // Get Tibber token
    const tibberRows = await sql`
      SELECT encrypted_access_token FROM tibber_connections
      WHERE user_id = ${userId}
    `;
    if (tibberRows.length === 0) {
      return NextResponse.json({ error: 'Tibber not connected' }, { status: 400 });
    }

    // Fetch current prices
    const tibberToken = decryptToken(tibberRows[0].encrypted_access_token);
    const prices = await fetchTibberPrices(tibberToken);
    const currentPrice = getCurrentPrice(prices.today, prices.tomorrow);

    if (!currentPrice) {
      return NextResponse.json({ error: 'Could not determine current electricity price' }, { status: 500 });
    }

    // Get all enabled schemas with charger details
    const schemas = await sql`
      SELECT cs.id, cs.max_price, cs.charger_id,
             c.name as charger_name, c.charger_id as easee_charger_id,
             c.encrypted_access_token as charger_token,
             c.encrypted_refresh_token as charger_refresh_token
      FROM charging_schemas cs
      JOIN chargers c ON c.id = cs.charger_id
      WHERE cs.user_id = ${userId} AND cs.enabled = true
    `;

    if (schemas.length === 0) {
      return NextResponse.json({ results: [], message: 'No enabled schemas found.' });
    }

    const results = [];

    for (const schema of schemas) {
      const maxPrice = parseFloat(schema.max_price);
      const shouldCharge = currentPrice.total <= maxPrice;

      const result: Record<string, unknown> = {
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

        const state = await client.getChargerState(schema.easee_charger_id);

        if (shouldCharge) {
          if (state.chargerOpMode === 2 || state.chargerOpMode === 6) {
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
          if (state.chargerOpMode === 3) {
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
    console.error('Cron apply error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply schemas' },
      { status: 500 }
    );
  }
}
