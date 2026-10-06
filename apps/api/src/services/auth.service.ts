import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { LoginInput, RegisterInput } from '@maison/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../db/prisma';
import { hasFeature } from '../middleware/plan';
import { sendBrandedEmail } from '../providers/email/branded';
import { ApiError } from '../utils/ApiError';
import { addDays, randomToken, sha256 } from '../utils/helpers';
import { signAccessToken } from '../utils/tokens';
import { assertNotDemoAccount } from './demo.service';

const BCRYPT_ROUNDS = 12;
/** A refresh token reused within this window (e.g. two tabs refreshing at once) is not treated as theft. */
const REUSE_GRACE_MS = 30_000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
// Used to equalise response timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-password', BCRYPT_ROUNDS);

export type PublicUser = ReturnType<typeof toPublicUser>;

export function toPublicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
  };
}

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  /** Present when a new refresh cookie must be set. */
  refresh?: { token: string; expiresAt: Date };
}

export async function issueSession(user: User, meta: SessionMeta): Promise<AuthResult> {
  const token = randomToken(32);
  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
    },
  });
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refresh: { token, expiresAt },
  };
}

export async function register(input: RegisterInput, meta: SessionMeta): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists', { fields: { email: 'An account with this email already exists' } });

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, firstName: input.firstName, lastName: input.lastName, lastLoginAt: new Date() },
  });

  if (input.newsletter && hasFeature('newsletter')) {
    await prisma.newsletterSubscriber.upsert({
      where: { email: user.email },
      create: { email: user.email, source: 'register' },
      update: { status: 'SUBSCRIBED', unsubscribedAt: null },
    });
  }

  void sendBrandedEmail(user.email, (s) => ({
    subject: `Welcome to ${s.storeName}`,
    heading: `Welcome, ${user.firstName}`,
    paragraphs: [`Thank you for creating an account with ${s.storeName}. You can now check out faster, save addresses${hasFeature('wishlist') ? ', keep a wishlist' : ''} and follow every order.`],
    button: { label: 'Start shopping', url: `${env.WEB_URL}/shop` },
  }));

  return issueSession(user, meta);
}

export async function login(input: LoginInput, meta: SessionMeta): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Please contact client services.');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return issueSession(user, meta);
}

export async function refresh(rawToken: string | undefined, meta: SessionMeta): Promise<AuthResult> {
  if (!rawToken) throw ApiError.unauthorized('No active session');
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });
  if (!stored) throw ApiError.unauthorized('No active session');

  const { user } = stored;
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  if (stored.revokedAt) {
    const recentlyRotated = stored.replacedBy && Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS;
    if (recentlyRotated) {
      // Concurrent refresh: the browser already holds the replacement cookie, so just mint an access token.
      return { user: toPublicUser(user), accessToken: signAccessToken({ sub: user.id, role: user.role }) };
    }
    // A revoked token was presented again — likely stolen. Kill every session for this user.
    logger.warn({ userId: user.id }, 'Refresh token reuse detected; revoking all sessions');
    await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    throw ApiError.unauthorized('Session expired, please sign in again');
  }

  if (stored.expiresAt < new Date()) throw ApiError.unauthorized('Session expired, please sign in again');

  const next = await issueSession(user, meta);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedBy: sha256(next.refresh!.token) },
  });
  return next;
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized();
  return toPublicUser(user);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed silently so the endpoint cannot be used to discover accounts.
  if (!user || !user.isActive) return;

  const token = randomToken(32);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });
  // Not awaited: waiting on the mail server would make known emails measurably slower to answer.
  void sendBrandedEmail(user.email, (s) => ({
    subject: `Reset your ${s.storeName} password`,
    heading: 'Choose a new password',
    paragraphs: [`Dear ${user.firstName},`, 'We received a request to reset your password. Use the button below to choose a new one.'],
    button: { label: 'Reset password', url: `${env.WEB_URL}/reset-password?token=${token}` },
    note: 'This link expires in 1 hour. If you did not request it, you can ignore this email; your password stays the same.',
  }));
}

export async function resetPassword(token: string, password: string) {
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Please request a new one.');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    // Sign out everywhere after a reset.
    prisma.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepTokenRaw?: string) {
  await assertNotDemoAccount(userId, 'Changing the password');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.validation({ fields: { currentPassword: 'Current password is incorrect' } });
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Sign out other devices but keep the current session.
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(keepTokenRaw ? { tokenHash: { not: sha256(keepTokenRaw) } } : {}) },
      data: { revokedAt: new Date() },
    }),
  ]);
}
