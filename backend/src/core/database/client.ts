import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Singleton Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Database connection test
export async function connectDatabase() {
  try {
    await db.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Graceful disconnect
export async function disconnectDatabase() {
  await db.$disconnect();
  logger.info('Database disconnected');
}
