export interface HealthStatus {
  online: boolean;
  service?: string;
  database?: string;
  timestamp?: string;
  latencyMs?: number;
  error?: string;
}

const STORAGE_KEY = 'digibanking_api_base_url';

const envUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_DEFAULT_URL as string | undefined)?.trim();

const DEFAULT_URL = envUrl || 'https://digibanking.onrender.com/api/v1';

class ApiConfigManager {
  private currentBaseUrl: string;
  private listeners: Array<(url: string) => void> = [];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    // If localStorage has an old localhost URL but DEFAULT_URL is configured to a remote server, upgrade to DEFAULT_URL
    if (saved && saved.trim()) {
      if (saved.includes('localhost') && DEFAULT_URL.startsWith('https://')) {
        this.currentBaseUrl = DEFAULT_URL;
        localStorage.setItem(STORAGE_KEY, DEFAULT_URL);
      } else {
        this.currentBaseUrl = saved.trim();
      }
    } else {
      this.currentBaseUrl = DEFAULT_URL;
    }
  }

  public getDefaultUrl(): string {
    return DEFAULT_URL;
  }

  public getBaseUrl(): string {
    return this.currentBaseUrl.replace(/\/+$/, '');
  }

  public setBaseUrl(newUrl: string): void {
    const cleaned = newUrl.trim().replace(/\/+$/, '');
    this.currentBaseUrl = cleaned;
    localStorage.setItem(STORAGE_KEY, cleaned);
    this.notifyListeners();
  }

  public resetToDefault(): void {
    this.setBaseUrl(DEFAULT_URL);
  }

  public subscribe(listener: (url: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentBaseUrl);
      } catch (err) {
        console.error('Error in ApiConfig listener:', err);
      }
    });
  }

  public async checkHealth(): Promise<HealthStatus> {
    const url = `${this.getBaseUrl()}/health`;
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/xml, text/xml, */*' }
      });
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      if (!res.ok) {
        return {
          online: false,
          latencyMs,
          error: `HTTP ${res.status}: ${res.statusText}`
        };
      }

      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'application/xml');
      const statusEl = doc.querySelector('status');
      const serviceEl = doc.querySelector('service');
      const dbEl = doc.querySelector('database');
      const timeEl = doc.querySelector('timestamp');

      return {
        online: statusEl?.textContent?.toLowerCase() === 'ok',
        service: serviceEl?.textContent || undefined,
        database: dbEl?.textContent || undefined,
        timestamp: timeEl?.textContent || undefined,
        latencyMs
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        online: false,
        latencyMs,
        error: err instanceof Error ? err.message : 'Connection failed'
      };
    }
  }
}

export const apiConfig = new ApiConfigManager();

