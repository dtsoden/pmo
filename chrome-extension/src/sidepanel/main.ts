import type { Message, MessageResponse, TimerShortcut, ActiveTimer } from '@shared/types';
import { formatDuration, getTaskDisplayName } from '@shared/timer';

// ============================================
// STATE
// ============================================

let shortcuts: TimerShortcut[] = [];
let activeTimer: ActiveTimer | null = null;
let timerInterval: number | null = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Side panel loaded');
  await initialize();
  setupEventListeners();
  startTimerInterval();
});

async function initialize() {
  try {
    const [shortcutsResponse, timerResponse] = await Promise.all([
      sendMessage({ type: 'GET_SHORTCUTS' }),
      sendMessage({ type: 'GET_ACTIVE_TIMER' }),
    ]);

    shortcuts = shortcutsResponse.data || [];
    activeTimer = timerResponse.data;

    renderUI();
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// ============================================
// UI RENDERING
// ============================================

function renderUI() {
  renderShortcuts();
  updateTimerStatus();
}

function renderShortcuts() {
  const list = document.getElementById('shortcutsList')!;
  const emptyState = document.getElementById('emptyState')!;

  if (shortcuts.length === 0) {
    list.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Group shortcuts by groupName
  const grouped = new Map<string, TimerShortcut[]>();
  shortcuts.forEach((shortcut) => {
    const group = shortcut.groupName || 'Ungrouped';
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(shortcut);
  });

  // Render grouped shortcuts
  list.innerHTML = Array.from(grouped.entries())
    .map(([groupName, items]) => {
      const cards = items.map((shortcut) => createShortcutCard(shortcut)).join('');
      return `
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
            ${escapeHtml(groupName)}
          </div>
          ${cards}
        </div>
      `;
    })
    .join('');

  // Attach event listeners
  shortcuts.forEach((shortcut) => {
    const card = document.querySelector(`[data-shortcut-id="${shortcut.id}"]`);
    if (card) {
      card.addEventListener('click', () => handleShortcutClick(shortcut));
    }
  });
}

function createShortcutCard(shortcut: TimerShortcut): string {
  const taskText = shortcut.task
    ? `${shortcut.task.project.code} - ${shortcut.task.title}`
    : 'No task assigned';

  const usageText = `Used ${shortcut.useCount} time${shortcut.useCount !== 1 ? 's' : ''}`;

  // Check if this shortcut is currently running
  const isActive = activeTimer && activeTimer.taskId === shortcut.taskId;
  const activeClass = isActive ? ' active' : '';

  return `
    <div class="shortcut-card${activeClass}" data-shortcut-id="${shortcut.id}">
      <div class="shortcut-color" style="background-color: ${shortcut.color}">
        ${shortcut.icon || '⏱️'}
      </div>
      <div class="shortcut-info">
        <div class="shortcut-label">
          ${escapeHtml(shortcut.label)}
          ${isActive ? ' <span style="color: #10b981;">●</span>' : ''}
        </div>
        <div class="shortcut-details">
          ${shortcut.isPinned ? '<span class="shortcut-badge">Pinned</span>' : ''}
          ${isActive ? '<span class="shortcut-badge" style="background: #d1fae5; color: #065f46;">Running</span>' : ''}
          ${escapeHtml(taskText)} • ${usageText}
        </div>
      </div>
    </div>
  `;
}

function updateTimerStatus() {
  const timerStatus = document.getElementById('timerStatus')!;
  const timerTime = document.getElementById('timerTime')!;
  const timerTask = document.getElementById('timerTask')!;

  if (!activeTimer) {
    timerStatus.classList.add('inactive');
    timerTime.textContent = 'No active timer';
    timerTask.textContent = '';
  } else {
    timerStatus.classList.remove('inactive');
    const elapsed = Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000);
    timerTime.textContent = formatDuration(elapsed);
    const taskText = activeTimer.task
      ? `${activeTimer.task.project.code} - ${activeTimer.task.title}`
      : activeTimer.description || 'No task';
    timerTask.textContent = taskText;
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupEventListeners() {
  document.getElementById('manageBtn')?.addEventListener('click', handleManageClick);
  document.getElementById('manageBtn2')?.addEventListener('click', handleManageClick);

  // Listen for background messages
  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message.type === 'TIMER_UPDATED') {
      refreshTimer();
    } else if (message.type === 'SHORTCUTS_UPDATED') {
      refreshShortcuts();
    }
  });
}

async function handleShortcutClick(shortcut: TimerShortcut) {
  try {
    // Check if this shortcut's task is already running
    const isRunning = activeTimer && activeTimer.taskId === shortcut.taskId;

    if (isRunning) {
      // Stop the currently running timer
      await sendMessage({ type: 'STOP_TIMER' });
      showToast(`Stopped: ${shortcut.label}`, 'success');
    } else {
      // If another timer is running, stop it first
      if (activeTimer) {
        await sendMessage({ type: 'STOP_TIMER' });
      }

      // Start the new timer
      await sendMessage({
        type: 'START_TIMER',
        data: {
          taskId: shortcut.taskId,
          shortcutId: shortcut.id,
        },
      });

      showToast(`Started: ${shortcut.label}`, 'success');
    }

    // Refresh will happen via message listener
  } catch (error: any) {
    console.error('Failed to handle timer:', error);
    showToast(error.message || 'Failed to handle timer', 'error');
  }
}

async function handleManageClick() {
  try {
    // Get auth state to determine URL
    const authResponse = await sendMessage({ type: 'GET_AUTH' });
    const auth = authResponse.data;

    if (auth?.apiUrl) {
      // Determine web app URL based on environment
      const webUrl = auth.apiUrl.includes('localhost')
        ? 'http://localhost:7620'  // Development
        : 'https://pmo.cnxlab.us';  // Production
      chrome.tabs.create({ url: `${webUrl}/settings/timer-shortcuts` });
    }
  } catch (error) {
    console.error('Failed to open manage page:', error);
  }
}

// ============================================
// DATA REFRESH
// ============================================

async function refreshTimer() {
  try {
    const response = await sendMessage({ type: 'GET_ACTIVE_TIMER' });
    activeTimer = response.data;
    updateTimerStatus();
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
  timerInterval = window.setInterval(() => {
    if (activeTimer) {
      updateTimerStatus();
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
