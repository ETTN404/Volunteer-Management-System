import { User } from '../types/vms';

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  message?: string;
  error?: string;
  headers?: Record<string, string>;
  durationMs: number;
}

export interface ApiConfig {
  mode: 'live';
  liveBaseUrl: string;
  authToken: string;
}

const CONFIG_KEY = 'voluntrack_api_config';

export class ApiClient {
  private static config: ApiConfig = this.loadConfig();

  private static loadConfig(): ApiConfig {
    const token = localStorage.getItem('voluntrack_sanctum_token') || '';
    return {
      mode: 'live',
      liveBaseUrl: 'http://localhost:8000/api',
      authToken: token,
    };
  }

  public static getConfig(): ApiConfig {
    this.config.authToken = localStorage.getItem('voluntrack_sanctum_token') || '';
    return this.config;
  }

  public static setConfig(config: Partial<ApiConfig>): void {
    if (config.authToken !== undefined) {
      if (config.authToken) {
        localStorage.setItem('voluntrack_sanctum_token', config.authToken);
      } else {
        localStorage.removeItem('voluntrack_sanctum_token');
      }
    }
    this.config = { ...this.config, ...config, mode: 'live' };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * HTTP Client communicating directly with Live Laravel API (http://localhost:8000/api)
   */
  public static async request<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: any,
    _currentUser?: User | null
  ): Promise<ApiResponse<T>> {
    const startTime = performance.now();

    // Normalize path to prevent double /api/ prefixes
    const rawPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const normalizedEndpoint = rawPath.startsWith('/api/') ? rawPath.substring(4) : rawPath;

    const baseUrl = this.config.liveBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const url = `${baseUrl}/api${normalizedEndpoint}`;

    const activeToken = localStorage.getItem('voluntrack_sanctum_token') || this.config.authToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({}));
      const durationMs = Math.round(performance.now() - startTime);

      // Auto-capture Sanctum bearer token on successful login or registration
      const token = json.access_token || json.data?.access_token || (json.data && json.data.token);
      if (res.ok && token) {
        localStorage.setItem('voluntrack_sanctum_token', token);
        this.config.authToken = token;
      }

      // Handle 401 Unauthenticated: clear invalid token
      if (res.status === 401 && !endpoint.includes('/login')) {
        localStorage.removeItem('voluntrack_sanctum_token');
        this.config.authToken = '';
      }

      return {
        status: res.status,
        data: json.data !== undefined ? json.data : json,
        message: json.message,
        error: res.ok ? undefined : json.error || json.message || (json.errors ? Object.values(json.errors).flat().join(' ') : 'Request failed'),
        durationMs,
      } as ApiResponse<T>;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        status: 503,
        data: null as any,
        error: `Live Backend Connection Error: ${err?.name === 'AbortError' ? 'Request timed out after 15s' : err?.message || 'Failed to connect to http://localhost:8000'}`,
        durationMs,
      } as ApiResponse<T>;
    }
  }
}
