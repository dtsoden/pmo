import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  listTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  addSessionToEntry,
  updateSession,
  deleteSession,
  deleteTimeEntry,
  getActiveTimer,
  startTimer,
  stopTimer,
  updateActiveTimer,
  discardTimer,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  type CreateTimeEntryData,
  type AddSessionData,
} from './timetracking.service.js';
import { trackShortcutUse } from '../extension/extension.service.js';

// Validation schemas
const listEntriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  userId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const createEntrySchema = z.object({
  taskId: z.string().uuid().optional(),
  date: z.coerce.date(),
  hours: z.number().positive(),
  description: z.string().optional(),
  isBillable: z.boolean().optional(),
});

const updateEntrySchema = z.object({
  taskId: z.string().uuid().optional(), // Allow changing task for manual entries
  hours: z.number().positive().optional(), // For manual entries only
});

const addSessionSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  description: z.string().optional(),
  isBillable: z.boolean().optional(),
});

const startTimerSchema = z.object({
  taskId: z.string().uuid().optional(),
  description: z.string().optional(),
  shortcutId: z.string().uuid().optional(), // Track which shortcut was used
});

const updateTimerSchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
});

const dailyReportQuerySchema = z.object({
  date: z.coerce.date().optional(),
});

const weeklyReportQuerySchema = z.object({
  weekStart: z.coerce.date().optional(),
});

const monthlyReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function timeTrackingRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // ========== TIME ENTRIES ==========

  // Get all time entries for current user (or specified user if authorized)
  app.get('/entries', async (request, reply) => {
    try {
      const query = listEntriesQuerySchema.parse(request.query);

      // Determine which user's entries to fetch
      const targetUserId = query.userId || request.user.userId;

      // If querying another user's entries, check permissions
      if (targetUserId !== request.user.userId) {
        const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'PMO_MANAGER', 'RESOURCE_MANAGER', 'PROJECT_MANAGER'];
        if (!allowedRoles.includes(request.user.role)) {
          return reply.code(403).send({ error: 'Insufficient permissions to view other users time entries' });
        }
      }

      const result = await listTimeEntries(targetUserId, query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list time entries' });
    }
  });

  // Get time entry by ID
  app.get('/entries/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const entry = await getTimeEntryById(id, request.user.userId);
      return { entry };
    } catch (error: any) {
      if (error.message === 'Time entry not found') {
        return reply.code(404).send({ error: 'Time entry not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get time entry' });
    }
  });

  // Create time entry
  app.post('/entries', async (request, reply) => {
    try {
      const data = createEntrySchema.parse(request.body) as CreateTimeEntryData;
      const entry = await createTimeEntry(request.user.userId, data);
      return reply.code(201).send({ entry });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid time entry data', details: error.errors });
      }
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create time entry' });
    }
  });

  // Update time entry
  app.put('/entries/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateEntrySchema.parse(request.body);
      const entry = await updateTimeEntry(id, request.user.userId, data);
      return { entry };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid time entry data', details: error.errors });
      }
      if (error.message === 'Time entry not found') {
        return reply.code(404).send({ error: 'Time entry not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update time entry' });
    }
  });

  // Delete time entry
  app.delete('/entries/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await deleteTimeEntry(id, request.user.userId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Time entry not found') {
        return reply.code(404).send({ error: 'Time entry not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete time entry' });
    }
  });

  // Add session to existing entry
  app.post('/entries/:id/sessions', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const sessionData = addSessionSchema.parse(request.body) as AddSessionData;
      const entry = await addSessionToEntry(id, request.user.userId, sessionData);
      return reply.code(201).send({ entry });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid session data', details: error.errors });
      }
      if (error.message === 'Time entry not found') {
        return reply.code(404).send({ error: 'Time entry not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to add session' });
    }
  });

  // Update session
  app.put('/sessions/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
      const sessionData = addSessionSchema.parse(request.body) as AddSessionData;
      const entry = await updateSession(sessionId, request.user.userId, sessionData);
      return { entry };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid session data', details: error.errors });
      }
      if (error.message === 'Session not found') {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update session' });
    }
  });

  // Delete session
  app.delete('/sessions/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
      const entry = await deleteSession(sessionId, request.user.userId);
      return { entry };
    } catch (error: any) {
      if (error.message === 'Session not found') {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete session' });
    }
  });

  // ========== ACTIVE TIMER ==========

  // Get active timer
  app.get('/active', async (request, reply) => {
    try {
      const activeEntry = await getActiveTimer(request.user.userId);
      return { activeEntry };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get active timer' });
    }
  });

  // Start timer
  app.post('/start', async (request, reply) => {
    try {
      const data = startTimerSchema.parse(request.body);
      const activeEntry = await startTimer(request.user.userId, data.taskId, data.description);

      // Track shortcut usage if shortcutId provided
      if (data.shortcutId) {
        await trackShortcutUse(data.shortcutId, request.user.userId);
      }

      // Emit WebSocket event for real-time sync
      const io = (app as any).io;
      if (io) {
        io.to(`user:${request.user.userId}`).emit('time:started', activeEntry);
      }

      return reply.code(201).send({ activeEntry });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid timer data', details: error.errors });
      }
      if (error.message?.includes('already running')) {
        return reply.code(409).send({ error: error.message });
      }
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to start timer' });
    }
  });

  // Stop timer (creates time entry)
  app.post('/stop', async (request, reply) => {
    try {
      const entry = await stopTimer(request.user.userId);

      // Emit WebSocket event
      const io = (app as any).io;
      if (io) {
        io.to(`user:${request.user.userId}`).emit('time:stopped', entry);
      }

      return { entry };
    } catch (error: any) {
      if (error.message === 'No active timer') {
        return reply.code(404).send({ error: 'No active timer' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to stop timer' });
    }
  });

  // Update active timer (change task or description)
  app.put('/active', async (request, reply) => {
    try {
      const data = updateTimerSchema.parse(request.body);
      const activeEntry = await updateActiveTimer(
        request.user.userId,
        data.taskId ?? undefined,
        data.description ?? undefined
      );
      return { activeEntry };
    } catch (error: any) {
      if (error.message === 'No active timer') {
        return reply.code(404).send({ error: 'No active timer' });
      }
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update timer' });
    }
  });

  // Discard active timer without saving
  app.delete('/active', async (request, reply) => {
    try {
      await discardTimer(request.user.userId);

      // Emit WebSocket event
      const io = (app as any).io;
      if (io) {
        io.to(`user:${request.user.userId}`).emit('time:discarded', {});
      }

      return { success: true };
    } catch (error: any) {
      if (error.message === 'No active timer') {
        return reply.code(404).send({ error: 'No active timer' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to discard timer' });
    }
  });

  // ========== REPORTS ==========

  // Get daily report
  app.get('/reports/daily', async (request, reply) => {
    try {
      const { date } = dailyReportQuerySchema.parse(request.query);
      const report = await getDailyReport(request.user.userId, date || new Date());
      return { report };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get daily report' });
    }
  });

  // Get weekly report
  app.get('/reports/weekly', async (request, reply) => {
    try {
      const { weekStart } = weeklyReportQuerySchema.parse(request.query);
      // Default to current week (Monday)
      const defaultStart = new Date();
      const day = defaultStart.getDay();
      const diff = defaultStart.getDate() - day + (day === 0 ? -6 : 1);
      defaultStart.setDate(diff);
      defaultStart.setHours(0, 0, 0, 0);

      const report = await getWeeklyReport(request.user.userId, weekStart || defaultStart);
      return { report };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get weekly report' });
    }
  });

  // Get monthly report
  app.get('/reports/monthly', async (request, reply) => {
    try {
      const { year, month } = monthlyReportQuerySchema.parse(request.query);
      const now = new Date();
      const report = await getMonthlyReport(
        request.user.userId,
        year || now.getFullYear(),
        month || now.getMonth() + 1
      );
      return { report };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get monthly report' });
    }
  });
}
