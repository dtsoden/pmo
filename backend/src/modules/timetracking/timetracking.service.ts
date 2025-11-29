import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { Prisma } from '@prisma/client';

// ============================================
// TIME ENTRY OPERATIONS
// ============================================

const timeEntrySelect = {
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
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  date: true,
  hours: true,
  billableHours: true,
  isTimerBased: true,
  sessions: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      duration: true,
      isBillable: true,
      description: true,
      createdAt: true,
    },
    orderBy: {
      startTime: 'asc' as const,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TimeEntrySelect;

export interface ListTimeEntriesParams {
  page?: number;
  limit?: number;
  userId?: string;
  taskId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateTimeEntryData {
  taskId?: string;
  date: Date;
  hours: number;
  description?: string;
  isBillable?: boolean; // For initial session
}

export interface AddSessionData {
  startTime: Date;
  endTime: Date;
  description?: string;
  isBillable?: boolean;
}

export interface UpdateTimeEntryData {
  taskId?: string; // Allow changing task for manual entries
  hours?: number; // For manual entries only
}

export async function listTimeEntries(userId: string, params: ListTimeEntriesParams = {}) {
  const { page = 1, limit = 50, taskId, projectId, startDate, endDate } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.TimeEntryWhereInput = { userId };

  if (taskId) where.taskId = taskId;

  if (projectId) {
    where.task = { projectId };
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
  }

  const [entries, total] = await Promise.all([
    db.timeEntry.findMany({
      where,
      select: timeEntrySelect,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    db.timeEntry.count({ where }),
  ]);

  return {
    data: entries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTimeEntryById(id: string, userId: string) {
  const entry = await db.timeEntry.findUnique({
    where: { id },
    select: timeEntrySelect,
  });

  if (!entry) {
    throw new Error('Time entry not found');
  }

  // Users can only view their own entries (admins bypass in route)
  if (entry.userId !== userId) {
    throw new Error('Time entry not found');
  }

  return entry;
}

export async function createTimeEntry(userId: string, data: CreateTimeEntryData) {
  // Validate task if provided
  if (data.taskId) {
    const task = await db.task.findUnique({ where: { id: data.taskId } });
    if (!task) {
      throw new Error('Task not found');
    }
  }

  const isBillable = data.isBillable ?? true;
  const billableHours = isBillable ? data.hours : 0;

  const entry = await db.timeEntry.create({
    data: {
      userId,
      taskId: data.taskId,
      date: data.date,
      hours: data.hours,
      billableHours,
      sessions: data.description ? {
        create: {
          startTime: data.date,
          endTime: new Date(data.date.getTime() + data.hours * 3600000),
          duration: data.hours,
          isBillable,
          description: data.description,
        },
      } : undefined,
    },
    select: timeEntrySelect,
  });

  // Update task actual hours if linked
  if (data.taskId) {
    await updateTaskActualHours(data.taskId);
  }

  logger.info(`Time entry created for user ${userId}: ${data.hours} hours`);

  return entry;
}

export async function updateTimeEntry(id: string, userId: string, data: UpdateTimeEntryData) {
  const existing = await db.timeEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error('Time entry not found');
  }

  // Only allow updating hours/task for manual entries (not timer-based)
  if (existing.isTimerBased && (data.hours !== undefined || data.taskId !== undefined)) {
    throw new Error('Cannot edit hours or task on timer-based entries');
  }

  // Validate new task if changing
  if (data.taskId && data.taskId !== existing.taskId) {
    const task = await db.task.findUnique({ where: { id: data.taskId } });
    if (!task) {
      throw new Error('Task not found');
    }
  }

  const updateData: any = {};
  if (data.taskId !== undefined) {
    updateData.taskId = data.taskId;
  }
  if (data.hours !== undefined) {
    updateData.hours = data.hours;
    // Also update billableHours based on sessions
    const sessions = await db.timeEntrySession.findMany({
      where: { timeEntryId: id },
      select: { isBillable: true },
    });
    // Assume manual entries have one session - update it proportionally
    if (sessions.length > 0 && sessions[0].isBillable) {
      updateData.billableHours = data.hours;
    }
  }

  const entry = await db.timeEntry.update({
    where: { id },
    data: updateData,
    select: timeEntrySelect,
  });

  // Update task actual hours if task changed or hours changed
  const oldTaskId = existing.taskId;
  const newTaskId = data.taskId ?? existing.taskId;

  if (oldTaskId && oldTaskId !== newTaskId) {
    await updateTaskActualHours(oldTaskId); // Update old task
  }
  if (newTaskId) {
    await updateTaskActualHours(newTaskId); // Update new task
  }

  logger.info(`Time entry updated: ${id}`);

  return entry;
}

// Add a new session to an existing time entry
export async function addSessionToEntry(entryId: string, userId: string, sessionData: AddSessionData) {
  const entry = await db.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId) {
    throw new Error('Time entry not found');
  }

  const duration = (sessionData.endTime.getTime() - sessionData.startTime.getTime()) / (1000 * 60 * 60);
  const isBillable = sessionData.isBillable ?? true;

  // Create the session
  await db.timeEntrySession.create({
    data: {
      timeEntryId: entryId,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      duration,
      isBillable,
      description: sessionData.description,
    },
  });

  // Recalculate total hours and billable hours
  const sessions = await db.timeEntrySession.findMany({
    where: { timeEntryId: entryId },
    select: { duration: true, isBillable: true },
  });

  const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0);
  const billableHours = sessions.filter(s => s.isBillable).reduce((sum, s) => sum + s.duration, 0);

  // Update the entry
  const updated = await db.timeEntry.update({
    where: { id: entryId },
    data: { hours: totalHours, billableHours },
    select: timeEntrySelect,
  });

  // Update task actual hours
  if (entry.taskId) {
    await updateTaskActualHours(entry.taskId);
  }

  logger.info(`Session added to entry ${entryId}: ${duration} hours (billable: ${isBillable})`);

  return updated;
}

export async function deleteTimeEntry(id: string, userId: string) {
  const entry = await db.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) {
    throw new Error('Time entry not found');
  }

  await db.timeEntry.delete({ where: { id } });

  // Update task actual hours
  if (entry.taskId) {
    await updateTaskActualHours(entry.taskId);
  }

  logger.info(`Time entry deleted: ${id}`);

  return { success: true };
}

export async function updateSession(sessionId: string, userId: string, sessionData: AddSessionData) {
  // Find the session and verify ownership
  const session = await db.timeEntrySession.findUnique({
    where: { id: sessionId },
    include: { timeEntry: true },
  });

  if (!session || session.timeEntry.userId !== userId) {
    throw new Error('Session not found');
  }

  const duration = (sessionData.endTime.getTime() - sessionData.startTime.getTime()) / (1000 * 60 * 60);
  const isBillable = sessionData.isBillable ?? session.isBillable;

  // Update the session
  await db.timeEntrySession.update({
    where: { id: sessionId },
    data: {
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      duration,
      isBillable,
      description: sessionData.description,
    },
  });

  // Recalculate total hours and billable hours
  const sessions = await db.timeEntrySession.findMany({
    where: { timeEntryId: session.timeEntryId },
    select: { duration: true, isBillable: true },
  });
  const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0);
  const billableHours = sessions.filter(s => s.isBillable).reduce((sum, s) => sum + s.duration, 0);

  // Update the entry
  const updated = await db.timeEntry.update({
    where: { id: session.timeEntryId },
    data: { hours: totalHours, billableHours },
    select: timeEntrySelect,
  });

  // Update task actual hours
  if (session.timeEntry.taskId) {
    await updateTaskActualHours(session.timeEntry.taskId);
  }

  logger.info(`Session updated: ${sessionId}`);

  return updated;
}

export async function deleteSession(sessionId: string, userId: string) {
  // Find the session and verify ownership
  const session = await db.timeEntrySession.findUnique({
    where: { id: sessionId },
    include: { timeEntry: true },
  });

  if (!session || session.timeEntry.userId !== userId) {
    throw new Error('Session not found');
  }

  const entryId = session.timeEntryId;
  const taskId = session.timeEntry.taskId;

  // Delete the session
  await db.timeEntrySession.delete({ where: { id: sessionId } });

  // Recalculate total hours and billable hours
  const sessions = await db.timeEntrySession.findMany({
    where: { timeEntryId: entryId },
    select: { duration: true, isBillable: true },
  });
  const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0);
  const billableHours = sessions.filter(s => s.isBillable).reduce((sum, s) => sum + s.duration, 0);

  // Update the entry
  const updated = await db.timeEntry.update({
    where: { id: entryId },
    data: { hours: totalHours, billableHours },
    select: timeEntrySelect,
  });

  // Update task actual hours
  if (taskId) {
    await updateTaskActualHours(taskId);
  }

  logger.info(`Session deleted: ${sessionId}`);

  return updated;
}

