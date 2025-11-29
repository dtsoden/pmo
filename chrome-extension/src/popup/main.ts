import type {
  Message,
  MessageResponse,
  AuthState,
  TimerShortcut,
  ActiveTimer,
} from '@shared/types';
import { formatDuration, getTaskDisplayName } from '@shared/timer';
import { initializeTheme } from '@shared/theme';

// ============================================
// STATE
// ============================================

let auth: AuthState | null = null;
let activeTimer: ActiveTimer | null = null;
let shortcuts: TimerShortcut[] = [];
let timerInterval: number | null = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');

  // Initialize theme first (applies immediately from storage)
  await initializeTheme();

  await initialize();
  setupEventListeners();
  startTimerInterval();
});

async function initialize() {
  showLoading();

  try {
    // Get auth state
    const authResponse = await sendMessage({ type: 'GET_AUTH' });
    auth = authResponse.data;

    if (!auth?.isAuthenticated) {
      showNotAuthenticated();
      return;
    }

    // Get active timer and shortcuts
    const [timerResponse, shortcutsResponse] = await Promise.all([
      sendMessage({ type: 'GET_ACTIVE_TIMER' }),
      sendMessage({ type: 'GET_SHORTCUTS' }),
    ]);

    activeTimer = timerResponse.data;
    shortcuts = shortcutsResponse.data || [];

    showAuthenticated();
    renderUI();
  } catch (error) {
    console.error('Failed to initialize:', error);
    showNotAuthenticated();
  }
}

// ============================================
// UI RENDERING
// ============================================

function showLoading() {
  getElement('loadingState').classList.remove('hidden');
  getElement('notAuthState').classList.add('hidden');
  getElement('authState').classList.add('hidden');
}

function showNotAuthenticated() {
  getElement('loadingState').classList.add('hidden');
  getElement('notAuthState').classList.remove('hidden');
  getElement('authState').classList.add('hidden');
  updateStatusIndicator(false);
}

function showAuthenticated() {
  getElement('loadingState').classList.add('hidden');
  getElement('notAuthState').classList.add('hidden');
  getElement('authState').classList.remove('hidden');
  updateStatusIndicator(true);
}

function renderUI() {
  renderTimer();
  renderShortcuts();
}

function renderTimer() {
  const noTimerState = getElement('noTimerState');
  const activeTimerState = getElement('activeTimerState');

  if (!activeTimer) {
    noTimerState.classList.remove('hidden');
    activeTimerState.classList.add('hidden');
  } else {
    noTimerState.classList.add('hidden');
    activeTimerState.classList.remove('hidden');
    updateTimerDisplay();
  }
}

function updateTimerDisplay() {
  if (!activeTimer) return;

  const elapsed = Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000);
  getElement('timerTime').textContent = formatDuration(elapsed);
  getElement('timerTask').textContent = activeTimer.task
    ? getTaskDisplayName(activeTimer)
    : activeTimer.description || 'No task selected';
}

