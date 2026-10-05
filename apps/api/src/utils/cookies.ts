import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';

export const REFRESH_COOKIE = 'maison_rt';
export const CART_COOKIE = 'maison_cart';
/**
 * Non-sensitive hint ("a session probably exists") readable by the storefront, so guests
 * don't fire a refresh request on every page load. Carries no credential.
 */
export const SESSION_HINT_COOKIE = 'maison_session';

const base = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  domain: env.COOKIE_DOMAIN,
});

export function setRefreshCookie(res: Response, token: string, expires: Date) {
  // Scoped to the auth routes so the token is never sent with ordinary API calls.
  res.cookie(REFRESH_COOKIE, token, { ...base(), path: '/api/v1/auth', expires });
  res.cookie(SESSION_HINT_COOKIE, '1', { ...base(), httpOnly: false, path: '/', expires });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { ...base(), path: '/api/v1/auth' });
  res.clearCookie(SESSION_HINT_COOKIE, { ...base(), httpOnly: false, path: '/' });
}

export function getCartSession(req: Request): string | undefined {
  const value = req.cookies?.[CART_COOKIE];
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(value) ? value : undefined;
}

export function setCartCookie(res: Response, sessionId: string) {
  res.cookie(CART_COOKIE, sessionId, { ...base(), path: '/', maxAge: 60 * 24 * 60 * 60 * 1000 });
}

export function clearCartCookie(res: Response) {
  res.clearCookie(CART_COOKIE, { ...base(), path: '/' });
}
