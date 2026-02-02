import crypto from 'crypto';

// Zeekr API Configuration
// Note: These values need to be extracted from the Zeekr app
// See: https://github.com/Fryyyyy/zeekr_ev_api
const ZEEKR_CONFIG = {
  EU: {
    APP_SERVER_HOST: 'https://gateway-pub-azure.zeekr.eu/overseas-app/',
    USERCENTER_HOST: 'https://gateway-pub-azure.zeekr.eu/zeekr-cuc-idaas/',
  },
  SEA: {
    APP_SERVER_HOST: 'https://gateway-pub-hw-em-sg.zeekrlife.com/overseas-app/',
    USERCENTER_HOST: 'https://gateway-pub-hw-em-sg.zeekrlife.com/zeekr-cuc-idaas-sea/',
  },
};

interface ZeekrLoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  userId?: string;
  error?: string;
}

interface ZeekrVehicle {
  vin: string;
  model: string;
  nickname?: string;
  imageUrl?: string;
}

interface ZeekrVehicleStatus {
  batteryLevel: number;
  range: number;
  isCharging: boolean;
  isLocked: boolean;
  odometer: number;
  lastUpdated: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  chargingStatus?: {
    isPluggedIn: boolean;
    chargingPower: number;
    timeToFullCharge: number;
    chargeLimit: number;
  };
}

export class ZeekrClient {
  private region: 'EU' | 'SEA';
  private token: string | null = null;
  private hmacAccessKey: string;
  private hmacSecretKey: string;
  private passwordPublicKey: string;

  constructor(
    region: 'EU' | 'SEA' = 'EU',
    hmacAccessKey?: string,
    hmacSecretKey?: string,
    passwordPublicKey?: string
  ) {
    this.region = region;
    this.hmacAccessKey = hmacAccessKey || process.env.ZEEKR_HMAC_ACCESS_KEY || '';
    this.hmacSecretKey = hmacSecretKey || process.env.ZEEKR_HMAC_SECRET_KEY || '';
    this.passwordPublicKey = passwordPublicKey || process.env.ZEEKR_PASSWORD_PUBLIC_KEY || '';
  }

  private getHost(type: 'APP_SERVER_HOST' | 'USERCENTER_HOST'): string {
    return ZEEKR_CONFIG[this.region][type];
  }

  private generateHmacSignature(method: string, path: string, timestamp: string): string {
    const stringToSign = `${method}\n${path}\n${timestamp}`;
    const hmac = crypto.createHmac('sha256', this.hmacSecretKey);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  private encryptPassword(password: string): string {
    if (!this.passwordPublicKey) {
      // If no public key, return password as-is (for testing)
      return password;
    }

    try {
      const buffer = Buffer.from(password, 'utf8');
      const encrypted = crypto.publicEncrypt(
        {
          key: this.passwordPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        buffer
      );
      return encrypted.toString('base64');
    } catch {
      return password;
    }
  }

  async login(email: string, password: string): Promise<ZeekrLoginResponse> {
    try {
      const host = this.getHost('USERCENTER_HOST');
      const endpoint = 'auth/loginByEmailEncrypt';
      const url = `${host}${endpoint}`;

      const timestamp = Date.now().toString();
      const encryptedPassword = this.encryptPassword(password);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'app-code': 'zeekr',
        'appid': 'TSP',
        'client-id': 'zeekr-overseas-app',
        'x-timestamp': timestamp,
      };

      if (this.hmacAccessKey && this.hmacSecretKey) {
        const signature = this.generateHmacSignature('POST', endpoint, timestamp);
        headers['x-hmac-access-key'] = this.hmacAccessKey;
        headers['x-hmac-signature'] = signature;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password: encryptedPassword,
          countryCode: this.region === 'EU' ? 'NL' : 'AU',
        }),
      });

      const data = await response.json();

      if (response.ok && data.data) {
        this.token = data.data.token || data.data.accessToken;
        return {
          success: true,
          token: this.token || undefined,
          refreshToken: data.data.refreshToken,
          userId: data.data.userId,
        };
      }

      return {
        success: false,
        error: data.message || data.msg || 'Login failed',
      };
    } catch (error) {
      console.error('Zeekr login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  async getVehicles(): Promise<ZeekrVehicle[]> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const host = this.getHost('APP_SERVER_HOST');
      const url = `${host}ms-app-bff/api/v4.0/veh/vehicle-list`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'app-code': 'zeekr',
        },
      });

      const data = await response.json();

      if (response.ok && data.data) {
        return data.data.map((v: Record<string, unknown>) => ({
          vin: v.vin as string,
          model: v.modelName as string || v.model as string || 'Zeekr',
          nickname: v.nickname as string,
          imageUrl: v.imageUrl as string,
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to get vehicles:', error);
      return [];
    }
  }

  async getVehicleStatus(vin: string): Promise<ZeekrVehicleStatus | null> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const host = this.getHost('APP_SERVER_HOST');
      const url = `${host}ms-app-bff/api/v4.0/veh/vehicle-status?vin=${encodeURIComponent(vin)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'app-code': 'zeekr',
        },
      });

      const data = await response.json();

      if (response.ok && data.data) {
        const status = data.data;
        return {
          batteryLevel: status.soc || status.batteryLevel || 0,
          range: status.remainingRange || status.range || 0,
          isCharging: status.chargingStatus === 'CHARGING' || status.isCharging || false,
          isLocked: status.lockStatus === 'LOCKED' || status.isLocked || true,
          odometer: status.odometer || status.mileage || 0,
          lastUpdated: status.lastUpdated || new Date().toISOString(),
          location: status.location ? {
            latitude: status.location.latitude,
            longitude: status.location.longitude,
          } : undefined,
          chargingStatus: status.chargingInfo ? {
            isPluggedIn: status.chargingInfo.isPluggedIn || false,
            chargingPower: status.chargingInfo.chargingPower || 0,
            timeToFullCharge: status.chargingInfo.timeToFullCharge || 0,
            chargeLimit: status.chargingInfo.chargeLimit || 80,
          } : undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get vehicle status:', error);
      return null;
    }
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

export type { ZeekrLoginResponse, ZeekrVehicle, ZeekrVehicleStatus };
