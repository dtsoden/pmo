import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import archiver from 'archiver';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { extensionAuthMiddleware } from '../../core/middleware/extension-auth.middleware.js';
import {
  getShortcuts,
  createShortcut,
  updateShortcut,
  deleteShortcut,
  reorderShortcuts,
  type CreateShortcutData,
  type UpdateShortcutData,
  type ReorderShortcutData,
} from './extension.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validation schemas
const createShortcutSchema = z.object({
  taskId: z.string().uuid().optional(),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(10).optional(), // Emoji or icon code
  groupName: z.string().max(100).optional(),
  isPinned: z.boolean().optional(),
});

const updateShortcutSchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(10).nullable().optional(),
  groupName: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPinned: z.boolean().optional(),
});

const reorderShortcutsSchema = z.object({
  shortcuts: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function extensionRoutes(app: FastifyInstance) {
  // Download endpoint doesn't require authentication (publicly accessible)
  // Download packaged extension as zip
  app.get('/download', async (request, reply) => {
    try {
      // Path to chrome-extension/dist folder (from backend/src/modules/extension)
      const extensionDistPath = join(__dirname, '../../../../chrome-extension/dist');

      if (!existsSync(extensionDistPath)) {
        return reply.code(404).send({ error: 'Extension not built. Run: cd chrome-extension && npm run build' });
      }

      // Set headers for download
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', 'attachment; filename="pmo-timer-extension.zip"');

      // Create archive
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      // Handle archive errors
      archive.on('error', (err) => {
        throw err;
      });

      // Pipe archive to response
      archive.pipe(reply.raw);

      // Add all files from dist folder
      archive.directory(extensionDistPath, false);

      // Finalize the archive
      await archive.finalize();
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to download extension' });
    }
  });

  // ========== EXTENSION INSTALLATION ==========

  // Validate authentication and return user info for extension installation
  // NOTE: Called by WEB APP (not extension), so no extensionAuthMiddleware required
  app.post('/install', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    try {
      // User is already authenticated via middleware
      // Return user info for extension to cache
      return {
        user: {
          id: request.user.userId,
          email: request.user.email,
          role: request.user.role,
        },
      };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to validate installation' });
    }
  });

  // ========== TIMER SHORTCUTS ==========

  // Get all shortcuts for current user
  // NOTE: Called by BOTH web app and extension, so no extensionAuthMiddleware
  app.get('/shortcuts', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    try {
      const shortcuts = await getShortcuts(request.user.userId);
      return { shortcuts };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to get shortcuts' });
    }
  });

  // Create new shortcut
  // NOTE: Called by BOTH web app and extension, so no extensionAuthMiddleware
  app.post('/shortcuts', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    try {
      const data = createShortcutSchema.parse(request.body) as CreateShortcutData;
      const shortcut = await createShortcut(request.user.userId, data);

      // Emit WebSocket event for real-time sync
      const io = (app as any).io;
      if (io) {
        console.log('📢 EMITTING shortcuts:updated event for user:', request.user.userId);
        console.log('   - Shortcut:', shortcut.label);
        io.to(`user:${request.user.userId}`).emit('shortcuts:updated', { shortcut });
        console.log('   - Event emitted to room: user:' + request.user.userId);
      }

      return reply.code(201).send({ shortcut });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid shortcut data', details: error.errors });
      }
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to create shortcut' });
    }
  });

  // Update shortcut
  // NOTE: Called by BOTH web app and extension, so no extensionAuthMiddleware
  app.put('/shortcuts/:id', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const data = updateShortcutSchema.parse(request.body) as UpdateShortcutData;
      const shortcut = await updateShortcut(id, request.user.userId, data);

      // Emit WebSocket event for real-time sync
      const io = (app as any).io;
      if (io) {
        console.log('📢 EMITTING shortcuts:updated event for user:', request.user.userId);
        console.log('   - Shortcut:', shortcut.label);
        io.to(`user:${request.user.userId}`).emit('shortcuts:updated', { shortcut });
        console.log('   - Event emitted to room: user:' + request.user.userId);
      }

      return { shortcut };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid shortcut data', details: error.errors });
      }
      if (error.message === 'Shortcut not found') {
        return reply.code(404).send({ error: 'Shortcut not found' });
      }
      if (error.message === 'Not authorized to update this shortcut') {
        return reply.code(403).send({ error: 'Not authorized to update this shortcut' });
      }
      if (error.message === 'Task not found') {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to update shortcut' });
    }
  });

  // Delete shortcut
  // NOTE: Called by BOTH web app and extension, so no extensionAuthMiddleware
  app.delete('/shortcuts/:id', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const result = await deleteShortcut(id, request.user.userId);

      // Emit WebSocket event for real-time sync
      const io = (app as any).io;
      if (io) {
        console.log('📢 EMITTING shortcuts:updated (DELETE) for user:', request.user.userId);
        console.log('   - Deleted ID:', id);
        io.to(`user:${request.user.userId}`).emit('shortcuts:updated', { deletedId: id });
        console.log('   - Event emitted to room: user:' + request.user.userId);

        // If we stopped a timer, notify about that too
        if (result.stoppedTimer) {
          console.log('📢 Also emitting time:discarded (timer was stopped)');
          io.to(`user:${request.user.userId}`).emit('time:discarded', {});
        }
      }

      return { success: true, stoppedTimer: result.stoppedTimer };
    } catch (error: any) {
      if (error.message === 'Shortcut not found') {
        return reply.code(404).send({ error: 'Shortcut not found' });
      }
      if (error.message === 'Not authorized to delete this shortcut') {
        return reply.code(403).send({ error: 'Not authorized to delete this shortcut' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to delete shortcut' });
    }
  });

  // Bulk reorder shortcuts
  // NOTE: Called by BOTH web app and extension, so no extensionAuthMiddleware
  app.post('/shortcuts/reorder', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    try {
      const { shortcuts } = reorderShortcutsSchema.parse(request.body);
      await reorderShortcuts(request.user.userId, shortcuts as ReorderShortcutData[]);

      // Emit WebSocket event for real-time sync
      const io = (app as any).io;
      if (io) {
        io.to(`user:${request.user.userId}`).emit('shortcuts:updated', {});
      }

      return { success: true };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid reorder data', details: error.errors });
      }
      if (error.message === 'Not authorized to reorder these shortcuts') {
        return reply.code(403).send({ error: 'Not authorized to reorder these shortcuts' });
      }
      return reply.code(500).send({ error: error.message || 'Failed to reorder shortcuts' });
    }
  });
}
