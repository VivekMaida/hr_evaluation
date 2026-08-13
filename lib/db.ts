import { PrismaClient } from '@prisma/client';

/**
 * A single client across hot reloads. Without this, `next dev` opens a new pool
 * on every edit and Neon starts refusing connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaWarmed?: boolean };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Opening a *new* connection to Neon's pooled endpoint costs low seconds
 * here, not milliseconds — reusing an already-open one costs ~150-200ms.
 * That cost is paid once the pool has grown to whatever size a request
 * actually needs, not on every later request — but the first real
 * navigation to hit a page that fires several queries concurrently (Home,
 * Performance Log) would otherwise pay to grow the pool live, in the
 * middle of rendering. Firing a handful of trivial concurrent queries once,
 * right after the client is created, front-loads that growth to server
 * startup instead. Fire-and-forget: nothing should block on this, and a
 * failure here (e.g. no DB configured yet) must never crash the app.
 *
 * Skipped during `next build` itself (Next.js sets NEXT_PHASE for exactly
 * this) — the build's static-analysis pass imports this module too, has no
 * need for a live connection, and often has no DATABASE_URL in scope at all.
 */
if (!globalForPrisma.prismaWarmed && process.env.NEXT_PHASE !== 'phase-production-build') {
  globalForPrisma.prismaWarmed = true;
  Promise.all(Array.from({ length: 6 }, () => prisma.$queryRaw`SELECT 1`)).catch(() => {});
}
