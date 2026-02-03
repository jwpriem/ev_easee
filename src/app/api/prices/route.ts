import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchTibberPrices } from '@/lib/tibber';
import { decryptToken } from '@/lib/easee';
import getDb from '@/lib/db';

interface CacheEntry {
  data: { today: unknown[]; tomorrow: unknown[] };
  fetchedAt: number;
}

// In-memory price cache keyed by user ID
const priceCache = new Map<number, CacheEntry>();

function getCacheTTL(): number {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hour * 60 + minutes;

  // Tomorrow's prices typically arrive around 13:00.
  // Before 13:00 and no tomorrow prices cached → short TTL (5 min) so we pick them up quickly.
  // After 13:00 or tomorrow prices present → long TTL (15 min) since data won't change.
  const refreshHour = 13 * 60; // 13:00 in minutes

  if (currentMinutes >= refreshHour - 30 && currentMinutes <= refreshHour + 30) {
    // Around 13:00 (12:30–13:30): short TTL to catch new day-ahead prices
    return 2 * 60 * 1000; // 2 minutes
  }

  return 15 * 60 * 1000; // 15 minutes
}

function isCacheValid(entry: CacheEntry): boolean {
  const age = Date.now() - entry.fetchedAt;
  const ttl = getCacheTTL();

  if (age > ttl) return false;

  // If we have no tomorrow prices and it's after 13:00, invalidate
  // so we try to fetch them
  const hour = new Date().getHours();
  if (hour >= 13 && entry.data.tomorrow.length === 0) {
    // Allow a short cache (2 min) even in this case to avoid hammering Tibber
    return age < 2 * 60 * 1000;
  }

  return true;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache first
    const cached = priceCache.get(session.userId);
    if (cached && isCacheValid(cached)) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT encrypted_access_token
      FROM tibber_connections
      WHERE user_id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Tibber not connected. Please add your personal access token first.' },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(rows[0].encrypted_access_token);
    const prices = await fetchTibberPrices(accessToken);

    // Store in cache
    priceCache.set(session.userId, {
      data: prices,
      fetchedAt: Date.now(),
    });

    return NextResponse.json(prices, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Tibber prices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
