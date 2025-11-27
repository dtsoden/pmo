import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Using type assertion to handle ESM/CJS interop
const createPino = (pino as any).default || pino;

export const logger = createPino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
