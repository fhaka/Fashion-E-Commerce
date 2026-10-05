import type { Request, Response } from 'express';
import * as account from '../services/account.service';
import * as auth from '../services/auth.service';
import * as engagement from '../services/engagement.service';
import * as wishlist from '../services/wishlist.service';

const uid = (req: Request) => req.user!.id;

/* Profile */
export async function getProfile(req: Request, res: Response) {
  res.json({ data: await auth.getMe(uid(req)) });
}
export async function updateProfile(req: Request, res: Response) {
  res.json({ data: await account.updateProfile(uid(req), req.valid.body) });
}

/* Addresses */
export async function listAddresses(req: Request, res: Response) {
  res.json({ data: await account.listAddresses(uid(req)) });
}
export async function createAddress(req: Request, res: Response) {
  res.status(201).json({ data: await account.createAddress(uid(req), req.valid.body) });
}
export async function updateAddress(req: Request, res: Response) {
  res.json({ data: await account.updateAddress(uid(req), req.params.id as string, req.valid.body) });
}
export async function deleteAddress(req: Request, res: Response) {
  await account.deleteAddress(uid(req), req.params.id as string);
  res.status(204).end();
}

/* Orders */
export async function listOrders(req: Request, res: Response) {
  const { page, limit } = req.valid.query;
  res.json(await account.listOrders(uid(req), page, limit));
}
export async function getOrder(req: Request, res: Response) {
  res.json({ data: await account.getOrder(uid(req), (req.params.orderNumber as string).toUpperCase()) });
}
export async function trackOrder(req: Request, res: Response) {
  const { orderNumber, email } = req.valid.query;
  res.json({ data: await account.trackOrder(orderNumber, email) });
}

/* Wishlist */
export async function getWishlist(req: Request, res: Response) {
  res.json({ data: await wishlist.getWishlist(uid(req)) });
}
export async function getWishlistIds(req: Request, res: Response) {
  res.json({ data: await wishlist.getWishlistIds(uid(req)) });
}
export async function addToWishlist(req: Request, res: Response) {
  res.status(201).json({ data: await wishlist.addToWishlist(uid(req), req.params.productId as string) });
}
export async function removeFromWishlist(req: Request, res: Response) {
  res.json({ data: await wishlist.removeFromWishlist(uid(req), req.params.productId as string) });
}

/* Newsletter & contact */
export async function subscribe(req: Request, res: Response) {
  const { alreadySubscribed } = await engagement.subscribe(req.valid.body.email, req.valid.body.source);
  res.status(alreadySubscribed ? 200 : 201).json({
    data: { message: alreadySubscribed ? 'You are already on the list.' : 'Welcome to Maison. Check your inbox.' },
  });
}
export async function unsubscribe(req: Request, res: Response) {
  await engagement.unsubscribe(req.valid.body.email, req.valid.body.token);
  res.json({ data: { message: 'You have been unsubscribed.' } });
}
export async function contact(req: Request, res: Response) {
  await engagement.createContactMessage(req.valid.body);
  res.status(201).json({ data: { message: 'Thank you — we will be in touch within one business day.' } });
}
