import type { AuthState, TimerState, TimerShortcut, ActiveTimer } from './types';

// Storage keys
const KEYS = {
  AUTH: 'pmo_auth',
  TIMER: 'pmo_timer',
  SHORTCUTS: 'pmo_shortcuts',
  API_URL: 'pmo_api_url',
  THEME: 'pmo_theme',
} as const;

// ============================================
// AUTH STORAGE
// ============================================

export async function getAuth(): Promise<AuthState | null> {
  const result = await chrome.storage.local.get(KEYS.AUTH);
  return result[KEYS.AUTH] || null;
}

export async function setAuth(auth: AuthState): Promise<void> {
  await chrome.storage.local.set({ [KEYS.AUTH]: auth });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove(KEYS.AUTH);
}

export async function getToken(): Promise<string | null> {
  const auth = await getAuth();
  return auth?.token || null;
}

// ============================================
// API URL STORAGE
// ============================================

export async function getApiUrl(): Promise<string> {
  const result = await chrome.storage.local.get(KEYS.API_URL);
  return result[KEYS.API_URL] || import.meta.env.VITE_EXTENSION_BACKEND_URL || 'http://localhost:7600';
}

export async function setApiUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [KEYS.API_URL]: url });
}

// ============================================
// TIMER STATE STORAGE
// ============================================

export async function getTimerState(): Promise<TimerState> {
  const result = await chrome.storage.local.get(KEYS.TIMER);
  return (
    result[KEYS.TIMER] || {
      activeTimer: null,
      isRunning: false,
      elapsedSeconds: 0,
    }
  );
}

export async function setTimerState(state: TimerState): Promise<void> {
  await chrome.storage.local.set({ [KEYS.TIMER]: state });
}

export async function updateActiveTimer(timer: ActiveTimer | null): Promise<void> {
  const currentState = await getTimerState();
  const newState: TimerState = {
    activeTimer: timer,
    isRunning: timer !== null,
    elapsedSeconds: timer ? calculateElapsed(timer.startTime) : 0,
  };
  await setTimerState(newState);
}

export async function clearTimer(): Promise<void> {
  await setTimerState({
    activeTimer: null,
    isRunning: false,
    elapsedSeconds: 0,
  });
}

// ============================================
// SHORTCUTS STORAGE
// ============================================

export async function getShortcuts(): Promise<TimerShortcut[]> {
  const result = await chrome.storage.local.get(KEYS.SHORTCUTS);
  return result[KEYS.SHORTCUTS] || [];
}

export async function setShortcuts(shortcuts: TimerShortcut[]): Promise<void> {
  await chrome.storage.local.set({ [KEYS.SHORTCUTS]: shortcuts });
}

export async function clearShortcuts(): Promise<void> {
  await chrome.storage.local.remove(KEYS.SHORTCUTS);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateElapsed(startTime: string): number {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

// ============================================
// STORAGE CHANGE LISTENER
// ============================================

export type StorageChangeCallback = (changes: {
  [key: string]: chrome.storage.StorageChange;
}) => void;

export function onStorageChange(callback: StorageChangeCallback): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      callback(changes);
    }
  });
}

// ============================================
// THEME STORAGE
// ============================================

export async function getTheme(): Promise<'light' | 'dark' | 'system'> {
  const result = await chrome.storage.local.get(KEYS.THEME);
  return result[KEYS.THEME] || 'system';
}

export async function setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
  await chrome.storage.local.set({ [KEYS.THEME]: theme });
}

// ============================================
// CLEAR ALL DATA
// ============================================

export async function clearAll(): Promise<void> {
  await chrome.storage.local.clear();
}
