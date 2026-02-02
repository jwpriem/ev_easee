import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { EaseeClient, encryptToken } from '@/lib/easee';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brand, username, password } = await request.json();

    if (!brand || !username || !password) {
      return NextResponse.json(
        { error: 'Brand, username, and password are required' },
        { status: 400 }
      );
    }

    if (brand.toLowerCase() !== 'easee') {
      return NextResponse.json(
        { error: 'Only Easee is currently supported' },
        { status: 400 }
      );
    }

    // Attempt to login to Easee
    const client = new EaseeClient();
    const loginResult = await client.login(username, password);

    if (!loginResult.success) {
      return NextResponse.json(
        { error: loginResult.error || 'Failed to connect to Easee' },
        { status: 401 }
      );
    }

    // Encrypt tokens for storage
    const encryptedAccessToken = loginResult.accessToken ? encryptToken(loginResult.accessToken) : null;
    const encryptedRefreshToken = loginResult.refreshToken ? encryptToken(loginResult.refreshToken) : null;

    // Get charger list
    let chargers: Array<{ id: string; name: string }> = [];
    if (loginResult.accessToken) {
      try {
        chargers = await client.getChargers();
      } catch (error) {
        console.error('Failed to get chargers:', error);
        // Still return success even if we couldn't get chargers
      }
    }

    return NextResponse.json({
      success: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      chargers,
    });
  } catch (error) {
    console.error('Charger connect error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
