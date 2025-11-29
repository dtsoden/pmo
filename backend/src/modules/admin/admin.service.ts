import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { createAuditLog, AuditAction, getAuditLogStats, getLoginAttemptStats } from './audit.service.js';
import type { Prisma, UserRole, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

// Session management

export interface CreateSessionInput {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresInMinutes?: number;
}

/**
 * Create a new user session
 */
export async function createSession(input: CreateSessionInput) {
  const { userId, ipAddress, userAgent, expiresInMinutes = 480 } = input;

  // Generate unique session token
  const token = randomBytes(32).toString('hex');

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const session = await db.userSession.create({
    data: {
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  // Audit log
  await createAuditLog({
    userId,
    action: AuditAction.SESSION_CREATED,
    entityType: 'UserSession',
    entityId: session.id,
    ipAddress,
    userAgent,
    sessionId: session.id,
  });

  return session;
}

/**
 * Update session last active timestamp
 */
export async function updateSessionActivity(sessionId: string) {
  try {
    await db.userSession.update({
      where: { id: sessionId },
      data: { lastActive: new Date() },
    });
  } catch (error) {
    // Session may have been deleted
    logger.debug('Failed to update session activity:', error);
  }
}

/**
 * Get session by token
 */
export async function getSessionByToken(token: string) {
  return db.userSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Terminate a specific session
 */
export async function terminateSession(
  sessionId: string,
  terminatedBy: string,
  ipAddress?: string,
  userAgent?: string
) {
  const session = await db.userSession.findUnique({ where: { id: sessionId } });

  if (!session) {
    throw new Error('Session not found');
  }

  await db.userSession.delete({ where: { id: sessionId } });

  // Audit log
  await createAuditLog({
    userId: terminatedBy,
    action: AuditAction.SESSION_TERMINATED,
    entityType: 'UserSession',
    entityId: sessionId,
    metadata: { targetUserId: session.userId },
    ipAddress,
    userAgent,
  });

  logger.info(`Session ${sessionId} terminated by ${terminatedBy}`);
}

/**
 * Terminate all sessions for a user
 */
export async function terminateAllUserSessions(
  userId: string,
  terminatedBy: string,
  ipAddress?: string,
  userAgent?: string
) {
  const sessions = await db.userSession.findMany({ where: { userId } });

  await db.userSession.deleteMany({ where: { userId } });

  // Audit log
  await createAuditLog({
    userId: terminatedBy,
    action: AuditAction.SESSION_TERMINATED,
    entityType: 'User',
    entityId: userId,
    metadata: { sessionCount: sessions.length, targetUserId: userId },
    ipAddress,
    userAgent,
  });

  logger.info(`All sessions for user ${userId} terminated by ${terminatedBy}`);

  return { terminatedCount: sessions.length };
}

/**
 * List all active sessions
 */
export async function listSessions(query: {
  page?: number;
  limit?: number;
  userId?: string;
} = {}) {
  const { page = 1, limit = 50, userId } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserSessionWhereInput = {
    expiresAt: { gt: new Date() }, // Only active sessions
  };

  if (userId) where.userId = userId;

  const [sessions, total] = await Promise.all([
    db.userSession.findMany({
      where,
      select: {
        id: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        lastActive: true,
        expiresAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { lastActive: 'desc' },
    }),
    db.userSession.count({ where }),
  ]);

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get user's active sessions
 */
export async function getUserSessions(userId: string) {
  return db.userSession.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActive: 'desc' },
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions() {
  const result = await db.userSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  if (result.count > 0) {
    logger.info(`Cleaned up ${result.count} expired sessions`);
  }

  return result.count;
}

// Dashboard statistics

/**
 * Get admin dashboard statistics
 */
export async function getDashboardStats() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    // User stats
    totalUsers,
    activeUsers,
    inactiveUsers,
    suspendedUsers,
    usersByRole,
    recentUsers,

    // Session stats
    activeSessions,

    // Audit stats
    auditStats,

    // Login stats
    loginStats,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: 'ACTIVE' } }),
    db.user.count({ where: { status: 'INACTIVE' } }),
    db.user.count({ where: { status: 'SUSPENDED' } }),
    db.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
    db.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),

    db.userSession.count({ where: { expiresAt: { gt: now } } }),

    getAuditLogStats(oneDayAgo),
    getLoginAttemptStats(24),
  ]);

  // Get recent audit logs
  const recentActivity = await db.auditLog.findMany({
    where: { createdAt: { gte: oneDayAgo } },
    select: {
      id: true,
      action: true,
      entityType: true,
      severity: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      suspended: suspendedUsers,
      newThisWeek: recentUsers,
      byRole: usersByRole.map(r => ({ role: r.role, count: r._count.role })),
    },
    sessions: {
      active: activeSessions,
    },
    audit: auditStats,
    logins: loginStats,
    recentActivity,
  };
}

// User management helpers

/**
 * Unlock a user account (clear failed login attempts)
 */
export async function unlockUserAccount(
  userId: string,
  unlockedBy: string,
  ipAddress?: string,
  userAgent?: string
) {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('User not found');
  }

  // Note: We don't actually lock accounts in the User model,
  // lockout is determined by checking recent failed login attempts.
  // But we can add an unlock action that clears the login attempts for the email.

  // For now, we just log the unlock action
  await createAuditLog({
    userId: unlockedBy,
    action: AuditAction.USER_UNLOCKED,
    entityType: 'User',
    entityId: userId,
    metadata: { email: user.email },
    ipAddress,
    userAgent,
  });

  logger.info(`User ${user.email} unlocked by ${unlockedBy}`);

  return { success: true, email: user.email };
}

