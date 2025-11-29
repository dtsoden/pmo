import type { Message, MessageResponse, TimerShortcut, ActiveTimer } from '@shared/types';
import { formatDuration, getTaskDisplayName } from '@shared/timer';
import { initializeTheme } from '@shared/theme';

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

  // Initialize theme first (applies immediately from storage)
  await initializeTheme();

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
        <div class="group-section">
          <div class="group-header">
            ${escapeHtml(groupName)}
          </div>
          <div class="shortcuts-list">
            ${cards}
          </div>
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
  // Show "Client (bold) with building icon, Project with folder icon" instead of "Project Code - Task"
  const projectInfo = shortcut.task?.project
    ? `🏢 <strong>${escapeHtml(shortcut.task.project.client.name)}</strong> 📁 ${escapeHtml(shortcut.task.project.name)}`
    : 'No task assigned';

  const usageText = `Used ${shortcut.useCount} time${shortcut.useCount !== 1 ? 's' : ''}`;

  // Check if this shortcut is currently running
  // Only mark as active if both have taskIds AND they match
  const isActive = activeTimer && activeTimer.taskId && shortcut.taskId && activeTimer.taskId === shortcut.taskId;
  const activeClass = isActive ? ' active' : '';

  // Add pin emoji before label if pinned
  const labelWithPin = shortcut.isPinned
    ? `📌 ${escapeHtml(shortcut.label)}`
    : escapeHtml(shortcut.label);

  return `
    <div class="shortcut-card${activeClass}" data-shortcut-id="${shortcut.id}">
      <div class="shortcut-color" style="background-color: ${shortcut.color}">
        ${shortcut.icon || '⏱️'}
      </div>
      <div class="shortcut-info">
        <div class="shortcut-label">
          ${labelWithPin}
          ${isActive ? ' <span style="color: #10b981;">●</span>' : ''}
        </div>
        <div class="shortcut-details">
          ${isActive ? '<span class="shortcut-badge" style="background: #d1fae5; color: #065f46;">Running</span>' : ''}
          ${projectInfo} • ${usageText}
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
  chrome.runtime.onMessage.addListener(async (message: Message) => {
    if (message.type === 'TIMER_UPDATED') {
      refreshTimer();
    } else if (message.type === 'SHORTCUTS_UPDATED') {
      // Check if this is a reconnection event (no shortcuts in local state)
      // If so, re-initialize to fetch fresh data
      if (shortcuts.length === 0) {
        console.log('Received shortcuts update with empty local state - user may have reconnected, re-initializing');
        await initialize();
      } else {
        refreshShortcuts();
      }
    } else if (message.type === 'AUTH_EXPIRED') {
      // Session expired, clear state and show empty state
      console.log('Auth expired, clearing sidepanel state');
      shortcuts = [];
      activeTimer = null;
      renderUI();
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
      const data: any = {
        shortcutId: shortcut.id,
      };
      if (shortcut.taskId) {
        data.taskId = shortcut.taskId;
      }

      await sendMessage({
        type: 'START_TIMER',
        data,
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
    const frontendUrl = import.meta.env.VITE_EXTENSION_FRONTEND_URL || 'http://localhost:7620';
    chrome.tabs.create({ url: `${frontendUrl}/settings/timer-shortcuts` });
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
    // Re-render shortcuts to update highlighting
    renderShortcuts();
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
