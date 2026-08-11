import { PrismaClient } from '@prisma/client';

/**
 * A single client across hot reloads. Without this, `next dev` opens a new pool
 * on every edit and Neon starts refusing connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