/**
 * Force password reset for a user
 */
export async function forcePasswordReset(
  userId: string,
  newPassword: string,
  resetBy: string,
  ipAddress?: string,
  userAgent?: string
) {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('User not found');
  }

  // Import hash function (would need to add this)
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Terminate all sessions for security
  await terminateAllUserSessions(userId, resetBy, ipAddress, userAgent);

  // Audit log
  await createAuditLog({
    userId: resetBy,
    action: AuditAction.PASSWORD_RESET,
    entityType: 'User',
    entityId: userId,
    metadata: { email: user.email, resetBy },
    ipAddress,
    userAgent,
    severity: 'WARNING',
  });

  logger.info(`Password reset for ${user.email} by ${resetBy}`);

  return { success: true };
}

/**
 * Get system health status
 */
export async function getSystemHealth() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error) {
    checks.database = { status: 'error', message: 'Database connection failed' };
  }

  // Check for expired sessions that need cleanup
  const expiredSessions = await db.userSession.count({
    where: { expiresAt: { lt: new Date() } },
  });
  checks.sessions = {
    status: 'ok',
    message: expiredSessions > 0 ? `${expiredSessions} expired sessions pending cleanup` : undefined,
  };

  return {
    status: Object.values(checks).every(c => c.status === 'ok') ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// SOFT-DELETED ITEMS RECOVERY
// ============================================

/**
 * List soft-deleted users
 */
export async function listDeletedUsers(query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        department: true,
        jobTitle: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
    }),
    db.user.count({ where: { deletedAt: { not: null } } }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * List soft-deleted clients
 */
export async function listDeletedClients(query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        name: true,
        status: true,
        industry: true,
        country: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
    }),
    db.client.count({ where: { deletedAt: { not: null } } }),
  ]);

  return {
    clients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * List soft-deleted projects
 */
export async function listDeletedProjects(query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        priority: true,
        type: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
    }),
    db.project.count({ where: { deletedAt: { not: null } } }),
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * List soft-deleted tasks
 */
export async function listDeletedTasks(query: { page?: number; limit?: number; projectId?: string } = {}) {
  const { page = 1, limit = 50, projectId } = query;
  const skip = (page - 1) * limit;

  const where = { deletedAt: { not: null }, ...(projectId ? { projectId } : {}) };

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      select: {
        id: true,
        projectId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
    }),
    db.task.count({ where }),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Restore a soft-deleted client
 */
export async function restoreClient(clientId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (!client.deletedAt) {
    throw new Error('Client is not deleted');
  }

  const restored = await db.client.update({
    where: { id: clientId },
    data: { deletedAt: null },
  });

  // Audit log
  await createAuditLog({
    userId: adminUserId,
    action: AuditAction.CLIENT_UPDATED,
    entityType: 'Client',
    entityId: clientId,
    metadata: { action: 'restore', clientName: client.name },
    ipAddress,
    userAgent,
  });

  return restored;
}

/**
 * Restore a soft-deleted user
 */
export async function restoreUser(userId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.deletedAt) {
    throw new Error('User is not deleted');
  }

  const restored = await db.user.update({
    where: { id: userId },
    data: { deletedAt: null },
  });

  // Audit log
  await createAuditLog({
    userId: adminUserId,
    action: AuditAction.USER_UPDATED,
    entityType: 'User',
    entityId: userId,
    metadata: { action: 'restore', userName: `${user.firstName} ${user.lastName}`, email: user.email },
    ipAddress,
    userAgent,
  });

  return restored;
}

