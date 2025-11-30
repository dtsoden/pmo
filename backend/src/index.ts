import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory path in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root (parent directory)
// From dist/index.js -> ../.. gets to project root
dotenv.config({ path: resolve(__dirname, '../../.env') });
import './shared/types.js'; // Type augmentation
import { createServer } from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import { logger } from './core/utils/logger.js';
import { db } from './core/database/client.js';
import { setupWebSocket } from './core/websocket/server.js';
import { authMiddleware } from './core/middleware/auth.middleware.js';

// Import route modules
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { clientRoutes } from './modules/clients/clients.routes.js';
import { projectRoutes } from './modules/projects/projects.routes.js';
import { resourceRoutes } from './modules/resources/resources.routes.js';
import { capacityRoutes } from './modules/capacity/capacity.routes.js';
import { timeTrackingRoutes } from './modules/timetracking/timetracking.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { notificationRoutes } from './modules/notifications/notifications.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { teamRoutes } from './modules/teams/teams.routes.js';
import { extensionRoutes } from './modules/extension/extension.routes.js';
import { timecardExportRoutes } from './modules/timetracking/timecard-export.routes.js';

const PORT = parseInt(process.env.PORT || '7600', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Parse CORS origins
    const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:7610')
      .split(',')
      .map(origin => origin.trim());

    // CORS origin checker - allows configured origins + Chrome extensions
    const corsOriginChecker = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // No origin (like curl) - allow
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow configured origins
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Allow Chrome extensions
      if (origin.startsWith('chrome-extension://')) {
        callback(null, true);
        return;
      }
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    };

    // Create HTTP server first
    const httpServer = createServer();

    // Create Socket.IO server and attach to HTTP server
    const io = new Server(httpServer, {
      cors: {
        origin: corsOriginChecker,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      // Allow both WebSocket and polling - polling works through Cloudflare tunnels
      transports: ['websocket', 'polling'],
      // Upgrade timeout for slow connections
      upgradeTimeout: 30000,
      // Allow HTTP long-polling as fallback
      allowEIO3: true,
    });

    // Setup WebSocket handlers
    await setupWebSocket(io);

    // Create Fastify app with custom server factory
    const app = Fastify({
      logger: logger as any,
      trustProxy: true,
      serverFactory: (handler) => {
        httpServer.on('request', handler);
        return httpServer;
      },
    });

    // Register plugins
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    });

    await app.register(cors, {
      origin: corsOriginChecker,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });

    await app.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });

    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Decorate with authenticate middleware
    app.decorate('authenticate', authMiddleware);

    // Attach Socket.IO instance to Fastify app for use in routes
    (app as any).io = io;

    // Health check
    app.get('/health', async () => {
      try {
        await db.$queryRaw`SELECT 1`;
        return { status: 'ok', timestamp: new Date().toISOString() };
      } catch (error) {
        return { status: 'error', message: 'Database connection failed' };
      }
    });

    // API Routes
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.register(userRoutes, { prefix: '/api/users' });
    await app.register(clientRoutes, { prefix: '/api/clients' });
    await app.register(projectRoutes, { prefix: '/api/projects' });
    await app.register(resourceRoutes, { prefix: '/api/resources' });
    await app.register(capacityRoutes, { prefix: '/api/capacity' });
    await app.register(timeTrackingRoutes, { prefix: '/api/timetracking' });
    await app.register(analyticsRoutes, { prefix: '/api/analytics' });
    await app.register(notificationRoutes, { prefix: '/api/notifications' });
    await app.register(adminRoutes, { prefix: '/api/admin' });
    await app.register(teamRoutes, { prefix: '/api/teams' });
    await app.register(extensionRoutes, { prefix: '/api/extension' });
    await app.register(timecardExportRoutes, { prefix: '/api/timecard' });

    // Start server
    await app.ready();
    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔌 WebSocket ready on ws://${HOST}:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      await app.close();
      await db.$disconnect();
      io.close();
      httpServer.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();
