import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from '../../modules/auth/auth.service.js';
import { db } from '../database/client.js';
import type { JwtPayload } from '../../shared/types.js';

// Session inactivity timeout in minutes
const SESSION_INACTIVITY_TIMEOUT_MINUTES = 5;

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token) as JwtPayload;

    // Session validation is REQUIRED for security
    if (!payload.sessionId) {
      return reply.code(401).send({ error: 'Invalid token: no session' });
    }

    // Validate session exists
    const session = await db.userSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session) {
      return reply.code(401).send({ error: 'Session terminated' });
    }

    // Check session expiration (hard expiry from DB)
    if (session.expiresAt < new Date()) {
      await db.userSession.delete({ where: { id: payload.sessionId } }).catch(() => {});
      return reply.code(401).send({ error: 'Session expired' });
    }

    // Check for inactivity timeout (20 minutes since last activity)
    const inactivityThreshold = new Date(Date.now() - SESSION_INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
    if (session.lastActive < inactivityThreshold) {
      // Session timed out due to inactivity
      await db.userSession.delete({ where: { id: payload.sessionId } }).catch(() => {});
      return reply.code(401).send({ error: 'Session timed out due to inactivity' });
    }

    // User is active - update lastActive timestamp (sliding window)
    // This extends the inactivity window on each request
    // Don't await to avoid adding latency to every request
    db.userSession.update({
      where: { id: payload.sessionId },
      data: { lastActive: new Date() },
    }).catch(() => {});

    request.user = payload;
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

// Role-based authorization
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
}
