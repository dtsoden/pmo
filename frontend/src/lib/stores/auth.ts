// Authentication store for PMO Platform
import { writable, derived, get } from 'svelte/store';
import { api, type User, type Role, type UserPreferences } from '$lib/api/client';
import { browser } from '$app/environment';

// Apply theme to DOM and localStorage
function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (!browser) return;

  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }

  localStorage.setItem('theme', theme);
}

// Load and apply user preferences (theme, etc.)
async function loadAndApplyPreferences() {
  if (!browser) return;

  try {
    const prefs = await api.users.getPreferences();
    if (prefs.theme) {
      applyTheme(prefs.theme);
    }
  } catch (err) {
    // Silently fail - user might not be authenticated yet
    console.warn('Could not load preferences:', err);
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    async initialize() {
      if (!browser) return;

      const token = api.getToken();
      if (!token) {
        update(state => ({ ...state, isInitialized: true }));
        return;
      }

      update(state => ({ ...state, isLoading: true }));

      try {
        const user = await api.auth.me();
        update(state => ({
          ...state,
          user,
          isLoading: false,
          isInitialized: true,
          error: null,
        }));

        // Load and apply user preferences (theme, etc.)
        await loadAndApplyPreferences();
      } catch {
        // Token invalid, clear it
        api.setToken(null);
        update(state => ({
          ...state,
          user: null,
          isLoading: false,
          isInitialized: true,
          error: null,
        }));
      }
    },

    async login(email: string, password: string) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const { token, user } = await api.auth.login(email, password);
        api.setToken(token);
        update(state => ({
          ...state,
          user,
          isLoading: false,
          error: null,
        }));

        // Load and apply user preferences (theme, etc.)
        await loadAndApplyPreferences();

        return { success: true };
      } catch (err) {
        const message = (err as { message?: string })?.message || 'Login failed';
        update(state => ({
          ...state,
          isLoading: false,
          error: message,
        }));
        return { success: false, error: message };
      }
    },

    async register(data: { email: string; password: string; firstName: string; lastName: string }) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const { token, user } = await api.auth.register(data);
        api.setToken(token);
        update(state => ({
          ...state,
          user,
          isLoading: false,
          error: null,
        }));
        return { success: true };
      } catch (err) {
        const message = (err as { message?: string })?.message || 'Registration failed';
        update(state => ({
          ...state,
          isLoading: false,
          error: message,
        }));
        return { success: false, error: message };
      }
    },

    logout() {
      api.setToken(null);
      set({ ...initialState, isInitialized: true });
    },

    clearError() {
      update(state => ({ ...state, error: null }));
    },
  };
}

export const auth = createAuthStore();

// Derived stores for convenience
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.isLoading);
export const isInitialized = derived(auth, $auth => $auth.isInitialized);
export const authError = derived(auth, $auth => $auth.error);
export const userRole = derived(auth, $auth => $auth.user?.role);

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 7,
  ADMIN: 6,
  PMO_MANAGER: 5,
  PROJECT_MANAGER: 4,
  RESOURCE_MANAGER: 3,
  TEAM_MEMBER: 2,
  VIEWER: 1,
};

export function hasRole(requiredRole: Role): boolean {
  const currentUser = get(auth).user;
  if (!currentUser) return false;
  return ROLE_HIERARCHY[currentUser.role] >= ROLE_HIERARCHY[requiredRole];
}

export function hasAnyRole(...roles: Role[]): boolean {
  const currentUser = get(auth).user;
  if (!currentUser) return false;
  return roles.includes(currentUser.role);
}

// Reactive role check as derived store
export function createRoleCheck(requiredRole: Role) {
  return derived(auth, $auth => {
    if (!$auth.user) return false;
    return ROLE_HIERARCHY[$auth.user.role] >= ROLE_HIERARCHY[requiredRole];
  });
}