// Helper to update task's actual hours
async function updateTaskActualHours(taskId: string) {
  const result = await db.timeEntry.aggregate({
    where: { taskId },
    _sum: { hours: true },
  });

  await db.task.update({
    where: { id: taskId },
    data: { actualHours: result._sum.hours || 0 },
  });
}

// ============================================
// ACTIVE TIMER OPERATIONS
// ============================================

export async function getActiveTimer(userId: string) {
  const active = await db.activeTimeEntry.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!active) {
    return null;
  }

  // Get task details if linked
  let task = null;
  if (active.taskId) {
    task = await db.task.findUnique({
      where: { id: active.taskId },
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
    });
  }

  return {
    ...active,
    task,
    elapsedSeconds: Math.floor((Date.now() - active.startTime.getTime()) / 1000),
  };
}

export async function startTimer(userId: string, taskId?: string, description?: string) {
  // Check if already has active timer
  const existing = await db.activeTimeEntry.findUnique({ where: { userId } });
  if (existing) {
    throw new Error('Timer already running. Stop current timer first.');
  }

  // Validate task if provided
  if (taskId) {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }
  }

  const active = await db.activeTimeEntry.create({
    data: {
      userId,
      taskId,
      description,
      startTime: new Date(),
    },
  });

  logger.info(`Timer started for user ${userId}`);

  // Return with task details
  let task = null;
  if (taskId) {
    task = await db.task.findUnique({
      where: { id: taskId },
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
    });
  }

  return {
    ...active,
    task,
    elapsedSeconds: 0,
  };
}

