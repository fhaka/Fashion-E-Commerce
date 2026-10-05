import type { Request, Response } from 'express';
import * as auth from '../services/auth.service';
import { demoLogin as startDemoSession, type DemoRole } from '../services/demo.service';
import { mergeGuestCart } from '../services/cart.service';
import { clearCartCookie, clearRefreshCookie, getCartSession, REFRESH_COOKIE, setRefreshCookie } from '../utils/cookies';

const meta = (req: Request) => ({ userAgent: req.get('user-agent'), ip: req.ip });

function respond(res: Response, result: auth.AuthResult, status = 200) {
  if (result.refresh) setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
  res.status(status).json({ data: { user: result.user, accessToken: result.accessToken } });
}

async function adoptGuestCart(req: Request, res: Response, userId: string) {
  const sessionId = getCartSession(req);
  if (!sessionId) return;
  await mergeGuestCart(userId, sessionId);
  clearCartCookie(res);
}

export async function register(req: Request, res: Response) {
  const result = await auth.register(req.valid.body, meta(req));
  await adoptGuestCart(req, res, result.user.id);
  respond(res, result, 201);
}

export async function login(req: Request, res: Response) {
  const result = await auth.login(req.valid.body, meta(req));
  await adoptGuestCart(req, res, result.user.id);
  respond(res, result);
}

/** Public demo only: one-click sign-in as the demo customer or admin. */
export async function demoLogin(req: Request, res: Response) {
  const result = await startDemoSession(req.valid.body.role as DemoRole, meta(req));
  await adoptGuestCart(req, res, result.user.id);
  respond(res, result);
}

export async function refresh(req: Request, res: Response) {
  try {
    const result = await auth.refresh(req.cookies?.[REFRESH_COOKIE], meta(req));
    respond(res, result);
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  await auth.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  res.json({ data: await auth.getMe(req.user!.id) });
}

export async function forgotPassword(req: Request, res: Response) {
  await auth.forgotPassword(req.valid.body.email);
  res.json({ data: { message: 'If an account exists for that email, a reset link is on its way.' } });
}

export async function resetPassword(req: Request, res: Response) {
  await auth.resetPassword(req.valid.body.token, req.valid.body.password);
  clearRefreshCookie(res);
  res.json({ data: { message: 'Your password has been updated. Please sign in.' } });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.valid.body;
  await auth.changePassword(req.user!.id, currentPassword, newPassword, req.cookies?.[REFRESH_COOKIE]);
  res.json({ data: { message: 'Password updated. Other devices have been signed out.' } });
}