function renderShortcuts() {
  const pinnedShortcuts = shortcuts.filter((s) => s.isPinned);
  const grid = getElement('shortcutsGrid');
  const emptyState = getElement('noShortcutsState');

  if (pinnedShortcuts.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = pinnedShortcuts
    .slice(0, 9) // Show max 9 shortcuts in popup (3x3 grid)
    .map((shortcut) => createShortcutButton(shortcut))
    .join('');

  // Attach event listeners
  pinnedShortcuts.slice(0, 9).forEach((shortcut) => {
    const btn = document.querySelector(`[data-shortcut-id="${shortcut.id}"]`);
    if (btn) {
      btn.addEventListener('click', () => handleShortcutClick(shortcut));
    }
  });
}

function createShortcutButton(shortcut: TimerShortcut): string {
  const taskText = shortcut.task
    ? `${shortcut.task.project.code} - ${shortcut.task.title}`
    : 'No task';

  return `
    <button class="shortcut-btn" data-shortcut-id="${shortcut.id}">
      <div class="shortcut-icon">${shortcut.icon || '⏱️'}</div>
      <div class="shortcut-label">${escapeHtml(shortcut.label)}</div>
      <div class="shortcut-task">${escapeHtml(taskText)}</div>
    </button>
  `;
}

function updateStatusIndicator(connected: boolean) {
  const dot = getElement('statusDot');
  const text = getElement('statusText');

  if (connected) {
    dot.classList.remove('inactive');
    text.textContent = 'Connected';
  } else {
    dot.classList.add('inactive');
    text.textContent = 'Not connected';
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupEventListeners() {
  // Timer controls
  getElement('stopBtn')?.addEventListener('click', handleStop);

  // Not authenticated state
  getElement('openWebAppBtn')?.addEventListener('click', handleOpenWebApp);

  // Footer links
  getElement('openSidePanelBtn')?.addEventListener('click', handleOpenSidePanel);
  getElement('manageBtn')?.addEventListener('click', handleManageClick);

  // Listen for background messages
  chrome.runtime.onMessage.addListener(async (message: Message) => {
    if (message.type === 'TIMER_UPDATED') {
      refreshTimer();
    } else if (message.type === 'SHORTCUTS_UPDATED') {
      // If we're not authenticated but receiving shortcuts update,
      // it means user just reconnected - re-initialize
      if (!auth?.isAuthenticated) {
        console.log('Received shortcuts update while not authenticated - user reconnected, re-initializing');
        await initialize();
      } else {
        refreshShortcuts();
      }
    } else if (message.type === 'AUTH_EXPIRED') {
      // Session expired, show not authenticated state
      console.log('Auth expired, updating UI');
      auth = null;
      activeTimer = null;
      shortcuts = [];
      showNotAuthenticated();
    }
  });
}

async function handleShortcutClick(shortcut: TimerShortcut) {
  try {
    const data: any = {
      shortcutId: shortcut.id,
    };
    if (shortcut.taskId) {
      data.taskId = shortcut.taskId;
    }

    const response = await sendMessage({
      type: 'START_TIMER',
      data,
    });

    activeTimer = response.data;
    renderTimer();
    showToast(`Started: ${shortcut.label}`, 'success');
  } catch (error: any) {
    console.error('Failed to start timer:', error);
    showToast(error.message || 'Failed to start timer', 'error');
  }
}

async function handleStop() {
  try {
    await sendMessage({ type: 'STOP_TIMER' });
    activeTimer = null;
    renderTimer();
    showToast('Timer stopped and saved!', 'success');
  } catch (error: any) {
    console.error('Failed to stop timer:', error);
    showToast(error.message || 'Failed to stop timer', 'error');
  }
}

async function handleOpenSidePanel() {
  try {
    // Get current window
    const currentWindow = await chrome.windows.getCurrent();

    // Send message to background to open side panel
    await sendMessage({
      type: 'OPEN_SIDE_PANEL',
      data: { windowId: currentWindow.id },
    });

    // Close popup after opening side panel
    window.close();
  } catch (error) {
    console.error('Failed to open side panel:', error);
    showToast('Could not open side panel', 'error');
  }
}

function handleOpenWebApp() {
  // Link directly to extension settings for reconnection
  const frontendUrl = import.meta.env.VITE_EXTENSION_FRONTEND_URL || 'http://localhost:7620';
  const webUrl = `${frontendUrl}/settings/extension`;

  chrome.tabs.create({ url: webUrl }, (tab) => {
    // Close popup after opening tab for better UX
    window.close();
  });
}

function handleManageClick() {
  const frontendUrl = import.meta.env.VITE_EXTENSION_FRONTEND_URL || 'http://localhost:7620';
  chrome.tabs.create({ url: `${frontendUrl}/settings/timer-shortcuts` });
}

// ============================================
// DATA REFRESH
// ============================================

async function refreshTimer() {
  try {
    const response = await sendMessage({ type: 'GET_ACTIVE_TIMER' });
    activeTimer = response.data;
    renderTimer();
  } catch (error) {
    console.error('Failed to refresh timer:', error);
  }
}

async function refreshShortcuts() {
  try {
    const response = await sendMessage({ type: 'GET_SHORTCUTS' });
    shortcuts = response.data || [];
    renderShortcuts();
  } catch (error) {
    console.error('Failed to refresh shortcuts:', error);
  }
}

// ============================================
// TIMER INTERVAL
// ============================================

function startTimerInterval() {
  // Update timer display every second
  timerInterval = window.setInterval(() => {
    if (activeTimer) {
      updateTimerDisplay();
    }
  }, 1000);
}

// ============================================
// MESSAGING
// ============================================

function sendMessage<T = any>(message: Message): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response?.success) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

// ============================================
// UTILITIES
// ============================================

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element not found: ${id}`);
  return element;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;

  // Trigger reflow to restart animation
  void toast.offsetWidth;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
