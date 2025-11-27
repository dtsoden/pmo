import bcrypt from 'bcrypt';
import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { UserRole, UserStatus } from '@prisma/client';
import {
  createAuditLog,
  AuditAction,
  recordLoginAttempt,
  checkAccountLockout,
} from '../admin/audit.service.js';
import { createSession, terminateAllUserSessions } from '../admin/admin.service.js';
import { getSecuritySettings } from '../admin/settings.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  // In production, you'd use a proper JWT library
  // For now, using a simple implementation
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');

  return `${header}.${payloadStr}.signature`;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const [, payloadStr] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());

    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export interface LoginOptions {
  ipAddress?: string;
  userAgent?: string;
}

export async function login(email: string, password: string, options: LoginOptions = {}) {
  const { ipAddress, userAgent } = options;
  const normalizedEmail = email.toLowerCase();

  // Check for account lockout
  const securitySettings = await getSecuritySettings();
  const lockoutCheck = await checkAccountLockout(
    normalizedEmail,
    securitySettings.maxLoginAttempts,
    securitySettings.lockoutDurationMinutes
  );

  if (lockoutCheck.isLocked) {
    await recordLoginAttempt(normalizedEmail, false, ipAddress, userAgent, 'Account locked');
    throw new Error(`Account is locked. Too many failed attempts (${lockoutCheck.failedAttempts}/${lockoutCheck.maxAttempts}). Please try again later.`);
  }

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    await recordLoginAttempt(normalizedEmail, false, ipAddress, userAgent, 'User not found');
    throw new Error('Invalid credentials');
  }

  if (user.status !== UserStatus.ACTIVE) {
    await recordLoginAttempt(normalizedEmail, false, ipAddress, userAgent, `User status: ${user.status}`);
    await createAuditLog({
      userId: user.id,
      action: AuditAction.USER_LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      severity: 'WARNING',
      status: 'FAILURE',
      metadata: { reason: `Account status: ${user.status}` },
      ipAddress,
      userAgent,
    });
    throw new Error('Account is not active');
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    await recordLoginAttempt(normalizedEmail, false, ipAddress, userAgent, 'Invalid password');
    await createAuditLog({
      userId: user.id,
      action: AuditAction.USER_LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      severity: 'WARNING',
      status: 'FAILURE',
      metadata: { reason: 'Invalid password' },
      ipAddress,
      userAgent,
    });
    throw new Error('Invalid credentials');
  }

  // Successful login - record it
  await recordLoginAttempt(normalizedEmail, true, ipAddress, userAgent);

  // Create session
  const session = await createSession({
    userId: user.id,
    ipAddress,
    userAgent,
    expiresInMinutes: securitySettings.sessionTimeoutMinutes,
  });

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Audit log successful login
  await createAuditLog({
    userId: user.id,
    action: AuditAction.USER_LOGIN,
    entityType: 'User',
    entityId: user.id,
    severity: 'INFO',
    status: 'SUCCESS',
    ipAddress,
    userAgent,
    sessionId: session.id,
  });

  const token = await generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: session.id,
  });

  logger.info(`User logged in: ${user.email} from ${ipAddress || 'unknown'}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    token,
    sessionId: session.id,
  };
}

export interface RegisterOptions {
  ipAddress?: string;
  userAgent?: string;
}

export async function register(
  data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  },
  options: RegisterOptions = {}
) {
  const { ipAddress, userAgent } = options;
  const normalizedEmail = data.email.toLowerCase();

  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = await hashPassword(data.password);

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || UserRole.TEAM_MEMBER,
      status: UserStatus.ACTIVE,
    },
  });

  // Audit log user creation
  await createAuditLog({
    userId: user.id,
    action: AuditAction.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    severity: 'INFO',
    status: 'SUCCESS',
    metadata: { email: user.email, role: user.role },
    ipAddress,
    userAgent,
  });

  logger.info(`New user registered: ${user.email}`);

  // Create session for new user
  const securitySettings = await getSecuritySettings();
  const session = await createSession({
    userId: user.id,
    ipAddress,
    userAgent,
    expiresInMinutes: securitySettings.sessionTimeoutMinutes,
  });

  const token = await generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: session.id,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token,
    sessionId: session.id,
  };
}

export interface LogoutOptions {
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logout(userId: string, options: LogoutOptions = {}) {
  const { sessionId, ipAddress, userAgent } = options;

  // If sessionId provided, terminate just that session
  // Otherwise terminate all sessions for the user
  if (sessionId) {
    try {
      await db.userSession.delete({ where: { id: sessionId } });
    } catch {
      // Session may already be deleted
    }
  } else {
    await terminateAllUserSessions(userId, userId, ipAddress, userAgent);
  }

  // Audit log logout
  await createAuditLog({
    userId,
    action: AuditAction.USER_LOGOUT,
    entityType: 'User',
    entityId: userId,
    severity: 'INFO',
    status: 'SUCCESS',
    ipAddress,
    userAgent,
    sessionId,
  });

  logger.info(`User logged out: ${userId}`);

  return { success: true };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  options: { ipAddress?: string; userAgent?: string } = {}
) {
  const { ipAddress, userAgent } = options;

  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    await createAuditLog({
      userId,
      action: AuditAction.PASSWORD_CHANGED,
      entityType: 'User',
      entityId: userId,
      severity: 'WARNING',
      status: 'FAILURE',
      metadata: { reason: 'Invalid current password' },
      ipAddress,
      userAgent,
    });
    throw new Error('Current password is incorrect');
  }

  // Hash and save new password
  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Audit log password change
  await createAuditLog({
    userId,
    action: AuditAction.PASSWORD_CHANGED,
    entityType: 'User',
    entityId: userId,
    severity: 'INFO',
    status: 'SUCCESS',
    ipAddress,
    userAgent,
  });

  logger.info(`Password changed for user: ${user.email}`);

  return { success: true };
}

export async function getCurrentUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatarUrl: true,
      department: true,
      jobTitle: true,
      phone: true,
      defaultWeeklyHours: true,
      timezone: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
