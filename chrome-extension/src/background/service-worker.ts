import { api } from '@shared/api';
import { websocket, onTimerStarted, onTimerStopped, onTimerDiscarded, onShortcutsUpdated, onTimerUpdated, onPreferencesUpdated } from '@shared/websocket';
import {
  getAuth,
  setAuth,
  clearAuth,
  getShortcuts,
  setShortcuts,
  updateActiveTimer,
  clearTimer,
  getApiUrl,
  setApiUrl,
  getTheme,
  setTheme,
} from '@shared/storage';
import type {
  Message,
  MessageResponse,
  AuthState,
  TimerShortcut,
  ActiveTimer,
  StartTimerData,
  CreateShortcutData,
  UpdateShortcutData,
} from '@shared/types';

console.log('PMO Timer Extension: Service worker loaded');

// ============================================
// INITIALIZATION
// ============================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);

  // Create context menu for opening side panel
  chrome.contextMenus.create({
    id: 'open-side-panel',
    title: 'Open PMO Timer Side Panel',
    contexts: ['action'],
  });

  // Inject content script into all existing tabs that match our patterns
  if (details.reason === 'install' || details.reason === 'update') {
    const tabs = await chrome.tabs.query({});
    const pmoUrlPatterns = [
      /^http:\/\/localhost:7620\//,
      /^https:\/\/pmo\.cnxlab\.us\//,
      /^https:\/\/pmoservices\.cnxlab\.us\//,
      /^https:\/\/.*\.azurecontainerapps\.io\//,
    ];

    for (const tab of tabs) {
      if (tab.id && tab.url && pmoUrlPatterns.some(pattern => pattern.test(tab.url!))) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/auth-listener.js'],
          });
          console.log(`Injected content script into tab ${tab.id}`);
        } catch (error) {
          // Tab might not support script injection (e.g., chrome:// pages)
          console.log(`Could not inject into tab ${tab.id}:`, error);
        }
      }
    }
  }

  await initializeExtension();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension started');
  await initializeExtension();
});

/**
 * Setup auth expiration handler
 * This must be called both during initialization and reconnection
 * to ensure 401 errors are properly handled at all times
 */
function setupAuthExpirationHandler() {
  api.onAuthExpired(async () => {
    console.log('🔓 Auth expired (401), automatically clearing extension state');
    await clearAuth();
    websocket.disconnect();
    api.setToken(null);
    await clearTimer();
    // NOTE: Do NOT clear shortcuts - they should persist locally even when logged out
    // Users can reconnect without losing their configured shortcuts

    // Notify all extension UI components that auth is cleared
    broadcastToAllTabs({ type: 'AUTH_EXPIRED' });
    console.log('   - Auth cleared, UI notified (shortcuts preserved in storage)');
  });
}

