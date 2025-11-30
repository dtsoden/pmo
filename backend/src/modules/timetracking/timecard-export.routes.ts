// Time Card Export Routes
// Public endpoint for external payroll systems (Workday, PeopleSoft, etc.)
// Uses API key authentication instead of JWT

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { exportTimeCards } from './timecard-export.service.js';
import { verifyApiKey } from '../admin/timecard.service.js';
import { logger } from '../../core/utils/logger.js';

// Validation schema for query parameters
const exportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

/**
 * Middleware to verify API key from Authorization header
 * Format: Authorization: Bearer pmo_live_...
 */
async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({
      error: 'Missing Authorization header',
      message: 'Please provide API key in Authorization header as: Bearer <api_key>',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return reply.status(401).send({
      error: 'Invalid Authorization header format',
      message: 'Authorization header must be: Bearer <api_key>',
    });
  }

  const apiKey = parts[1];

  // Verify API key
  const isValid = await verifyApiKey(apiKey);

  if (!isValid) {
    logger.warn('Invalid API key attempt', {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(401).send({
      error: 'Invalid API key',
      message: 'The provided API key is invalid or has been revoked',
    });
  }

  // API key is valid - continue
}

export async function timecardExportRoutes(app: FastifyInstance) {
  /**
   * GET /api/timecard/export
   * Export time card data for a date range
   *
   * Query parameters:
   * - startDate: YYYY-MM-DD (inclusive)
   * - endDate: YYYY-MM-DD (inclusive)
   *
   * Authentication: API key via Authorization header
   *
   * Response format:
   * [
   *   {
   *     "user": { "id", "email", "firstName", "lastName", "employeeId" },
   *     "summary": [{ "date", "totalHours", "billableHours" }],
   *     "details": [{
   *       "date",
   *       "sessions": [{
   *         "client": { "id", "name", "salesforceAccountId" },
   *         "project": { "id", "name", "code" },
   *         "task": { "id", "title" },
   *         "startTime", "endTime", "duration",
   *         "isBillable", "description"
   *       }]
   *     }]
   *   }
   * ]
   */
  app.get(
    '/export',
    { preHandler: apiKeyAuth },
    async (request, reply) => {
      try {
        // Validate query parameters
        const { startDate, endDate } = exportQuerySchema.parse(request.query);

        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validate date range
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return reply.status(400).send({
            error: 'Invalid date format',
            message: 'Dates must be in YYYY-MM-DD format',
          });
        }

        if (start > end) {
          return reply.status(400).send({
            error: 'Invalid date range',
            message: 'startDate must be before or equal to endDate',
          });
        }

        // Log the export request
        logger.info('Time card export requested', {
          startDate,
          endDate,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });

        // Export time cards
        const timeCards = await exportTimeCards(start, end);

        logger.info('Time card export completed', {
          startDate,
          endDate,
          userCount: timeCards.length,
        });

        return reply.send(timeCards);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Invalid query parameters',
            details: error.errors,
          });
        }

        logger.error('Time card export error:', error);
        return reply.status(500).send({
          error: 'Internal server error',
          message: 'Failed to export time card data',
        });
      }
    }
  );
}
