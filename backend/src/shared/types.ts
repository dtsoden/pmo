import { UserRole } from '@prisma/client';

// JWT Payload type
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

// Augment Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Re-export commonly used types
export { UserRole };