export async function stopTimer(userId: string) {
  const active = await db.activeTimeEntry.findUnique({ where: { userId } });
  if (!active) {
    throw new Error('No active timer');
  }

  const endTime = new Date();
  const duration = (endTime.getTime() - active.startTime.getTime()) / (1000 * 60 * 60);
  const date = new Date(active.startTime);
  date.setHours(0, 0, 0, 0); // Normalize to start of day

  // Find or create TimeEntry for this task/date
  const entry = await db.timeEntry.upsert({
    where: {
      userId_taskId_date: {
        userId,
        taskId: active.taskId || '',
        date,
      },
    },
    create: {
      userId,
      taskId: active.taskId,
      date,
      hours: duration,
      billableHours: duration, // Default billable
      isTimerBased: true, // Mark as timer-based
      sessions: {
        create: {
          startTime: active.startTime,
          endTime,
          duration,
          isBillable: true, // Default billable
          description: active.description,
        },
      },
    },
    update: {
      // Add session and recalculate hours
      sessions: {
        create: {
          startTime: active.startTime,
          endTime,
          duration,
          isBillable: true, // Default billable
          description: active.description,
        },
      },
    },
    select: timeEntrySelect,
  });

  // Recalculate total hours and billable hours (sum of all sessions)
  const sessions = await db.timeEntrySession.findMany({
    where: { timeEntryId: entry.id },
    select: { duration: true, isBillable: true },
  });
  const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0);
  const billableHours = sessions.filter(s => s.isBillable).reduce((sum, s) => sum + s.duration, 0);

  // Update the entry with correct totals
  const updated = await db.timeEntry.update({
    where: { id: entry.id },
    data: { hours: totalHours, billableHours },
    select: timeEntrySelect,
  });

  // Delete active timer
  await db.activeTimeEntry.delete({ where: { userId } });

  // Update task actual hours
  if (active.taskId) {
    await updateTaskActualHours(active.taskId);
  }

  logger.info(`Timer stopped for user ${userId}: ${duration.toFixed(2)} hours (total today: ${totalHours.toFixed(2)}, billable: ${billableHours.toFixed(2)})`);

  return updated;
}

export async function updateActiveTimer(userId: string, taskId?: string, description?: string) {
  const active = await db.activeTimeEntry.findUnique({ where: { userId } });
  if (!active) {
    throw new Error('No active timer');
  }

  // Validate task if changing
  if (taskId && taskId !== active.taskId) {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }
  }

  const updated = await db.activeTimeEntry.update({
    where: { userId },
    data: {
      taskId,
      description,
    },
  });

  return updated;
}

export async function discardTimer(userId: string) {
  const active = await db.activeTimeEntry.findUnique({ where: { userId } });
  if (!active) {
    throw new Error('No active timer');
  }

  await db.activeTimeEntry.delete({ where: { userId } });

  logger.info(`Timer discarded for user ${userId}`);

  return { success: true };
}

