// Time Card API Routes (Admin)
// Endpoints for managing API keys

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as timecardService from './timecard.service.js';
import { logger } from '../../core/utils/logger.js';

// Validation schemas
const createApiKeySchema = z.object({
  description: z.string().min(1).max(255).optional(),
});

export async function timecardAdminRoutes(app: FastifyInstance) {
  // Authentication and authorization inherited from parent admin routes

  /**
   * GET /admin/timecard/api-key
   * Get current API key information (not the actual key)
   */
  app.get('/api-key', async (request, reply) => {
    try {
      const apiKey = await timecardService.getApiKey();
      return reply.send(apiKey);
    } catch (error: any) {
      if (error.message === 'No active API key found') {
        return reply.status(404).send({ message: error.message });
      }
      logger.error('Error fetching API key:', error);
      return reply.status(500).send({ message: 'Failed to fetch API key' });
    }
  });

  /**
   * POST /admin/timecard/api-key
   * Create a new API key
   */
  app.post('/api-key', async (request, reply) => {
    try {
      const { description } = createApiKeySchema.parse(request.body);
      const result = await timecardService.createApiKey(
        request.user!.userId,
        description
      );

      logger.info('API key created', { userId: request.user!.userId });

      return reply.send(result);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        return reply.status(409).send({ message: error.message });
      }
      logger.error('Error creating API key:', error);
      return reply.status(500).send({ message: 'Failed to create API key' });
    }
  });

  /**
   * POST /admin/timecard/api-key/regenerate
   * Regenerate the existing API key
   */
  app.post('/api-key/regenerate', async (request, reply) => {
    try {
      const result = await timecardService.regenerateApiKey(
        request.user!.userId
      );

      logger.info('API key regenerated', { userId: request.user!.userId });

      return reply.send(result);
    } catch (error: any) {
      logger.error('Error regenerating API key:', error);
      return reply.status(500).send({ message: 'Failed to regenerate API key' });
    }
  });

  /**
   * DELETE /admin/timecard/api-key
   * Revoke the current API key
   */
  app.delete('/api-key', async (request, reply) => {
    try {
      const result = await timecardService.revokeApiKey();

      logger.info('API key revoked', { userId: request.user!.userId });

      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'No active API key to revoke') {
        return reply.status(404).send({ message: error.message });
      }
      logger.error('Error revoking API key:', error);
      return reply.status(500).send({ message: 'Failed to revoke API key' });
    }
  });
}
