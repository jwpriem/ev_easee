import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/session';
import { EaseeClient, decryptToken, persistRefreshedTokens, CHARGER_OP_MODES } from '@/lib/easee';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const chargerId = parseInt(id, 10);

    if (isNaN(chargerId)) {
      return NextResponse.json({ error: 'Invalid charger ID' }, { status: 400 });
    }

    const sql = getDb();
    const chargers = await sql`
      SELECT id, brand, name, charger_id, encrypted_access_token, encrypted_refresh_token
      FROM chargers
      WHERE id = ${chargerId} AND user_id = ${session.userId}
    `;

    if (chargers.length === 0) {
      return NextResponse.json({ error: 'Charger not found' }, { status: 404 });
    }

    const charger = chargers[0];

    if (!charger.encrypted_access_token || !charger.charger_id) {
      return NextResponse.json({
        charger: {
          id: charger.id,
          brand: charger.brand,
          name: charger.name,
          chargerId: charger.charger_id,
        },
        status: null,
        message: 'No token or charger ID stored'
      });
    }

    // Decrypt tokens and fetch status
    try {
      const accessToken = decryptToken(charger.encrypted_access_token);
      const refreshToken = charger.encrypted_refresh_token
        ? decryptToken(charger.encrypted_refresh_token)
        : undefined;

      const client = new EaseeClient();
      client.setTokens(accessToken, refreshToken);

      const state = await client.getChargerState(charger.charger_id);

      // Persist refreshed tokens back to DB so they don't expire
      await persistRefreshedTokens(client, charger.id);

      return NextResponse.json({
        charger: {
          id: charger.id,
          brand: charger.brand,
          name: charger.name,
          chargerId: charger.charger_id,
        },
        status: {
          isOnline: state.isOnline,
          opMode: state.chargerOpMode,
          opModeText: CHARGER_OP_MODES[state.chargerOpMode] || 'Unknown',
          totalPower: state.totalPower,
          sessionEnergy: state.sessionEnergy,
          energyPerHour: state.energyPerHour,
          voltage: state.voltage,
          outputCurrent: state.outputCurrent,
          cableLocked: state.cableLocked,
          smartCharging: state.smartCharging,
          lastPulse: state.latestPulse,
          firmware: state.chargerFirmware,
        },
      });
    } catch (error) {
      console.error('Failed to get charger status:', error);
      return NextResponse.json({
        charger: {
          id: charger.id,
          brand: charger.brand,
          name: charger.name,
          chargerId: charger.charger_id,
        },
        status: null,
        message: 'Failed to fetch charger status. Token may be expired.'
      });
    }
  } catch (error) {
    console.error('Get charger status error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
