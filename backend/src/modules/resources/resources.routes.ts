import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AssignmentStatus } from '@prisma/client';
import {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getResourceAllocations,
  getProjectResources,
  getUserAssignments,
  getCommonRoles,
  type CreateAssignmentData,
} from './resources.service.js';

// Validation schemas
const listAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.nativeEnum(AssignmentStatus).optional(),
  role: z.string().optional(),
});

const createAssignmentSchema = z.object({
  projectId: z.string().uuid('Valid project ID required'),
  userId: z.string().uuid('Valid user ID required'),
  role: z.string().min(1, 'Role is required'),
  allocatedHours: z.number().positive('Allocated hours must be positive'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  status: z.nativeEnum(AssignmentStatus).optional(),
});

const updateAssignmentSchema = z.object({
  role: z.string().min(1).optional(),
  allocatedHours: z.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(AssignmentStatus).optional(),
});

const allocationsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  department: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function resourceRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // ========== ASSIGNMENTS ==========

  // Get all assignments
  app.get('/assignments', async (request, reply) => {
    try {
      const query = listAssignmentsQuerySchema.parse(request.query);
      const result = await listAssignments(query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list assignments' });
    }
  });

  // Get assignment by ID
  app.get('/assignments/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const assignment = await getAssignmentById(id);
      return { assignment };
    } catch (error: any) {
      if (error.message === 'Assignment not found') {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get assignment' });
    }
  });

  // Create assignment
  app.post('/assignments', async (request, reply) => {
    try {
      const data = createAssignmentSchema.parse(request.body) as CreateAssignmentData;
      const assignment = await createAssignment(data);
      return reply.code(201).send({ assignment });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid assignment data', details: error.errors });
      }
      if (error.message?.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      if (error.message?.includes('already assigned')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create assignment' });
    }
  });

  // Update assignment
  app.put('/assignments/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateAssignmentSchema.parse(request.body);
      const assignment = await updateAssignment(id, data);
      return { assignment };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid assignment data', details: error.errors });
      }
      if (error.message === 'Assignment not found') {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update assignment' });
    }
  });

  // Delete assignment
  app.delete('/assignments/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await deleteAssignment(id);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Assignment not found') {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete assignment' });
    }
  });

  // ========== RESOURCE OVERVIEW ==========

  // Get resource allocations overview
  app.get('/allocations', async (request, reply) => {
    try {
      const query = allocationsQuerySchema.parse(request.query);
      const allocations = await getResourceAllocations({
        startDate: query.startDate,
        endDate: query.endDate,
        departmentFilter: query.department,
      });
      return { allocations };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get resource allocations' });
    }
  });

  // Get resources for a project
  app.get('/projects/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const resources = await getProjectResources(id);
      return { resources };
    } catch (error: any) {
      if (error.message === 'Project not found') {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get project resources' });
    }
  });

  // Get assignments for a user
  app.get('/users/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const assignments = await getUserAssignments(id);
      return assignments;
    } catch (error: any) {
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get user assignments' });
    }
  });

  // Get my assignments (current user)
  app.get('/my-assignments', async (request, reply) => {
    try {
      const assignments = await getUserAssignments(request.user.userId);
      return assignments;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get assignments' });
    }
  });

  // Get common roles list
  app.get('/roles', async (request, reply) => {
    const roles = getCommonRoles();
    return { roles };
  });
}
