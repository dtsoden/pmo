import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import { verifyToken } from '../../modules/auth/auth.service.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export async function setupWebSocket(io: Server) {
  // Setup Redis adapter for multi-instance support
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis adapter:', error);
      logger.warn('Continuing without Redis adapter (single-instance mode)');
    }
  } else {
    logger.info('REDIS_URL not configured, running in single-instance mode');
  }

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = await verifyToken(token);
      socket.userId = decoded.userId;

      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Client connected: ${socket.id}, User: ${socket.userId}`);

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Time tracking events
    socket.on('time:start', async (data) => {
      logger.info(`User ${socket.userId} started time tracking:`, data);
      // Broadcast to user's other sessions
      socket.to(`user:${socket.userId}`).emit('time:started', data);
    });

    socket.on('time:stop', async (data) => {
      logger.info(`User ${socket.userId} stopped time tracking:`, data);
      socket.to(`user:${socket.userId}`).emit('time:stopped', data);
    });

    // Project updates
    socket.on('project:join', (projectId: string) => {
      socket.join(`project:${projectId}`);
      logger.info(`User ${socket.userId} joined project room: ${projectId}`);
    });

    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      logger.info(`User ${socket.userId} left project room: ${projectId}`);
    });

    // Task updates
    socket.on('task:join', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:leave', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    // Presence/typing indicators
    socket.on('user:typing', (data) => {
      socket.to(data.room).emit('user:typing', {
        userId: socket.userId,
        ...data,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Helper functions to emit events from other parts of the app
export function emitToUser(io: Server, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToProject(io: Server, projectId: string, event: string, data: any) {
  io.to(`project:${projectId}`).emit(event, data);
}

export function emitToTask(io: Server, taskId: string, event: string, data: any) {
  io.to(`task:${taskId}`).emit(event, data);
}
