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

export type { TibberPrice };
