import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/tokens';

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/** Requires a valid access token. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new ApiError(401, 'TOKEN_EXPIRED', 'Your session has expired'));
  }
}

/** Attaches the user if a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      /* treat as anonymous */
    }
  }
  next();
}

/**
 * Admin guard. Re-checks role + active status against the database so a demoted
 * or disabled admin loses access immediately, not when their token expires.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive || user.role !== 'ADMIN') return next(ApiError.forbidden());
  next();
}
