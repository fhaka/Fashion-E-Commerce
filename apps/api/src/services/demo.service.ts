import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { issueSession, type AuthResult, type SessionMeta } from './auth.service';

/**
 * Public demo mode (DEMO_MODE=true): one-click sign-in for prospects, guardrails that keep
 * the demo usable for the next visitor, and a nightly data reset (prisma/scripts/demo-reset.ts).
 * Never enable it on a client's live shop.
 */

export type DemoRole = 'customer' | 'admin';

const demoEmail = (role: DemoRole) => (role === 'admin' ? env.DEMO_ADMIN_EMAIL : env.DEMO_CUSTOMER_EMAIL);

/** Next scheduled reset (daily at DEMO_RESET_HOUR_UTC). */
export function nextDemoReset(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), env.DEMO_RESET_HOUR_UTC));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function demoInfo() {
  if (!env.DEMO_MODE) return null;
  return { resetHourUtc: env.DEMO_RESET_HOUR_UTC, nextResetAt: nextDemoReset().toISOString(), roles: ['customer', 'admin'] as DemoRole[] };
}

export function isDemoAccount(email: string) {
  return env.DEMO_MODE && (email === env.DEMO_ADMIN_EMAIL || email === env.DEMO_CUSTOMER_EMAIL);
}

/** Throws when a demo visitor tries to change something that would lock out the next visitor. */
export async function assertNotDemoAccount(userId: string, action: string) {
  if (!env.DEMO_MODE) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user && isDemoAccount(user.email)) throw ApiError.forbidden(`${action} is disabled for the demo accounts`);
}

export async function demoLogin(role: DemoRole, meta: SessionMeta): Promise<AuthResult> {
  if (!env.DEMO_MODE) throw ApiError.notFound();
  const user = await prisma.user.findUnique({ where: { email: demoEmail(role) } });
  if (!user || !user.isActive || (role === 'admin' && user.role !== 'ADMIN')) {
    throw new ApiError(503, 'DEMO_UNAVAILABLE', 'The demo is being reset. Please try again in a minute.');
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return issueSession(user, meta);
}
