import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query errors are handled and logged by the error middleware; avoid duplicate noise in tests.
    log: env.isTest ? [] : env.isProd ? ['error'] : ['error', 'warn'],
  });

if (!env.isProd) globalForPrisma.prisma = prisma;

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
