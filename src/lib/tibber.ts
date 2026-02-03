import crypto from 'crypto';

const TIBBER_API_URL = 'https://api.tibber.com/v1-beta/gql';
const TIBBER_AUTH_URL = 'https://thewall.tibber.com/connect/authorize';
const TIBBER_TOKEN_URL = 'https://thewall.tibber.com/connect/token';

const TIBBER_SCOPES = 'openid profile email offline_access data-api-user-read data-api-homes-read';

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

interface TibberTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// --- PKCE helpers ---

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// --- OAuth flow ---

export function buildAuthorizationUrl(redirectUri: string, state: string, codeVerifier: string): string {
  const clientId = process.env.TIBBER_CLIENT_ID;
  if (!clientId) {
    throw new Error('TIBBER_CLIENT_ID is not configured');
  }

  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: TIBBER_SCOPES,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TIBBER_AUTH_URL}?${params.toString()}`;
}

export function createOAuthState(): { state: string; codeVerifier: string } {
  return {
    state: crypto.randomBytes(16).toString('hex'),
    codeVerifier: generateCodeVerifier(),
  };
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<TibberTokenResponse> {
  const clientId = process.env.TIBBER_CLIENT_ID;
  const clientSecret = process.env.TIBBER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('TIBBER_CLIENT_ID and TIBBER_CLIENT_SECRET must be configured');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TIBBER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Tibber token exchange failed:', errorText);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TibberTokenResponse> {
  const clientId = process.env.TIBBER_CLIENT_ID;
  const clientSecret = process.env.TIBBER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('TIBBER_CLIENT_ID and TIBBER_CLIENT_SECRET must be configured');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TIBBER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

// --- Price queries ---

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
