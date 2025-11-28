import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';

/**
 * Middleware to validate Extension API Key
 * Provides an additional security layer for extension-specific endpoints
 * Prevents malicious Chrome extensions from calling our API even with stolen JWT tokens
 */
export async function extensionAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const extensionApiKey = process.env.EXTENSION_API_KEY;

  // If no extension API key is configured, log warning and allow (for backwards compatibility)
  if (!extensionApiKey) {
    logger.warn('EXTENSION_API_KEY not configured - extension endpoints are not secured!');
    return;
  }

  // Get API key from header
  const providedKey = request.headers['x-extension-api-key'] as string;

  if (!providedKey) {
    logger.warn(`Extension API call without API key from origin: ${request.headers.origin}`);
    return reply.code(403).send({
      error: 'Extension API key required',
      message: 'Please update your extension to the latest version'
    });
  }

  // Validate key using constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(providedKey, extensionApiKey)) {
    logger.error(`Invalid extension API key attempt from origin: ${request.headers.origin}`);
    return reply.code(403).send({
      error: 'Invalid extension API key',
      message: 'Extension authentication failed'
    });
  }

  // Key is valid, proceed
  logger.debug(`Extension API key validated for user: ${request.user?.userId}`);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
