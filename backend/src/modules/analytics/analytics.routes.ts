import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getDashboard,
  getProjectsSummary,
  getCapacityOverview,
  getTimeSummary,
  getUsersUtilization,
} from './analytics.service.js';

// Validation schemas
const timeSummaryQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  groupBy: z.enum(['day', 'week', 'month', 'project', 'user']).optional(),
});

const utilizationQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  department: z.string().optional(),
});

export async function analyticsRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // Get dashboard data (personalized for user)
  app.get('/dashboard', async (request, reply) => {
    try {
      const dashboard = await getDashboard(request.user.userId, request.user.role);
      return { dashboard };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get dashboard' });
    }
  });

  // Get projects summary (manager view)
  app.get('/projects/summary', async (request, reply) => {
    try {
      const summary = await getProjectsSummary();
      return { summary };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get projects summary' });
    }
  });

  // Get capacity overview (manager view)
  app.get('/capacity/overview', async (request, reply) => {
    try {
      const overview = await getCapacityOverview();
      return { overview };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get capacity overview' });
    }
  });

  // Get time summary/report
  app.get('/time/summary', async (request, reply) => {
    try {
      const query = timeSummaryQuerySchema.parse(request.query);
      const summary = await getTimeSummary({
        startDate: query.startDate,
        endDate: query.endDate,
        groupBy: query.groupBy,
      });
      return { summary };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get time summary' });
    }
  });

  // Get users utilization report
  app.get('/users/utilization', async (request, reply) => {
    try {
      const query = utilizationQuerySchema.parse(request.query);
      const utilization = await getUsersUtilization({
        startDate: query.startDate,
        endDate: query.endDate,
        departmentFilter: query.department,
      });
      return { utilization };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get users utilization' });
    }
  });
}
