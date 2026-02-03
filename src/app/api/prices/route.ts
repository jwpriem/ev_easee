import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchTibberPrices } from '@/lib/tibber';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiToken = process.env.TIBBER_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: 'Tibber API token not configured. Add TIBBER_API_TOKEN to your .env.local file.' },
        { status: 500 }
      );
    }

    const prices = await fetchTibberPrices(apiToken);

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Tibber prices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
