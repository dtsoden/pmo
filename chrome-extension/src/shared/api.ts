import type {
  TimerShortcut,
  CreateShortcutData,
  UpdateShortcutData,
  ActiveTimer,
  StartTimerData,
  ShortcutsResponse,
  ActiveTimerResponse,
  InstallResponse,
} from './types';

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private onAuthExpiredCallback: (() => void) | null = null;

  constructor(baseUrl: string = import.meta.env.VITE_EXTENSION_BACKEND_URL || 'http://localhost:7600') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  onAuthExpired(callback: () => void) {
    this.onAuthExpiredCallback = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      ...options.headers,
    };

    // Only set Content-Type for requests with a body
    if (options.body) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    // Add Extension API Key for security (matches backend EXTENSION_API_KEY)
    // This provides an additional security layer to prevent malicious extensions from calling our API
    // Key is injected at build time from chrome-extension/.env
    const extensionApiKey = import.meta.env.VITE_EXTENSION_API_KEY;
    if (extensionApiKey) {
      (headers as Record<string, string>)['X-Extension-Api-Key'] = extensionApiKey;
    } else {
      console.warn('VITE_EXTENSION_API_KEY not configured - extension security layer disabled');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // If 401 Unauthorized, trigger auth expired callback
      if (response.status === 401 && this.onAuthExpiredCallback) {
        console.log('Auth expired (401), clearing auth state');
        this.onAuthExpiredCallback();
      }

      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // EXTENSION ENDPOINTS
  // ============================================

  async install(): Promise<InstallResponse> {
    return this.request<InstallResponse>('/api/extension/install', {
      method: 'POST',
    });
  }

  async getShortcuts(): Promise<TimerShortcut[]> {
    const response = await this.request<ShortcutsResponse>('/api/extension/shortcuts');
    return response.shortcuts;
  }

  async createShortcut(data: CreateShortcutData): Promise<TimerShortcut> {
    const response = await this.request<{ shortcut: TimerShortcut }>(
      '/api/extension/shortcuts',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.shortcut;
  }

  async updateShortcut(id: string, data: UpdateShortcutData): Promise<TimerShortcut> {
    const response = await this.request<{ shortcut: TimerShortcut }>(
      `/api/extension/shortcuts/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.shortcut;
  }

  async deleteShortcut(id: string): Promise<void> {
    await this.request(`/api/extension/shortcuts/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderShortcuts(shortcuts: { id: string; sortOrder: number }[]): Promise<void> {
    await this.request('/api/extension/shortcuts/reorder', {
      method: 'POST',
      body: JSON.stringify({ shortcuts }),
    });
  }

  // ============================================
  // TIMER ENDPOINTS
  // ============================================

  async getActiveTimer(): Promise<ActiveTimer | null> {
    const response = await this.request<ActiveTimerResponse>('/api/timetracking/active');
    return response.activeEntry;
  }

  async startTimer(data: StartTimerData): Promise<ActiveTimer> {
    const response = await this.request<{ activeEntry: ActiveTimer }>(
      '/api/timetracking/start',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.activeEntry;
  }

  async stopTimer(): Promise<void> {
    await this.request('/api/timetracking/stop', {
      method: 'POST',
    });
  }

  async updateTimer(data: { taskId?: string; description?: string }): Promise<ActiveTimer> {
    const response = await this.request<{ activeEntry: ActiveTimer }>(
      '/api/timetracking/active',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.activeEntry;
  }

  async discardTimer(): Promise<void> {
    await this.request('/api/timetracking/active', {
      method: 'DELETE',
    });
  }

  // ============================================
  // USER PREFERENCES ENDPOINTS
  // ============================================

  async getPreferences(): Promise<{ theme?: 'light' | 'dark' | 'system' }> {
    const response = await this.request<{ preferences: any }>('/api/users/me/preferences');
    return response.preferences || {};
  }
}

// Create singleton instance
export const api = new ApiClient();