// ============================================
// REPORTS
// ============================================

export interface ReportParams {
  userId?: string;
  projectId?: string;
  startDate: Date;
  endDate: Date;
}

export async function getDailyReport(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const entries = await db.timeEntry.findMany({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: timeEntrySelect,
    orderBy: { date: 'asc' },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const billableHours = entries.reduce((sum, e) => sum + (e.billableHours || 0), 0);

  // Group by project
  const byProject: Record<string, { projectId: string; projectName: string; projectCode: string; hours: number; entries: number }> = {};
  for (const entry of entries) {
    if (entry.task?.project) {
      const key = entry.task.project.id;
      if (!byProject[key]) {
        byProject[key] = {
          projectId: entry.task.project.id,
          projectName: entry.task.project.name,
          projectCode: entry.task.project.code,
          hours: 0,
          entries: 0,
        };
      }
      byProject[key].hours += entry.hours || 0;
      byProject[key].entries += 1;
    }
  }

  return {
    date: startOfDay,
    totalHours,
    billableHours,
    nonBillableHours: totalHours - billableHours,
    entryCount: entries.length,
    entries,
    byProject: Object.values(byProject),
  };
}

export async function getWeeklyReport(userId: string, weekStart: Date) {
  const startDate = new Date(weekStart);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const entries = await db.timeEntry.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: timeEntrySelect,
    orderBy: { date: 'asc' },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const billableHours = entries.reduce((sum, e) => sum + (e.billableHours || 0), 0);

  // Group by day
  const byDay: Record<string, { date: string; hours: number; entries: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    byDay[key] = { date: key, hours: 0, entries: 0 };
  }

  for (const entry of entries) {
    const key = entry.date.toISOString().split('T')[0];
    if (byDay[key]) {
      byDay[key].hours += entry.hours || 0;
      byDay[key].entries += 1;
    }
  }

  // Group by project
  const byProject: Record<string, { projectId: string; projectName: string; projectCode: string; hours: number; entries: number }> = {};
  for (const entry of entries) {
    if (entry.task?.project) {
      const key = entry.task.project.id;
      if (!byProject[key]) {
        byProject[key] = {
          projectId: entry.task.project.id,
          projectName: entry.task.project.name,
          projectCode: entry.task.project.code,
          hours: 0,
          entries: 0,
        };
      }
      byProject[key].hours += entry.hours || 0;
      byProject[key].entries += 1;
    }
  }

  return {
    weekStart: startDate,
    weekEnd: endDate,
    totalHours,
    billableHours,
    nonBillableHours: totalHours - billableHours,
    entryCount: entries.length,
    byDay: Object.values(byDay),
    byProject: Object.values(byProject),
  };
}

export async function getMonthlyReport(userId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  const entries = await db.timeEntry.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: timeEntrySelect,
    orderBy: { date: 'asc' },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const billableHours = entries.reduce((sum, e) => sum + (e.billableHours || 0), 0);

  // Group by week
  const byWeek: Record<number, { weekNumber: number; hours: number; entries: number }> = {};
  for (const entry of entries) {
    const weekNum = getWeekNumber(entry.date);
    if (!byWeek[weekNum]) {
      byWeek[weekNum] = { weekNumber: weekNum, hours: 0, entries: 0 };
    }
    byWeek[weekNum].hours += entry.hours || 0;
    byWeek[weekNum].entries += 1;
  }

  // Group by project
  const byProject: Record<string, { projectId: string; projectName: string; projectCode: string; hours: number; entries: number }> = {};
  for (const entry of entries) {
    if (entry.task?.project) {
      const key = entry.task.project.id;
      if (!byProject[key]) {
        byProject[key] = {
          projectId: entry.task.project.id,
          projectName: entry.task.project.name,
          projectCode: entry.task.project.code,
          hours: 0,
          entries: 0,
        };
      }
      byProject[key].hours += entry.hours || 0;
      byProject[key].entries += 1;
    }
  }

  return {
    year,
    month,
    monthStart: startDate,
    monthEnd: endDate,
    totalHours,
    billableHours,
    nonBillableHours: totalHours - billableHours,
    entryCount: entries.length,
    byWeek: Object.values(byWeek).sort((a, b) => a.weekNumber - b.weekNumber),
    byProject: Object.values(byProject),
  };
}

// Helper to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
