import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import type { Prisma } from '@prisma/client';

// Audit action types
export const AuditAction = {
  // Authentication
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  USER_UNLOCKED: 'USER_UNLOCKED',

  // Session Management
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_TERMINATED: 'SESSION_TERMINATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Settings
  SETTING_UPDATED: 'SETTING_UPDATED',
  SETTING_RESET: 'SETTING_RESET',

  // Projects
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_DELETED: 'PROJECT_DELETED',

  // Clients
  CLIENT_CREATED: 'CLIENT_CREATED',
  CLIENT_UPDATED: 'CLIENT_UPDATED',
  CLIENT_DELETED: 'CLIENT_DELETED',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditStatus = 'SUCCESS' | 'FAILURE';

export interface AuditLogInput {
  userId?: string | null;
  action: AuditActionType | string;
  entityType?: string;
  entityId?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  errorDetail?: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput) {
  try {
    const log = await db.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        severity: input.severity || 'INFO',
        status: input.status || 'SUCCESS',
        changes: input.changes || undefined,
        metadata: input.metadata || undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        sessionId: input.sessionId,
        errorDetail: input.errorDetail,
      },
    });

    // Log critical events
    if (input.severity === 'CRITICAL' || input.severity === 'ERROR') {
      logger.warn(`Audit: ${input.action} - ${input.status}`, {
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
      });
    }

    return log;
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * List audit logs with filtering and pagination
 */
export async function listAuditLogs(query: AuditLogQuery = {}) {
  const { page = 1, limit = 50, userId, action, entityType, severity, status, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (severity) where.severity = severity;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        action: true,
        entityType: true,
        entityId: true,
        severity: true,
        status: true,
        changes: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        sessionId: true,
        errorDetail: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLogById(id: string) {
  return db.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(startDate?: Date, endDate?: Date) {
  const where: Prisma.AuditLogWhereInput = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [totalLogs, byAction, bySeverity, byStatus] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
    db.auditLog.groupBy({
      by: ['severity'],
      where,
      _count: { severity: true },
    }),
    db.auditLog.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
  ]);

  return {
    total: totalLogs,
    byAction: byAction.map(a => ({ action: a.action, count: a._count.action })),
    bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count.severity })),
    byStatus: byStatus.map(s => ({ status: s.status, count: s._count.status })),
  };
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failReason?: string
) {
  try {
    await db.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        success,
        ipAddress,
        userAgent,
        failReason: success ? null : failReason,
      },
    });
  } catch (error) {
    logger.error('Failed to record login attempt:', error);
  }
}

/**
 * Get login attempt statistics
 */
export async function getLoginAttemptStats(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [total, successful, failed, byEmail] = await Promise.all([
    db.loginAttempt.count({
      where: { createdAt: { gte: since } },
    }),
    db.loginAttempt.count({
      where: { createdAt: { gte: since }, success: true },
    }),
    db.loginAttempt.count({
      where: { createdAt: { gte: since }, success: false },
    }),
    db.loginAttempt.groupBy({
      by: ['email'],
      where: { createdAt: { gte: since }, success: false },
      _count: { email: true },
      orderBy: { _count: { email: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    total,
    successful,
    failed,
    topFailedEmails: byEmail.map(e => ({ email: e.email, count: e._count.email })),
  };
}

/**
 * Check if account should be locked due to failed attempts
 */
export async function checkAccountLockout(email: string, maxAttempts: number = 5, windowMinutes: number = 30) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const failedAttempts = await db.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: since },
    },
  });

  return {
    isLocked: failedAttempts >= maxAttempts,
    failedAttempts,
    maxAttempts,
  };
}

/**
 * List login attempts with filtering
 */
export async function listLoginAttempts(query: {
  page?: number;
  limit?: number;
  email?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const { page = 1, limit = 50, email, success, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.LoginAttemptWhereInput = {};

  if (email) where.email = { contains: email, mode: 'insensitive' };
  if (success !== undefined) where.success = success;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [attempts, total] = await Promise.all([
    db.loginAttempt.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.loginAttempt.count({ where }),
  ]);

  return {
    attempts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
