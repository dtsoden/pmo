import type {
  Message,
  MessageResponse,
  AuthState,
  TimerShortcut,
  ActiveTimer,
} from '@shared/types';
import { formatDuration, getTaskDisplayName } from '@shared/timer';

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
    .slice(0, 6) // Show max 6 shortcuts in popup
    .map((shortcut) => createShortcutButton(shortcut))
    .join('');

  // Attach event listeners
  pinnedShortcuts.slice(0, 6).forEach((shortcut) => {
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
  getElement('startGenericBtn')?.addEventListener('click', handleStartGeneric);
  getElement('stopBtn')?.addEventListener('click', handleStop);

  // Not authenticated state
  getElement('openWebAppBtn')?.addEventListener('click', handleOpenWebApp);

  // Footer links
  getElement('openSidePanelBtn')?.addEventListener('click', handleOpenSidePanel);
  getElement('manageBtn')?.addEventListener('click', handleManageClick);

  // Listen for background messages
  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message.type === 'TIMER_UPDATED') {
      refreshTimer();
    } else if (message.type === 'SHORTCUTS_UPDATED') {
      refreshShortcuts();
    }
  });
}

async function handleStartGeneric() {
  try {
    const response = await sendMessage({
      type: 'START_TIMER',
      data: {},
    });

    activeTimer = response.data;
    renderTimer();
    showToast('Timer started', 'success');
  } catch (error: any) {
    console.error('Failed to start timer:', error);
    showToast(error.message || 'Failed to start timer', 'error');
  }
}

async function handleShortcutClick(shortcut: TimerShortcut) {
  try {
    const response = await sendMessage({
      type: 'START_TIMER',
      data: {
        taskId: shortcut.taskId,
        shortcutId: shortcut.id,
      },
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
  // Determine web app URL based on environment
  const webUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('chrome-extension')
    ? 'http://localhost:7620/settings/extension'  // Development
    : 'https://pmo.cnxlab.us/settings/extension';  // Production
  chrome.tabs.create({ url: webUrl });
}

function handleManageClick() {
  if (auth?.apiUrl) {
    // Determine web app URL based on environment
    const webUrl = auth.apiUrl.includes('localhost')
      ? 'http://localhost:7620'  // Development
      : 'https://pmo.cnxlab.us';  // Production
    chrome.tabs.create({ url: `${webUrl}/settings/timer-shortcuts` });
  }
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
