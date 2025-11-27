import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AvailabilityType, TimeOffStatus, TimeOffType } from '@prisma/client';
import {
  getUserAvailability,
  setAvailability,
  bulkSetAvailability,
  clearAvailabilityOverride,
  listTimeOffRequests,
  getTimeOffById,
  createTimeOffRequest,
  updateTimeOffRequest,
  cancelTimeOffRequest,
  approveTimeOffRequest,
  rejectTimeOffRequest,
  getPendingTimeOffRequests,
  getUtilization,
  type AvailabilityRange,
  type SetAvailabilityData,
  type CreateTimeOffData,
} from './capacity.service.js';

// Validation schemas
const availabilityQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const setAvailabilitySchema = z.object({
  date: z.coerce.date(),
  availableHours: z.number().min(0).max(24),
  type: z.nativeEnum(AvailabilityType).optional(),
  notes: z.string().optional(),
});

const bulkAvailabilitySchema = z.object({
  entries: z.array(setAvailabilitySchema),
});

const listTimeOffQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(TimeOffStatus).optional(),
  type: z.nativeEnum(TimeOffType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const createTimeOffSchema = z.object({
  type: z.nativeEnum(TimeOffType),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  hours: z.number().positive(),
  reason: z.string().optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

const updateTimeOffSchema = z.object({
  type: z.nativeEnum(TimeOffType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  hours: z.number().positive().optional(),
  reason: z.string().optional(),
});

const utilizationQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().uuid().optional(),
  department: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function capacityRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // ========== AVAILABILITY ==========

  // Get availability for current user
  app.get('/availability', async (request, reply) => {
    try {
      const query = availabilityQuerySchema.parse(request.query) as AvailabilityRange;
      const availability = await getUserAvailability(request.user.userId, query);
      return { availability };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get availability' });
    }
  });

  // Get availability for a specific user (manager view)
  app.get('/availability/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const query = availabilityQuerySchema.parse(request.query) as AvailabilityRange;
      const availability = await getUserAvailability(id, query);
      return { availability };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get availability' });
    }
  });

  // Set availability for a specific date (current user)
  app.post('/availability', async (request, reply) => {
    try {
      const data = setAvailabilitySchema.parse(request.body) as SetAvailabilityData;
      const availability = await setAvailability(request.user.userId, data);
      return reply.code(201).send({ availability });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid availability data', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to set availability' });
    }
  });

  // Bulk set availability (current user)
  app.post('/availability/bulk', async (request, reply) => {
    try {
      const { entries } = bulkAvailabilitySchema.parse(request.body);
      const results = await bulkSetAvailability(request.user.userId, entries as SetAvailabilityData[]);
      return reply.code(201).send({ availability: results });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid availability data', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to set availability' });
    }
  });

  // Clear availability override (reset to default)
  app.delete('/availability/:date', async (request, reply) => {
    try {
      const { date } = z.object({ date: z.coerce.date() }).parse(request.params);
      await clearAvailabilityOverride(request.user.userId, date);
      return { success: true };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to clear availability' });
    }
  });

  // ========== TIME-OFF ==========

  // Get my time-off requests
  app.get('/time-off', async (request, reply) => {
    try {
      const query = listTimeOffQuerySchema.parse(request.query);
      const result = await listTimeOffRequests(request.user.userId, query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get time-off requests' });
    }
  });

  // Get pending time-off requests (for managers)
  app.get('/time-off/pending', async (request, reply) => {
    try {
      // Check if user has manager role
      const managerRoles = ['SUPER_ADMIN', 'ADMIN', 'PMO_MANAGER', 'PROJECT_MANAGER', 'RESOURCE_MANAGER'];
      if (!managerRoles.includes(request.user.role)) {
        return reply.code(403).send({ error: 'Manager access required' });
      }

      const query = z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      }).parse(request.query);

      const result = await getPendingTimeOffRequests(query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get pending requests' });
    }
  });

  // Get time-off request by ID
  app.get('/time-off/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const timeOff = await getTimeOffById(id);
      return { timeOff };
    } catch (error: any) {
      if (error.message === 'Time-off request not found') {
        return reply.code(404).send({ error: 'Time-off request not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get time-off request' });
    }
  });

  // Create time-off request
  app.post('/time-off', async (request, reply) => {
    try {
      const data = createTimeOffSchema.parse(request.body) as CreateTimeOffData;
      const timeOff = await createTimeOffRequest(request.user.userId, data);
      return reply.code(201).send({ timeOff });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid time-off data', details: error.errors });
      }
      if (error.message?.includes('overlaps')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create time-off request' });
    }
  });

  // Update time-off request
  app.put('/time-off/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateTimeOffSchema.parse(request.body);
      const timeOff = await updateTimeOffRequest(id, request.user.userId, data);
      return { timeOff };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid time-off data', details: error.errors });
      }
      if (error.message === 'Time-off request not found') {
        return reply.code(404).send({ error: 'Time-off request not found' });
      }
      if (error.message?.includes('Cannot modify')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update time-off request' });
    }
  });

  // Cancel time-off request
  app.delete('/time-off/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await cancelTimeOffRequest(id, request.user.userId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Time-off request not found') {
        return reply.code(404).send({ error: 'Time-off request not found' });
      }
      if (error.message?.includes('Cannot cancel')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to cancel time-off request' });
    }
  });

  // Approve time-off request (manager)
  app.post('/time-off/:id/approve', async (request, reply) => {
    try {
      const managerRoles = ['SUPER_ADMIN', 'ADMIN', 'PMO_MANAGER', 'PROJECT_MANAGER', 'RESOURCE_MANAGER'];
      if (!managerRoles.includes(request.user.role)) {
        return reply.code(403).send({ error: 'Manager access required' });
      }

      const { id } = idParamSchema.parse(request.params);
      const timeOff = await approveTimeOffRequest(id, request.user.userId);
      return { timeOff };
    } catch (error: any) {
      if (error.message === 'Time-off request not found') {
        return reply.code(404).send({ error: 'Time-off request not found' });
      }
      if (error.message?.includes('Can only')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to approve time-off request' });
    }
  });

  // Reject time-off request (manager)
  app.post('/time-off/:id/reject', async (request, reply) => {
    try {
      const managerRoles = ['SUPER_ADMIN', 'ADMIN', 'PMO_MANAGER', 'PROJECT_MANAGER', 'RESOURCE_MANAGER'];
      if (!managerRoles.includes(request.user.role)) {
        return reply.code(403).send({ error: 'Manager access required' });
      }

      const { id } = idParamSchema.parse(request.params);
      const timeOff = await rejectTimeOffRequest(id, request.user.userId);
      return { timeOff };
    } catch (error: any) {
      if (error.message === 'Time-off request not found') {
        return reply.code(404).send({ error: 'Time-off request not found' });
      }
      if (error.message?.includes('Can only')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to reject time-off request' });
    }
  });

  // ========== UTILIZATION ==========

  // Get utilization report
  app.get('/utilization', async (request, reply) => {
    try {
      const query = utilizationQuerySchema.parse(request.query);
      const utilization = await getUtilization({
        startDate: query.startDate,
        endDate: query.endDate,
        userId: query.userId,
        departmentFilter: query.department,
      });
      return { utilization };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get utilization' });
    }
  });
}
