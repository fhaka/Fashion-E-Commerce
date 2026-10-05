import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../db/prisma';
import { api, app, cookieValue, inStockVariant, outOfStockVariant, registerUser, setCookieLine } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('guest cart', () => {
  it('returns an empty cart without creating one', async () => {
    const res = await request(app).get(api('/cart'));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: null, items: [], itemCount: 0, subtotal: 0 });
    expect(setCookieLine(res, 'maison_cart')).toBeUndefined();
  });

  it('creates a cart session cookie on first add and accumulates quantities', async () => {
    const agent = request.agent(app);
    const { variant } = await inStockVariant(5);

    const first = await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 1 });
    expect(first.status).toBe(201);
    expect(setCookieLine(first, 'maison_cart')).toContain('HttpOnly');

    const second = await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 2 });
    expect(second.body.data.items).toHaveLength(1);
    expect(second.body.data.items[0].quantity).toBe(3);
    expect(second.body.data.itemCount).toBe(3);
    expect(second.body.data.subtotal).toBe(second.body.data.items[0].unitPrice * 3);

    const fetched = await agent.get(api('/cart'));
    expect(fetched.body.data.items[0]).toMatchObject({
      variantId: variant.id,
      product: { slug: variant.product.slug },
      issue: null,
    });
  });

  it('enforces stock limits', async () => {
    const agent = request.agent(app);
    const { variant } = await inStockVariant(3);
    const inv = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { quantity: 2 } });

    const over = await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 3 });
    expect(over.status).toBe(409);
    expect(over.body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK', message: 'Only 2 left in stock', details: { available: 2 } });
    expect((await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 2 })).status).toBe(201);
    // Adding more on top of what's already in the cart is also checked.
    expect((await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 1 })).status).toBe(409);
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { quantity: inv.quantity } });

    // Per-line cap is enforced by validation.
    expect((await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 21 })).status).toBe(422);

    const sold = await outOfStockVariant();
    const out = await agent.post(api('/cart/items')).send({ variantId: sold.id, quantity: 1 });
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('OUT_OF_STOCK');
  });

  it('updates and removes items; quantity 0 removes', async () => {
    const agent = request.agent(app);
    const { variant } = await inStockVariant(5);
    const add = await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 1 });
    const itemId = add.body.data.items[0].id;

    const upd = await agent.patch(api(`/cart/items/${itemId}`)).send({ quantity: 2 });
    expect(upd.body.data.items[0].quantity).toBe(2);

    const zero = await agent.patch(api(`/cart/items/${itemId}`)).send({ quantity: 0 });
    expect(zero.body.data.items).toHaveLength(0);
  });

  it('does not let one shopper modify another shopper\'s cart', async () => {
    const alice = request.agent(app);
    const { variant } = await inStockVariant(5);
    const add = await alice.post(api('/cart/items')).send({ variantId: variant.id, quantity: 1 });
    const itemId = add.body.data.items[0].id;

    const mallory = request.agent(app);
    await mallory.post(api('/cart/items')).send({ variantId: variant.id, quantity: 1 });
    expect((await mallory.delete(api(`/cart/items/${itemId}`))).status).toBe(404);
    expect((await request(app).patch(api(`/cart/items/${itemId}`)).send({ quantity: 3 })).status).toBe(404);
  });

  it('flags items that went out of stock after being added', async () => {
    const agent = request.agent(app);
    const { variant } = await inStockVariant(5);
    await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 2 });
    const inv = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { quantity: 0 } });

    const res = await agent.get(api('/cart'));
    expect(res.body.data.items[0].issue).toBe('OUT_OF_STOCK');
    expect(res.body.data.hasIssues).toBe(true);
    expect(res.body.data.subtotal).toBe(0);

    await prisma.inventory.update({ where: { variantId: variant.id }, data: { quantity: inv.quantity } });
  });
});

describe('cart merge on sign-in', () => {
  it('moves the guest cart into the account on registration', async () => {
    const guest = request.agent(app);
    const { variant } = await inStockVariant(5);
    const add = await guest.post(api('/cart/items')).send({ variantId: variant.id, quantity: 2 });
    const sessionId = cookieValue(add, 'maison_cart')!;

    const reg = await guest.post(api('/auth/register')).send({ firstName: 'Merge', lastName: 'Test', email: `merge.${Date.now()}@example.test`, password: 'Password123' });
    expect(reg.status).toBe(201);
    const auth = { Authorization: `Bearer ${reg.body.data.accessToken}` };

    const cart = await guest.get(api('/cart')).set(auth);
    expect(cart.body.data.items).toHaveLength(1);
    expect(cart.body.data.items[0].quantity).toBe(2);
    expect(await prisma.cart.findUnique({ where: { sessionId } })).toBeNull();
  });

  it('sums quantities with items already in the account cart', async () => {
    const { variant } = await inStockVariant(6);
    const { email, password, auth } = await registerUser();
    await request(app).post(api('/cart/items')).set(auth).send({ variantId: variant.id, quantity: 1 });

    const guest = request.agent(app);
    await guest.post(api('/cart/items')).send({ variantId: variant.id, quantity: 2 });
    const login = await guest.post(api('/auth/login')).send({ email, password });
    const cart = await guest.get(api('/cart')).set({ Authorization: `Bearer ${login.body.data.accessToken}` });
    expect(cart.body.data.items[0].quantity).toBe(3);
  });
});
