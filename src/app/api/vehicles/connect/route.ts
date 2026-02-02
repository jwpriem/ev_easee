import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/session';
import { ZeekrClient, encryptToken } from '@/lib/zeekr';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brand, email, password, region = 'EU' } = await request.json();

    if (!brand || !email || !password) {
      return NextResponse.json(
        { error: 'Brand, email, and password are required' },
        { status: 400 }
      );
    }

    if (brand.toLowerCase() !== 'zeekr') {
      return NextResponse.json(
        { error: 'Only Zeekr is currently supported' },
        { status: 400 }
      );
    }

    // Attempt to login to Zeekr
    const client = new ZeekrClient(region);
    const loginResult = await client.login(email, password);

    if (!loginResult.success) {
      return NextResponse.json(
        { error: loginResult.error || 'Failed to connect to Zeekr' },
        { status: 401 }
      );
    }

    // Encrypt tokens for storage
    const encryptedToken = loginResult.token ? encryptToken(loginResult.token) : null;
    const encryptedRefreshToken = loginResult.refreshToken ? encryptToken(loginResult.refreshToken) : null;

    // Get vehicle list
    let vehicles: Array<{ vin: string; model: string }> = [];
    if (loginResult.token) {
      client.setToken(loginResult.token);
      vehicles = await client.getVehicles();
    }

    return NextResponse.json({
      success: true,
      userId: loginResult.userId,
      encryptedToken,
      encryptedRefreshToken,
      vehicles,
    });
  } catch (error) {
    console.error('Vehicle connect error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
