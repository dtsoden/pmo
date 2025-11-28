import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { Prisma } from '@prisma/client';

// ============================================
// TIMER SHORTCUT OPERATIONS
// ============================================

const timerShortcutSelect = {
  id: true,
  userId: true,
  taskId: true,
  task: {
    select: {
      id: true,
      title: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },
  label: true,
  description: true,
  color: true,
  icon: true,
  groupName: true,
  sortOrder: true,
  isPinned: true,
  lastUsedAt: true,
  useCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TimerShortcutSelect;

export interface CreateShortcutData {
  taskId?: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  groupName?: string;
  isPinned?: boolean;
}

export interface UpdateShortcutData {
  taskId?: string;
  label?: string;
  description?: string;
  color?: string;
  icon?: string;
  groupName?: string;
  sortOrder?: number;
  isPinned?: boolean;
}

export interface ReorderShortcutData {
  id: string;
  sortOrder: number;
}

/**
 * Get all timer shortcuts for a user
 */
export async function getShortcuts(userId: string) {
  logger.info({ userId }, 'Fetching timer shortcuts');

  const shortcuts = await db.timerShortcut.findMany({
    where: { userId },
    select: timerShortcutSelect,
    orderBy: [
      { isPinned: 'desc' },
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return shortcuts;
}

/**
 * Create a new timer shortcut
 */
export async function createShortcut(userId: string, data: CreateShortcutData) {
  logger.info({ userId, data }, 'Creating timer shortcut');

  // Get the highest sortOrder for this user
  const maxSortOrder = await db.timerShortcut.findFirst({
    where: { userId },
    select: { sortOrder: true },
    orderBy: { sortOrder: 'desc' },
  });

  const sortOrder = (maxSortOrder?.sortOrder ?? -1) + 1;

  // Validate task exists if provided
  if (data.taskId) {
    const task = await db.task.findUnique({
      where: { id: data.taskId },
      select: { id: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }
  }

  const shortcut = await db.timerShortcut.create({
    data: {
      userId,
      taskId: data.taskId,
      label: data.label,
      description: data.description,
      color: data.color,
      icon: data.icon,
      groupName: data.groupName,
      isPinned: data.isPinned ?? false,
      sortOrder,
    },
    select: timerShortcutSelect,
  });

  logger.info({ shortcutId: shortcut.id }, 'Timer shortcut created');

  return shortcut;
}

/**
 * Update a timer shortcut
 */
export async function updateShortcut(id: string, userId: string, data: UpdateShortcutData) {
  logger.info({ id, userId, data }, 'Updating timer shortcut');

  // Verify ownership
  const existing = await db.timerShortcut.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    throw new Error('Shortcut not found');
  }

  if (existing.userId !== userId) {
    throw new Error('Not authorized to update this shortcut');
  }

  // Validate task exists if provided
  if (data.taskId !== undefined) {
    if (data.taskId === null) {
      // Allow setting to null
    } else {
      const task = await db.task.findUnique({
        where: { id: data.taskId },
        select: { id: true },
      });

      if (!task) {
        throw new Error('Task not found');
      }
    }
  }

  const shortcut = await db.timerShortcut.update({
    where: { id },
    data: {
      taskId: data.taskId,
      label: data.label,
      description: data.description,
      color: data.color,
      icon: data.icon,
      groupName: data.groupName,
      sortOrder: data.sortOrder,
      isPinned: data.isPinned,
    },
    select: timerShortcutSelect,
  });

  logger.info({ shortcutId: id }, 'Timer shortcut updated');

  return shortcut;
}

/**
 * Delete a timer shortcut
 * If there's an active timer for this shortcut's task, it will be stopped first
 */
export async function deleteShortcut(id: string, userId: string) {
  logger.info({ id, userId }, 'Deleting timer shortcut');

  // Verify ownership and get shortcut details
  const existing = await db.timerShortcut.findUnique({
    where: { id },
    select: { userId: true, taskId: true },
  });

  if (!existing) {
    throw new Error('Shortcut not found');
  }

  if (existing.userId !== userId) {
    throw new Error('Not authorized to delete this shortcut');
  }

  // Check if there's an active timer running for this task
  let stoppedTimer = false;
  if (existing.taskId) {
    const activeTimer = await db.activeTimeEntry.findUnique({
      where: { userId },
      select: { taskId: true },
    });

    if (activeTimer && activeTimer.taskId === existing.taskId) {
      // Stop the timer (discard it - don't save as entry)
      await db.activeTimeEntry.delete({
        where: { userId },
      });
      stoppedTimer = true;
      logger.info({ shortcutId: id }, 'Active timer stopped before deleting shortcut');
    }
  }

  await db.timerShortcut.delete({
    where: { id },
  });

  logger.info({ shortcutId: id, stoppedTimer }, 'Timer shortcut deleted');

  return { stoppedTimer };
}

/**
 * Bulk reorder timer shortcuts
 */
export async function reorderShortcuts(userId: string, shortcuts: ReorderShortcutData[]) {
  logger.info({ userId, count: shortcuts.length }, 'Reordering timer shortcuts');

  // Verify all shortcuts belong to user
  const existingShortcuts = await db.timerShortcut.findMany({
    where: {
      id: { in: shortcuts.map((s) => s.id) },
    },
    select: { id: true, userId: true },
  });

  if (existingShortcuts.some((s) => s.userId !== userId)) {
    throw new Error('Not authorized to reorder these shortcuts');
  }

  // Update in transaction
  await db.$transaction(
    shortcuts.map((shortcut) =>
      db.timerShortcut.update({
        where: { id: shortcut.id },
        data: { sortOrder: shortcut.sortOrder },
      })
    )
  );

  logger.info({ userId }, 'Timer shortcuts reordered');
}

/**
 * Track shortcut usage (increment useCount and update lastUsedAt)
 */
export async function trackShortcutUse(shortcutId: string, userId: string) {
  logger.debug({ shortcutId, userId }, 'Tracking shortcut use');

  // Verify ownership
  const existing = await db.timerShortcut.findUnique({
    where: { id: shortcutId },
    select: { userId: true },
  });

  if (!existing) {
    logger.warn({ shortcutId }, 'Shortcut not found for tracking');
    return;
  }

  if (existing.userId !== userId) {
    logger.warn({ shortcutId, userId }, 'User does not own shortcut');
    return;
  }

  await db.timerShortcut.update({
    where: { id: shortcutId },
    data: {
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  logger.debug({ shortcutId }, 'Shortcut use tracked');
}