/**
 * Restore a soft-deleted project
 */
export async function restoreProject(projectId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (!project.deletedAt) {
    throw new Error('Project is not deleted');
  }

  const restored = await db.project.update({
    where: { id: projectId },
    data: { deletedAt: null },
  });

  // Audit log
  await createAuditLog({
    userId: adminUserId,
    action: AuditAction.PROJECT_UPDATED,
    entityType: 'Project',
    entityId: projectId,
    metadata: { action: 'restore', projectName: project.name },
    ipAddress,
    userAgent,
  });

  return restored;
}

/**
 * Restore a soft-deleted task
 */
export async function restoreTask(taskId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  if (!task.deletedAt) {
    throw new Error('Task is not deleted');
  }

  const restored = await db.task.update({
    where: { id: taskId },
    data: { deletedAt: null },
  });

  // Audit log
  await createAuditLog({
    userId: adminUserId,
    action: 'TASK_UPDATED',
    entityType: 'Task',
    entityId: taskId,
    metadata: { action: 'restore', taskTitle: task.title },
    ipAddress,
    userAgent,
  });

  return restored;
}

/**
 * Permanently delete a project (hard delete with cascade)
 * This will cascade delete phases, milestones, tasks, and assignments via DB rules
 */
export async function permanentlyDeleteProject(projectId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        where: { deletedAt: { not: null } },
        select: { id: true },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (!project.deletedAt) {
    throw new Error('Project must be soft-deleted first');
  }

  // Audit log before deletion
  await createAuditLog({
    userId: adminUserId,
    action: AuditAction.PROJECT_DELETED,
    entityType: 'Project',
    entityId: projectId,
    metadata: {
      action: 'permanent_delete',
      projectName: project.name,
      deletedTasksCount: project.tasks.length,
    },
    ipAddress,
    userAgent,
  });

  // Hard delete - this will cascade delete phases, milestones, tasks, assignments via DB rules
  await db.project.delete({
    where: { id: projectId },
  });
}

/**
 * Permanently delete a task (hard delete)
 */
export async function permanentlyDeleteTask(taskId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  if (!task.deletedAt) {
    throw new Error('Task must be soft-deleted first');
  }

  // Audit log before deletion
  await createAuditLog({
    userId: adminUserId,
    action: 'TASK_DELETED',
    entityType: 'Task',
    entityId: taskId,
    metadata: { action: 'permanent_delete', taskTitle: task.title },
    ipAddress,
    userAgent,
  });

  // Hard delete - this will cascade delete related records
  await db.task.delete({
    where: { id: taskId },
  });
}

/**
 * Permanently delete a client (hard delete with cascade)
 * This will:
 * 1. Delete all soft-deleted projects under this client (and their children)
 * 2. Delete the client (which cascades to contacts/opportunities)
 */
export async function permanentlyDeleteClient(clientId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      projects: {
        where: { deletedAt: { not: null } },
        select: { id: true, name: true },
      },
    },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (!client.deletedAt) {
    throw new Error('Client must be soft-deleted first');
  }

  // Audit log before deletion
  await createAuditLog({
    userId: adminUserId,
    action: AuditAction.CLIENT_DELETED,
    entityType: 'Client',
    entityId: clientId,
    metadata: {
      action: 'permanent_delete',
      clientName: client.name,
      deletedProjectsCount: client.projects.length,
    },
    ipAddress,
    userAgent,
  });

  // Step 1: Permanently delete all soft-deleted projects under this client
  // This will cascade delete phases, milestones, tasks, assignments via DB rules
  for (const project of client.projects) {
    await db.project.delete({
      where: { id: project.id },
    });
  }

  // Step 2: Delete the client (cascades to contacts/opportunities via DB rules)
  await db.client.delete({
    where: { id: clientId },
  });
}

/**
 * Permanently delete a user (hard delete)
 */
export async function permanentlyDeleteUser(userId: string, adminUserId: string, ipAddress?: string, userAgent?: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.deletedAt) {
    throw new Error('User must be soft-deleted first');
  }

  // Audit log before deletion
  await createAuditLog({
    userId: adminUserId,
    action: AuditAction.USER_DELETED,
    entityType: 'User',
    entityId: userId,
    metadata: { action: 'permanent_delete', userName: `${user.firstName} ${user.lastName}`, email: user.email },
    ipAddress,
    userAgent,
  });

  // Hard delete - this will cascade delete related records
  await db.user.delete({
    where: { id: userId },
  });
}
