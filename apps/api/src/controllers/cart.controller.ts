import type { Request, Response } from 'express';
import * as cart from '../services/cart.service';
import { clearCartCookie, getCartSession, setCartCookie } from '../utils/cookies';

const owner = (req: Request): cart.CartOwner =>
  req.user ? { userId: req.user.id } : { sessionId: getCartSession(req) };

export async function getCart(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store');
  res.json({ data: await cart.getCart(owner(req)) });
}

export async function addItem(req: Request, res: Response) {
  const { variantId, quantity } = req.valid.body;
  const result = await cart.addItem(owner(req), variantId, quantity);
  if (result.newSessionId) setCartCookie(res, result.newSessionId);
  res.status(201).json({ data: result.cart });
}

export async function updateItem(req: Request, res: Response) {
  res.json({ data: await cart.updateItem(owner(req), req.params.id as string, req.valid.body.quantity) });
}

export async function removeItem(req: Request, res: Response) {
  res.json({ data: await cart.removeItem(owner(req), req.params.id as string) });
}

export async function clear(req: Request, res: Response) {
  await cart.clearCart(owner(req));
  res.json({ data: await cart.getCart(owner(req)) });
}

export async function merge(req: Request, res: Response) {
  await cart.mergeGuestCart(req.user!.id, getCartSession(req));
  clearCartCookie(res);
  res.json({ data: await cart.getCart({ userId: req.user!.id }) });
}
