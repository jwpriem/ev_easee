const TIBBER_API_URL = 'https://api.tibber.com/v1-beta/gql';

interface TibberPrice {
  total: number;
  energy: number;
  tax: number;
  startsAt: string;
  level: string;
}

interface TibberPriceResponse {
  today: TibberPrice[];
  tomorrow: TibberPrice[];
}

const HOURLY_QUERY = `
{
  viewer {
    homes {
      currentSubscription {
        priceInfo {
          today {
            total
            energy
            tax
            startsAt
            level
          }
          tomorrow {
            total
            energy
            tax
            startsAt
            level
          }
        }
      }
    }
  }
}
`;

export async function fetchTibberPrices(apiToken: string): Promise<TibberPriceResponse> {
  const response = await fetch(TIBBER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ query: HOURLY_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`Tibber API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Tibber API error');
  }

  const homes = data.data?.viewer?.homes;
  if (!homes || homes.length === 0) {
    throw new Error('No homes found in Tibber account');
  }

  const priceInfo = homes[0].currentSubscription?.priceInfo;
  if (!priceInfo) {
    throw new Error('No price info available');
  }

  return {
    today: priceInfo.today || [],
    tomorrow: priceInfo.tomorrow || [],
  };
}

// Interpolate hourly prices to 15-minute intervals
export function interpolateTo15Min(prices: TibberPrice[]): TibberPrice[] {
  if (prices.length === 0) return [];

  const result: TibberPrice[] = [];

  for (let i = 0; i < prices.length; i++) {
    const current = prices[i];
    const startTime = new Date(current.startsAt);

    // Each hourly price applies to the full hour, so we create 4 x 15-min slots
    // with the same price (step function, not linear interpolation)
    for (let q = 0; q < 4; q++) {
      const slotTime = new Date(startTime.getTime() + q * 15 * 60 * 1000);
      result.push({
        total: current.total,
        energy: current.energy,
        tax: current.tax,
        startsAt: slotTime.toISOString(),
        level: current.level,
      });
    }
  }

  return result;
}

export type { TibberPrice };
