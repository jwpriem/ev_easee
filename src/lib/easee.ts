import crypto from 'crypto';

const EASEE_BASE_URL = 'https://api.easee.com';

interface EaseeLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface EaseeCharger {
  id: string;
  name: string;
  color: number;
  createdOn: string;
  updatedOn: string;
  backPlate: {
    id: string;
    masterBackPlateId: string;
  };
  levelOfAccess: number;
  productCode: number;
}

interface EaseeSite {
  id: number;
  siteKey: string;
  name: string;
  levelOfAccess: number;
  address: {
    street: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  circuits: EaseeCircuit[];
}

interface EaseeCircuit {
  id: number;
  siteId: number;
  circuitPanelId: number;
  panelName: string;
  chargers: EaseeCharger[];
}

interface EaseeChargerState {
  smartCharging: boolean;
  cableLocked: boolean;
  chargerOpMode: number;
  totalPower: number;
  sessionEnergy: number;
  energyPerHour: number;
  outputPhase: number;
  dynamicCircuitCurrentP1: number;
  dynamicCircuitCurrentP2: number;
  dynamicCircuitCurrentP3: number;
  latestPulse: string;
  chargerFirmware: number;
  voltage: number;
  chargerRAT: number;
  chargerCAT: number;
  circuitTotalAllocatedPhaseConductorCurrentL1: number;
  circuitTotalAllocatedPhaseConductorCurrentL2: number;
  circuitTotalAllocatedPhaseConductorCurrentL3: number;
  circuitTotalPhaseConductorCurrentL1: number;
  circuitTotalPhaseConductorCurrentL2: number;
  circuitTotalPhaseConductorCurrentL3: number;
  inCurrentT2: number;
  inCurrentT3: number;
  inCurrentT4: number;
  inCurrentT5: number;
  outputCurrent: number;
  isOnline: boolean;
  inVoltageT1T2: number;
  inVoltageT1T3: number;
  inVoltageT1T4: number;
  inVoltageT1T5: number;
  inVoltageT2T3: number;
  inVoltageT2T4: number;
  inVoltageT2T5: number;
  inVoltageT3T4: number;
  inVoltageT3T5: number;
  inVoltageT4T5: number;
  ledMode: number;
  cableRating: number;
  dynamicChargerCurrent: number;
  circuitMaxCurrentP1: number;
  circuitMaxCurrentP2: number;
  circuitMaxCurrentP3: number;
  reasonForNoCurrent: number;
  wiFiAPEnabled: boolean;
}

// Charger operation modes
export const CHARGER_OP_MODES: Record<number, string> = {
  1: 'Disconnected',
  2: 'Awaiting Start',
  3: 'Charging',
  4: 'Completed',
  5: 'Error',
  6: 'Ready to Charge',
};

export class EaseeClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(username: string, password: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
    try {
      const response = await fetch(`${EASEE_BASE_URL}/api/accounts/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          userName: username,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.title || errorData.message || `Login failed (${response.status})`,
        };
      }

      const data: EaseeLoginResponse = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      console.error('Easee login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
  }

  async refreshAccessToken(): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
    if (!this.accessToken || !this.refreshToken) {
      return { success: false, error: 'No tokens available' };
    }

    try {
      const response = await fetch(`${EASEE_BASE_URL}/api/accounts/refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
        }),
      });

      if (!response.ok) {
        return { success: false, error: 'Token refresh failed' };
      }

      const data: EaseeLoginResponse = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refresh failed',
      };
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${EASEE_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      const refreshResult = await this.refreshAccessToken();
      if (refreshResult.success) {
        // Retry the request
        const retryResponse = await fetch(`${EASEE_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            ...options.headers,
          },
        });
        if (!retryResponse.ok) {
          throw new Error(`API request failed: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
      throw new Error('Authentication expired');
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  async getChargers(): Promise<EaseeCharger[]> {
    return this.request<EaseeCharger[]>('/api/chargers');
  }

  async getSites(): Promise<EaseeSite[]> {
    return this.request<EaseeSite[]>('/api/sites');
  }

  async getChargerState(chargerId: string): Promise<EaseeChargerState> {
    return this.request<EaseeChargerState>(`/api/chargers/${chargerId}/state`);
  }

  async getChargerDetails(chargerId: string): Promise<EaseeCharger> {
    return this.request<EaseeCharger>(`/api/chargers/${chargerId}`);
  }

  async startCharging(chargerId: string): Promise<void> {
    await this.request(`/api/chargers/${chargerId}/commands/start_charging`, {
      method: 'POST',
    });
  }

  async stopCharging(chargerId: string): Promise<void> {
    await this.request(`/api/chargers/${chargerId}/commands/stop_charging`, {
      method: 'POST',
    });
  }

  async pauseCharging(chargerId: string): Promise<void> {
    await this.request(`/api/chargers/${chargerId}/commands/pause_charging`, {
      method: 'POST',
    });
  }

  async resumeCharging(chargerId: string): Promise<void> {
    await this.request(`/api/chargers/${chargerId}/commands/resume_charging`, {
      method: 'POST',
    });
  }
}

// Token encryption for storage
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'default-key-change-in-production';

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export type { EaseeCharger, EaseeSite, EaseeCircuit, EaseeChargerState };
