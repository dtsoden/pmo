import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import {
  listNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getUnreadCount,
} from './notifications.service.js';

// Validation schemas
const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  isRead: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  type: z.nativeEnum(NotificationType).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function notificationRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // Get notifications for current user
  app.get('/', async (request, reply) => {
    try {
      const query = listNotificationsQuerySchema.parse(request.query);
      const result = await listNotifications(request.user.userId, query);
      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Failed to list notifications' });
    }
  });

  // Get unread count
  app.get('/unread-count', async (request, reply) => {
    try {
      const result = await getUnreadCount(request.user.userId);
      return result;
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get unread count' });
    }
  });

  // Get notification by ID
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const notification = await getNotificationById(id, request.user.userId);
      return { notification };
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to get notification' });
    }
  });

  // Mark notification as read
  app.post('/:id/read', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const notification = await markAsRead(id, request.user.userId);
      return { notification };
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to mark as read' });
    }
  });

  // Mark all notifications as read
  app.post('/read-all', async (request, reply) => {
    try {
      await markAllAsRead(request.user.userId);
      return { success: true };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to mark all as read' });
    }
  });

  // Delete notification
  app.delete('/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await deleteNotification(id, request.user.userId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete notification' });
    }
  });

  // Delete all read notifications
  app.delete('/read', async (request, reply) => {
    try {
      await deleteAllRead(request.user.userId);
      return { success: true };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to delete read notifications' });
    }
  });
}
