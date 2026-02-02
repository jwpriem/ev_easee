import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/session';
import { ZeekrClient, decryptToken } from '@/lib/zeekr';

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
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: 'Invalid vehicle ID' }, { status: 400 });
    }

    const sql = getDb();
    const vehicles = await sql`
      SELECT id, brand, model, nickname, vin, encrypted_token, region
      FROM vehicles
      WHERE id = ${vehicleId} AND user_id = ${session.userId}
    `;

    if (vehicles.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicle = vehicles[0];

    if (!vehicle.encrypted_token) {
      return NextResponse.json({
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          nickname: vehicle.nickname,
        },
        status: null,
        message: 'No token stored for this vehicle'
      });
    }

    // Decrypt token and fetch status
    try {
      const token = decryptToken(vehicle.encrypted_token);
      const client = new ZeekrClient(vehicle.region as 'EU' | 'SEA');
      client.setToken(token);

      const status = vehicle.vin ? await client.getVehicleStatus(vehicle.vin) : null;

      return NextResponse.json({
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          nickname: vehicle.nickname,
          vin: vehicle.vin,
        },
        status,
      });
    } catch (error) {
      console.error('Failed to get vehicle status:', error);
      return NextResponse.json({
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          nickname: vehicle.nickname,
        },
        status: null,
        message: 'Failed to fetch vehicle status. Token may be expired.'
      });
    }
  } catch (error) {
    console.error('Get vehicle status error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
