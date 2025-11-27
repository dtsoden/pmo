import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getManagers,
  getUserPreferences,
  updateUserPreferences,
  changePassword,
  type CreateUserData,
} from './users.service.js';
import { getAllDropdowns } from '../admin/dropdowns.service.js';

// Validation schemas
const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
  managerId: z.string().uuid().optional(),
});

const employmentTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR']);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().uuid().optional(),
  // Geographic and employment
  country: z.string().optional(),
  region: z.string().optional(),
  employmentType: employmentTypeEnum.optional(),
  // Capacity
  defaultWeeklyHours: z.number().min(0).max(168).optional(),
  maxWeeklyHours: z.number().min(0).max(168).optional(),
  timezone: z.string().optional(),
  // Skills and rates
  skills: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0).optional(),
  billableRate: z.number().min(0).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  department: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  // Geographic and employment
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  employmentType: employmentTypeEnum.optional(),
  // Capacity
  defaultWeeklyHours: z.number().min(0).max(168).optional(),
  maxWeeklyHours: z.number().min(0).max(168).optional(),
  timezone: z.string().optional(),
  // Skills and rates
  skills: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0).nullable().optional(),
  billableRate: z.number().min(0).nullable().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    emailNotifications: z.boolean().optional(),
    projectUpdates: z.boolean().optional(),
    taskAssignments: z.boolean().optional(),
    timeReminders: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
  }).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function userRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // Get all users
  app.get('/', async (request, reply) => {
    try {
      const query = listUsersQuerySchema.parse(request.query);
      const result = await listUsers(query);
      // Transform to match frontend PaginatedResponse format
      return {
        data: result.users,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list users' });
    }
  });

  // Get managers list (for dropdowns)
  app.get('/managers', async (request, reply) => {
    try {
      const managers = await getManagers();
      return { managers };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get managers' });
    }
  });

  // Get user by ID
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const user = await getUserById(id);
      return { user };
    } catch (error: any) {
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get user' });
    }
  });

  // Create user (admin only)
  app.post('/', {
    onRequest: [requireAdminRole],
  }, async (request, reply) => {
    try {
      const data = createUserSchema.parse(request.body) as CreateUserData;
      const user = await createUser(data);
      return reply.code(201).send({ user });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid user data', details: error.errors });
      }
      if (error.message?.includes('already exists')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create user' });
    }
  });

  // Update user
  app.put('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateUserSchema.parse(request.body);

      // Non-admins can only update their own profile (limited fields)
      const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(request.user.role);
      const isSelf = request.user.userId === id;

      if (!isAdmin && !isSelf) {
        return reply.code(403).send({ error: 'Cannot update other users' });
      }

      // Non-admins cannot change role or status
      if (!isAdmin && (data.role || data.status)) {
        return reply.code(403).send({ error: 'Cannot change role or status' });
      }

      const user = await updateUser(id, data);
      return { user };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid user data', details: error.errors });
      }
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      if (error.message?.includes('already in use')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update user' });
    }
  });

  // Delete (deactivate) user (admin only)
  app.delete('/:id', {
    onRequest: [requireAdminRole],
  }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);

      // Prevent self-deletion
      if (request.user.userId === id) {
        return reply.code(400).send({ error: 'Cannot delete your own account' });
      }

      await deleteUser(id);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete user' });
    }
  });

  // Get current user's preferences
  app.get('/me/preferences', async (request, reply) => {
    try {
      const preferences = await getUserPreferences(request.user.userId);
      return { preferences };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get preferences' });
    }
  });

  // Update current user's preferences
  app.put('/me/preferences', async (request, reply) => {
    try {
      const data = updatePreferencesSchema.parse(request.body);
      const preferences = await updateUserPreferences(request.user.userId, data);
      return { preferences };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid preferences data', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update preferences' });
    }
  });

  // Change password
  app.post('/me/change-password', async (request, reply) => {
    try {
      const data = changePasswordSchema.parse(request.body);
      await changePassword(request.user.userId, data.currentPassword, data.newPassword);
      return { success: true, message: 'Password changed successfully' };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid password data', details: error.errors });
      }
      if (error.message === 'Current password is incorrect') {
        return reply.code(401).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to change password' });
    }
  });

  // Get dropdown lists (public endpoint for all authenticated users)
  app.get('/dropdowns', async (request, reply) => {
    try {
      const dropdowns = await getAllDropdowns();
      return dropdowns;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get dropdowns' });
    }
  });
}

// Helper middleware for admin-only routes
async function requireAdminRole(request: any, reply: any) {
  const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
  if (!adminRoles.includes(request.user.role)) {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}
