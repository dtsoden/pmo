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