async function initializeExtension() {
  try {
    // Set up automatic auth clearing on 401 errors
    setupAuthExpirationHandler();

    const auth = await getAuth();
    if (auth?.token) {
      const apiUrl = await getApiUrl();
      api.setBaseUrl(apiUrl);
      api.setToken(auth.token);

      // Connect WebSocket
      websocket.setUrl(apiUrl);
      websocket.connect(auth.token);

      // Fetch initial data
      await syncData();

      // Notify UI that data is ready
      broadcastToAllTabs({ type: 'SHORTCUTS_UPDATED' });
      broadcastToAllTabs({ type: 'TIMER_UPDATED' });

      console.log('Extension initialized with existing auth');
    } else {
      console.log('No auth found, waiting for installation');
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

async function syncData() {
  try {
    // Fetch shortcuts, active timer, and user preferences
    const [shortcuts, activeTimer, preferences] = await Promise.all([
      api.getShortcuts(),
      api.getActiveTimer(),
      api.getPreferences(),
    ]);

    await setShortcuts(shortcuts);
    await updateActiveTimer(activeTimer);

    // Sync theme preference
    if (preferences.theme) {
      await setTheme(preferences.theme);
    }

    console.log('Data synced:', { shortcuts: shortcuts.length, hasActiveTimer: !!activeTimer, theme: preferences.theme || 'system' });
  } catch (error) {
    console.error('Failed to sync data:', error);
  }
}

// ============================================
// WEBSOCKET EVENT HANDLERS
// ============================================

onTimerStarted(async (event) => {
  console.log('Timer started event:', event);
  await updateActiveTimer(event.activeEntry);
  broadcastToAllTabs({ type: 'TIMER_UPDATED' });
});

onTimerStopped(async (event) => {
  console.log('Timer stopped event:', event);
  await clearTimer();
  broadcastToAllTabs({ type: 'TIMER_UPDATED' });
});

onTimerDiscarded(async () => {
  console.log('Timer discarded event');
  await clearTimer();
  broadcastToAllTabs({ type: 'TIMER_UPDATED' });
});

onTimerUpdated(async (event) => {
  console.log('Timer updated event:', event);
  await updateActiveTimer(event.activeEntry);
  broadcastToAllTabs({ type: 'TIMER_UPDATED' });
});

onShortcutsUpdated(async (event) => {
  console.log('📢 SHORTCUTS UPDATED EVENT RECEIVED:', event);
  // Refetch all shortcuts
  try {
    const shortcuts = await api.getShortcuts();
    console.log('   - Fetched shortcuts count:', shortcuts.length);
    await setShortcuts(shortcuts);
    console.log('   - Stored shortcuts in storage');
    broadcastToAllTabs({ type: 'SHORTCUTS_UPDATED' });
    console.log('   - Broadcast SHORTCUTS_UPDATED to all tabs/panels');
  } catch (error) {
    console.error('❌ Error handling shortcuts update:', error);
  }
});

onPreferencesUpdated(async (event) => {
  console.log('📢 PREFERENCES UPDATED EVENT RECEIVED:', event);
  if (event.theme) {
    try {
      console.log('   - Theme changed to:', event.theme);
      await setTheme(event.theme);
      console.log('   - Stored theme in storage');
      broadcastToAllTabs({ type: 'THEME_UPDATED', theme: event.theme });
      console.log('   - Broadcast THEME_UPDATED to all tabs/panels');
    } catch (error) {
      console.error('❌ Error handling theme update:', error);
    }
  }
});

// ============================================
// MESSAGE HANDLERS
// ============================================

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((error) => {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    });

  // Return true to indicate async response
  return true;
});

async function handleMessage(message: Message): Promise<MessageResponse> {
  console.log('Received message:', message.type);

  switch (message.type) {
    case 'INIT':
      return handleInit(message.data);

    case 'GET_AUTH':
      return handleGetAuth();

    case 'SET_AUTH':
      return handleSetAuth(message.data);

    case 'LOGOUT':
      return handleLogout();

    case 'GET_SHORTCUTS':
      return handleGetShortcuts();

    case 'CREATE_SHORTCUT':
      return handleCreateShortcut(message.data);

    case 'UPDATE_SHORTCUT':
      return handleUpdateShortcut(message.data);

    case 'DELETE_SHORTCUT':
      return handleDeleteShortcut(message.data);

    case 'GET_ACTIVE_TIMER':
      return handleGetActiveTimer();

    case 'START_TIMER':
      return handleStartTimer(message.data);

    case 'STOP_TIMER':
      return handleStopTimer();

    case 'DISCARD_TIMER':
      return handleDiscardTimer();

    case 'OPEN_SIDE_PANEL':
      return handleOpenSidePanel(message.data);

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// ============================================
// CONTEXT MENU HANDLER
// ============================================

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-side-panel' && tab?.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// ============================================
// MESSAGE HANDLER IMPLEMENTATIONS
// ============================================

async function handleInit(data: { token: string; apiUrl: string }): Promise<MessageResponse> {
  console.log('🔄 Handling INIT/reconnection request');
  const { token, apiUrl } = data;

  try {
    // Re-establish auth expiration handler (critical for reconnection)
    setupAuthExpirationHandler();
    console.log('   - Auth expiration handler re-established');

    api.setBaseUrl(apiUrl);
    api.setToken(token);

    await setApiUrl(apiUrl);

    // Validate token by calling install endpoint
    console.log('   - Validating token with backend...');
    const response = await api.install();
    console.log('   - ✅ Token validated');

    // Store auth state
    const auth: AuthState = {
      token,
      user: {
        id: response.user.id,
        email: response.user.email,
        firstName: '',
        lastName: '',
        role: response.user.role,
      },
      apiUrl,
      isAuthenticated: true,
    };

    await setAuth(auth);
    console.log('   - Auth state saved');

    // Connect WebSocket
    websocket.setUrl(apiUrl);
    websocket.connect(token);
    console.log('   - WebSocket connected');

    // Fetch initial data
    await syncData();
    console.log('   - Initial data synced');

    // CRITICAL: Notify UI components that data has been refreshed
    // This ensures shortcuts and active timer appear immediately after reconnection
    broadcastToAllTabs({ type: 'SHORTCUTS_UPDATED' });
    broadcastToAllTabs({ type: 'TIMER_UPDATED' });
    console.log('   - UI notified of data refresh');

    console.log('🎉 Reconnection successful!');
    return { success: true, data: auth };
  } catch (error: any) {
    console.error('❌ Reconnection failed:', error);
    // Make sure to return the error properly
    throw new Error(error.message || 'Failed to reconnect extension');
  }
}

async function handleGetAuth(): Promise<MessageResponse> {
  const auth = await getAuth();
  return { success: true, data: auth };
}

async function handleSetAuth(data: AuthState): Promise<MessageResponse> {
  await setAuth(data);
  api.setToken(data.token);
  api.setBaseUrl(data.apiUrl);

  if (data.token) {
    websocket.setUrl(data.apiUrl);
    websocket.connect(data.token);
    await syncData();
  }

  return { success: true };
}

async function handleLogout(): Promise<MessageResponse> {
  await clearAuth();
  websocket.disconnect();
  api.setToken(null);
  await clearTimer();
  await setShortcuts([]);

  return { success: true };
}

async function handleGetShortcuts(): Promise<MessageResponse> {
  const shortcuts = await getShortcuts();
  return { success: true, data: shortcuts };
}

async function handleCreateShortcut(data: CreateShortcutData): Promise<MessageResponse> {
  const shortcut = await api.createShortcut(data);

  // Update cache
  const shortcuts = await getShortcuts();
  await setShortcuts([...shortcuts, shortcut]);

  broadcastToAllTabs({ type: 'SHORTCUTS_UPDATED' });

  return { success: true, data: shortcut };
}

async function handleUpdateShortcut(data: {
  id: string;
  updates: UpdateShortcutData;
}): Promise<MessageResponse> {
  const shortcut = await api.updateShortcut(data.id, data.updates);

  // Update cache
  const shortcuts = await getShortcuts();
  const updated = shortcuts.map((s) => (s.id === data.id ? shortcut : s));
  await setShortcuts(updated);

  broadcastToAllTabs({ type: 'SHORTCUTS_UPDATED' });

  return { success: true, data: shortcut };
}

async function handleDeleteShortcut(data: { id: string }): Promise<MessageResponse> {
  await api.deleteShortcut(data.id);

  // Update cache
  const shortcuts = await getShortcuts();
  const filtered = shortcuts.filter((s) => s.id !== data.id);
  await setShortcuts(filtered);

  broadcastToAllTabs({ type: 'SHORTCUTS_UPDATED' });

  return { success: true };
}

async function handleGetActiveTimer(): Promise<MessageResponse> {
  const timer = await api.getActiveTimer();
  await updateActiveTimer(timer);
  return { success: true, data: timer };
}

async function handleStartTimer(data: StartTimerData): Promise<MessageResponse> {
  const timer = await api.startTimer(data);
  await updateActiveTimer(timer);

  broadcastToAllTabs({ type: 'TIMER_UPDATED' });

  return { success: true, data: timer };
}

async function handleStopTimer(): Promise<MessageResponse> {
  await api.stopTimer();
  await clearTimer();

  broadcastToAllTabs({ type: 'TIMER_UPDATED' });

  return { success: true };
}

async function handleDiscardTimer(): Promise<MessageResponse> {
  await api.discardTimer();
  await clearTimer();

  broadcastToAllTabs({ type: 'TIMER_UPDATED' });

  return { success: true };
}

async function handleOpenSidePanel(data: { windowId?: number }): Promise<MessageResponse> {
  try {
    const windowId = data?.windowId ?? (await chrome.windows.getCurrent()).id;
    if (!windowId) {
      throw new Error('No window ID available');
    }
    await chrome.sidePanel.open({ windowId });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function broadcastToAllTabs(message: Message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Ignore errors when no receivers
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(title: string, message: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title,
    message,
  });
}

// Export for testing (not actually exported in service worker, but helps with type checking)
export {};
