import { getTheme } from './storage.js';

/**
 * Apply theme to the document
 * Matches the logic from frontend/src/routes/(app)/settings/appearance/+page.svelte
 */
export async function applyTheme(theme?: 'light' | 'dark' | 'system'): Promise<void> {
  const selectedTheme = theme || (await getTheme());

  if (selectedTheme === 'system') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
    console.log('🎨 Applied system theme:', prefersDark ? 'dark' : 'light');
  } else {
    // Use explicit theme
    document.documentElement.classList.toggle('dark', selectedTheme === 'dark');
    console.log('🎨 Applied theme:', selectedTheme);
  }
}

/**
 * Initialize theme system
 * - Applies current theme
 * - Listens for system theme changes (if theme is 'system')
 * - Listens for theme updates from service worker
 */
export async function initializeTheme(): Promise<void> {
  // Apply initial theme
  await applyTheme();

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const theme = await getTheme();
    if (theme === 'system') {
      await applyTheme('system');
    }
  });

  // Listen for theme updates from service worker (via WebSocket)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'THEME_UPDATED') {
      console.log('📢 Received THEME_UPDATED message:', message.theme);
      applyTheme(message.theme);
    }
  });
}
