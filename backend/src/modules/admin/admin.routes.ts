import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';

// Services
import {
  listAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  listLoginAttempts,
  getLoginAttemptStats,
} from './audit.service.js';

import {
  getAllSettings,
  getSettingsByCategory,
  updateSetting,
  resetCategoryToDefaults,
  initializeDefaultSettings,
  SettingCategory,
} from './settings.service.js';

import {
  getDashboardStats,
  listSessions,
  getUserSessions,
  terminateSession,
  terminateAllUserSessions,
  unlockUserAccount,
  forcePasswordReset,
  getSystemHealth,
} from './admin.service.js';

import dropdownsRoutes from './dropdowns.routes.js';

// Validation schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const auditLogQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  status: z.enum(['SUCCESS', 'FAILURE']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const loginAttemptQuerySchema = paginationSchema.extend({
  email: z.string().optional(),
  success: z.coerce.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const sessionQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const categoryParamSchema = z.object({
  category: z.enum(['security', 'notifications', 'platform', 'integrations']),
});

const settingUpdateSchema = z.object({
  value: z.any(),
});

const passwordResetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Admin role check middleware
async function requireAdminRole(request: any, reply: any) {
  const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
  if (!adminRoles.includes(request.user.role)) {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

// Get client IP and user agent from request
function getRequestContext(request: any) {
  return {
    ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
    userAgent: request.headers['user-agent'] || undefined,
  };
}

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require authentication
  app.addHook('onRequest', app.authenticate);
  // All admin routes require ADMIN or SUPER_ADMIN role
  app.addHook('onRequest', requireAdminRole);

  // Initialize default settings on startup
  await initializeDefaultSettings();

  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * GET /api/admin/dashboard
   * Get admin dashboard statistics
   */
  app.get('/dashboard', async (request, reply) => {
    try {
      const stats = await getDashboardStats();
      return stats;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get dashboard stats' });
    }
  });

  /**
   * GET /api/admin/health
   * Get system health status
   */
  app.get('/health', async (request, reply) => {
    try {
      const health = await getSystemHealth();
      return health;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get system health' });
    }
  });

  // ============================================
  // AUDIT LOGS
  // ============================================

  /**
   * GET /api/admin/audit-logs
   * List audit logs with filtering
   */
  app.get('/audit-logs', async (request, reply) => {
    try {
      const query = auditLogQuerySchema.parse(request.query);
      const result = await listAuditLogs(query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list audit logs' });
    }
  });

  /**
   * GET /api/admin/audit-logs/stats
   * Get audit log statistics
   */
  app.get('/audit-logs/stats', async (request, reply) => {
    try {
      const { startDate, endDate } = z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }).parse(request.query);

      const stats = await getAuditLogStats(startDate, endDate);
      return stats;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get audit stats' });
    }
  });

  /**
   * GET /api/admin/audit-logs/:id
   * Get a single audit log entry
   */
  app.get('/audit-logs/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const log = await getAuditLogById(id);

      if (!log) {
        return reply.code(404).send({ error: 'Audit log not found' });
      }

      return { log };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid ID format' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get audit log' });
    }
  });

  // ============================================
  // LOGIN ATTEMPTS
  // ============================================

  /**
   * GET /api/admin/login-attempts
   * List login attempts
   */
  app.get('/login-attempts', async (request, reply) => {
    try {
      const query = loginAttemptQuerySchema.parse(request.query);
      const result = await listLoginAttempts(query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list login attempts' });
    }
  });

  /**
   * GET /api/admin/login-attempts/stats
   * Get login attempt statistics
   */
  app.get('/login-attempts/stats', async (request, reply) => {
    try {
      const { hours } = z.object({
        hours: z.coerce.number().positive().optional(),
      }).parse(request.query);

      const stats = await getLoginAttemptStats(hours);
      return stats;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get login stats' });
    }
  });

  // ============================================
  // SETTINGS
  // ============================================

  /**
   * GET /api/admin/settings
   * Get all settings grouped by category
   */
  app.get('/settings', async (request, reply) => {
    try {
      const settings = await getAllSettings();
      return { settings };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get settings' });
    }
  });

  /**
   * GET /api/admin/settings/:category
   * Get settings for a specific category
   */
  app.get('/settings/:category', async (request, reply) => {
    try {
      const { category } = categoryParamSchema.parse(request.params);
      const settings = await getSettingsByCategory(category);
      return { category, settings };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid category' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get settings' });
    }
  });

  /**
   * PUT /api/admin/settings/:category/:key
   * Update a specific setting
   */
  app.put('/settings/:category/:key', async (request, reply) => {
    try {
      const { category } = categoryParamSchema.parse(request.params);
      const { key } = z.object({ key: z.string() }).parse(request.params);
      const { value } = settingUpdateSchema.parse(request.body);
      const ctx = getRequestContext(request);

      const setting = await updateSetting({
        category,
        key,
        value,
        updatedBy: request.user.userId,
        ...ctx,
      });

      return { setting };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update setting' });
    }
  });

  /**
   * POST /api/admin/settings/:category/reset
   * Reset a category to default settings
   */
  app.post('/settings/:category/reset', async (request, reply) => {
    try {
      const { category } = categoryParamSchema.parse(request.params);
      const ctx = getRequestContext(request);

      const settings = await resetCategoryToDefaults(
        category,
        request.user.userId,
        ctx.ipAddress,
        ctx.userAgent
      );

      return { category, settings, message: 'Settings reset to defaults' };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid category' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to reset settings' });
    }
  });

  // ============================================
  // SESSIONS
  // ============================================

  /**
   * GET /api/admin/sessions
   * List active sessions
   */
  app.get('/sessions', async (request, reply) => {
    try {
      const query = sessionQuerySchema.parse(request.query);
      const result = await listSessions(query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list sessions' });
    }
  });

  /**
   * GET /api/admin/sessions/user/:id
   * Get sessions for a specific user
   */
  app.get('/sessions/user/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const sessions = await getUserSessions(id);
      return { sessions };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid user ID' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get user sessions' });
    }
  });

  /**
   * DELETE /api/admin/sessions/:id
   * Terminate a specific session
   */
  app.delete('/sessions/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const ctx = getRequestContext(request);

      await terminateSession(id, request.user.userId, ctx.ipAddress, ctx.userAgent);

      return { success: true, message: 'Session terminated' };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid session ID' });
      }
      if (error.message === 'Session not found') {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to terminate session' });
    }
  });

  /**
   * DELETE /api/admin/sessions/user/:id
   * Terminate all sessions for a user
   */
  app.delete('/sessions/user/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const ctx = getRequestContext(request);

      const result = await terminateAllUserSessions(id, request.user.userId, ctx.ipAddress, ctx.userAgent);

      return { success: true, ...result };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid user ID' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to terminate sessions' });
    }
  });

  // ============================================
  // USER MANAGEMENT (Admin-specific actions)
  // ============================================

  /**
   * POST /api/admin/users/:id/unlock
   * Unlock a user account
   */
  app.post('/users/:id/unlock', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const ctx = getRequestContext(request);

      const result = await unlockUserAccount(id, request.user.userId, ctx.ipAddress, ctx.userAgent);

      return { success: true, ...result };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid user ID' });
      }
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to unlock user' });
    }
  });

  /**
   * POST /api/admin/users/:id/reset-password
   * Force password reset for a user
   */
  app.post('/users/:id/reset-password', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const { newPassword } = passwordResetSchema.parse(request.body);
      const ctx = getRequestContext(request);

      const result = await forcePasswordReset(id, newPassword, request.user.userId, ctx.ipAddress, ctx.userAgent);

      return { success: true, message: 'Password reset successfully. All sessions terminated.' };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to reset password' });
    }
  });

  // ============================================
  // TEST DATA MANAGEMENT
  // ============================================

  /**
   * POST /api/admin/test-data
   * Toggle test data on/off (SUPER_ADMIN only)
   */
  app.post('/test-data', async (request, reply) => {
    try {
      // Only SUPER_ADMIN can manage test data
      if (request.user.role !== 'SUPER_ADMIN') {
        return reply.code(403).send({ error: 'SUPER_ADMIN role required' });
      }

      const { enabled } = z.object({
        enabled: z.boolean(),
      }).parse(request.body);

      const { exec } = await import('child_process');
      const path = await import('path');

      // Use process.cwd() which points to backend directory when running
      const backendDir = process.cwd();
      const script = enabled ? 'seed:test' : 'seed:clear';
      const actionName = enabled ? 'Installing test data' : 'Clearing test data';
      const command = `npm run ${script}`;

      return new Promise((resolve) => {
        let completed = false;

        exec(command, { cwd: backendDir, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (completed) return;
          completed = true;

          console.log(`Script ${script} completed. Error:`, error, 'stdout:', stdout.substring(0, 200));

          if (error) {
            console.error('Test data script error:', error);
            resolve(
              reply.code(500).send({
                error: `${actionName} failed: ${error.message}`,
                output: stdout,
                errorOutput: stderr,
                code: error.code,
              })
            );
          } else {
            resolve(
              reply.send({
                success: true,
                message: `${actionName} completed successfully`,
                output: stdout.substring(0, 1000), // Limit output size
              })
            );
          }
        });

        // Timeout after 5 minutes
        setTimeout(() => {
          if (completed) return;
          completed = true;

          resolve(
            reply.code(500).send({
              error: 'Script timed out after 5 minutes',
            })
          );
        }, 5 * 60 * 1000);
      });
    } catch (error: any) {
      console.error('Test data endpoint error:', error);
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to manage test data' });
    }
  });

  // ============================================
  // DROPDOWN LISTS
  // ============================================
  await app.register(dropdownsRoutes, { prefix: '/dropdowns' });
}
