import { FastifyInstance } from 'fastify';
import { login, register, logout, changePassword, getCurrentUser } from './auth.service.js';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// Helper to extract request context
function getRequestContext(request: any) {
  return {
    ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
    userAgent: request.headers['user-agent'] || undefined,
  };
}

export async function authRoutes(app: FastifyInstance) {
  // Login
  app.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const ctx = getRequestContext(request);
      const result = await login(body.email, body.password, ctx);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      // Return 423 for locked accounts
      if (message.includes('Account is locked')) {
        return reply.code(423).send({ error: message });
      }
      return reply.code(401).send({ error: message });
    }
  });

  // Register
  app.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body) as {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
      };
      const ctx = getRequestContext(request);
      const result = await register(body, ctx);
      reply.code(201).send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      reply.code(400).send({ error: message });
    }
  });

  // Get current user (protected)
  app.get('/me', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const user = await getCurrentUser(request.user.userId);
      return user;
    } catch {
      reply.code(404).send({ error: 'User not found' });
    }
  });

  // Change password (protected)
  app.post('/change-password', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const body = changePasswordSchema.parse(request.body);
      const ctx = getRequestContext(request);
      const result = await changePassword(
        request.user.userId,
        body.currentPassword,
        body.newPassword,
        ctx
      );
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      if (message === 'Current password is incorrect') {
        return reply.code(400).send({ error: message });
      }
      return reply.code(500).send({ error: message });
    }
  });

  // Logout (protected - properly terminates session)
  app.post('/logout', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const ctx = getRequestContext(request);
      // Try to get sessionId from body if provided
      const body = request.body as { sessionId?: string } | undefined;
      await logout(request.user.userId, {
        sessionId: body?.sessionId,
        ...ctx,
      });
      return { message: 'Logged out successfully' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      return reply.code(500).send({ error: message });
    }
  });
}
