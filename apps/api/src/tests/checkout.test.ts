import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../db/prisma';
import { expireStaleReservations } from '../services/order.service';
import { api, app, inStockVariant, placeOrder, registerUser, SHIPPING_ADDRESS, uniqueEmail } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

const inventory = (variantId: string) => prisma.inventory.findUniqueOrThrow({ where: { variantId } });

async function variantWithPrice(minCents: number, maxCents: number) {
  const v = await prisma.productVariant.findFirstOrThrow({
    where: { isActive: true, product: { status: 'ACTIVE', basePrice: { gte: minCents, lte: maxCents } }, inventory: { quantity: { gte: 15 }, reserved: 0 } },
    include: { product: true },
    orderBy: { sku: 'asc' },
  });
  return v;
}

describe('quote', () => {
  it('prices the cart server-side with tax and shipping', async () => {
    const agent = request.agent(app);
    const v = await variantWithPrice(5000, 20000); // under the free-shipping threshold
    await agent.post(api('/cart/items')).send({ variantId: v.id, quantity: 1 });

    const res = await agent.post(api('/checkout/quote')).send({ shippingMethod: 'standard' });
    expect(res.status).toBe(200);
    const q = res.body.data;
    expect(q.subtotal).toBe(v.product.basePrice);
    expect(q.shippingTotal).toBe(1200);
    expect(q.taxTotal).toBe(Math.round(q.subtotal * 0.08));
    expect(q.total).toBe(q.subtotal + q.shippingTotal + q.taxTotal);
    expect(q.amountToFreeShipping).toBe(25000 - q.subtotal);
  });

  it('ships free over the threshold with standard, but charges for express', async () => {
    const v = await variantWithPrice(30000, 90000);
    const std = await request(app).post(api('/checkout/quote')).send({ items: [{ variantId: v.id, quantity: 1 }], shippingMethod: 'standard' });
    expect(std.body.data.shippingTotal).toBe(0);
    const exp = await request(app).post(api('/checkout/quote')).send({ items: [{ variantId: v.id, quantity: 1 }], shippingMethod: 'express' });
    expect(exp.body.data.shippingTotal).toBe(2500);
  });

  it('applies valid coupons and reports invalid ones without failing', async () => {
    const v = await variantWithPrice(30000, 90000);
    const items = [{ variantId: v.id, quantity: 1 }];
    const ok = await request(app).post(api('/checkout/quote')).send({ items, couponCode: 'welcome10' });
    expect(ok.body.data.coupon.code).toBe('WELCOME10');
    expect(ok.body.data.discountTotal).toBe(Math.round(v.product.basePrice * 0.1));
    expect(ok.body.data.taxTotal).toBe(Math.round((v.product.basePrice - ok.body.data.discountTotal) * 0.08));

    const expired = await request(app).post(api('/checkout/quote')).send({ items, couponCode: 'SUMMER25' });
    expect(expired.status).toBe(200);
    expect(expired.body.data.coupon).toBeNull();
    expect(expired.body.data.couponError).toBe('This code has expired');
    expect(expired.body.data.discountTotal).toBe(0);
  });

  it('validates coupon rules via the dedicated endpoint', async () => {
    const low = await request(app).post(api('/checkout/coupon/validate')).send({ code: 'SAVE50', subtotal: 10000 });
    expect(low.status).toBe(422);
    expect(low.body.error.message).toBe('Spend $400 or more to use this code');
    const ok = await request(app).post(api('/checkout/coupon/validate')).send({ code: 'SAVE50', subtotal: 50000 });
    expect(ok.body.data).toMatchObject({ code: 'SAVE50', type: 'FIXED', value: 5000 });
    expect((await request(app).post(api('/checkout/coupon/validate')).send({ code: 'NOPE', subtotal: 50000 })).status).toBe(422);
  });

  it('rejects an empty bag', async () => {
    const res = await request(app).post(api('/checkout/quote')).send({});
    expect(res.status).toBe(400);
  });
});

describe('guest checkout with demo payments', () => {
  it('reserves stock, handles a declined card, then completes payment', async () => {
    const agent = request.agent(app);
    const { variant } = await inStockVariant(5);
    await agent.post(api('/cart/items')).send({ variantId: variant.id, quantity: 2 });
    const before = await inventory(variant.id);

    const email = uniqueEmail('guest');
    const placed = await agent.post(api('/checkout')).send({ email, shippingAddress: SHIPPING_ADDRESS, shippingMethod: 'standard' });
    expect(placed.status).toBe(201);
    const { orderNumber, payment } = placed.body.data;
    expect(orderNumber).toMatch(/^MS-[A-Z2-9]{8}$/);
    expect(payment.provider).toBe('mock');

    // Stock is held, not yet deducted.
    const held = await inventory(variant.id);
    expect(held.reserved).toBe(before.reserved + 2);
    expect(held.quantity).toBe(before.quantity);

    // Declined card keeps the order pending.
    const declined = await request(app).post(api(`/checkout/${orderNumber}/confirm-mock`)).send({ clientSecret: payment.clientSecret, outcome: 'decline' });
    expect(declined.status).toBe(402);
    expect((await prisma.order.findUniqueOrThrow({ where: { orderNumber } })).status).toBe('PENDING');

    // Wrong secret can't confirm someone else's order.
    expect((await request(app).post(api(`/checkout/${orderNumber}/confirm-mock`)).send({ clientSecret: 'x'.repeat(40) })).status).toBe(404);

    const paid = await request(app).post(api(`/checkout/${orderNumber}/confirm-mock`)).send({ clientSecret: payment.clientSecret });
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('PAID');

    const after = await inventory(variant.id);
    expect(after.quantity).toBe(before.quantity - 2);
    expect(after.reserved).toBe(before.reserved);
    expect(await prisma.inventoryMovement.count({ where: { variantId: variant.id, reason: 'SALE' } })).toBeGreaterThan(0);

    // Cart cleared after payment.
    expect((await agent.get(api('/cart'))).body.data.items).toHaveLength(0);

    // Confirmation page: needs the payment key (guest) — never public.
    expect((await request(app).get(api(`/checkout/${orderNumber}/confirmation`))).status).toBe(404);
    const conf = await request(app).get(api(`/checkout/${orderNumber}/confirmation?key=${encodeURIComponent(payment.clientSecret)}`));
    expect(conf.status).toBe(200);
    expect(conf.body.data.timeline.map((e: { status: string }) => e.status)).toEqual(['PENDING', 'PAID']);

    // Re-confirming is idempotent — stock isn't deducted twice.
    await request(app).post(api(`/checkout/${orderNumber}/confirm-mock`)).send({ clientSecret: payment.clientSecret });
    expect((await inventory(variant.id)).quantity).toBe(before.quantity - 2);
  });

  it('ignores any client-supplied prices', async () => {
    const { variant } = await inStockVariant(3);
    const res = await request(app)
      .post(api('/checkout'))
      .send({ email: uniqueEmail(), shippingAddress: SHIPPING_ADDRESS, shippingMethod: 'standard', items: [{ variantId: variant.id, quantity: 1, price: 1 }], total: 1 });
    expect(res.status).toBe(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: res.body.data.orderId }, include: { items: true } });
    expect(order.items[0].unitPrice).toBe(variant.priceOverride ?? variant.product.basePrice);
  });

  it('validates the shipping address', async () => {
    const { variant } = await inStockVariant(3);
    const res = await request(app)
      .post(api('/checkout'))
      .send({ email: 'bad', shippingAddress: { ...SHIPPING_ADDRESS, postalCode: '' }, shippingMethod: 'drone', items: [{ variantId: variant.id, quantity: 1 }] });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fields)).toEqual(expect.arrayContaining(['email', 'shippingAddress.postalCode', 'shippingMethod']));
  });
});

describe('signed-in checkout', () => {
  it('"Buy now" checks out a single item without touching the bag, and saves the address', async () => {
    const { auth, user } = await registerUser();
    const { variant } = await inStockVariant(5);
    const other = await variantWithPrice(5000, 90000);
    await request(app).post(api('/cart/items')).set(auth).send({ variantId: other.id, quantity: 1 });

    const res = await request(app)
      .post(api('/checkout'))
      .set(auth)
      .send({ email: user.email, shippingAddress: SHIPPING_ADDRESS, shippingMethod: 'express', items: [{ variantId: variant.id, quantity: 1 }], saveAddress: true });
    expect(res.status).toBe(201);
    await request(app).post(api(`/checkout/${res.body.data.orderNumber}/confirm-mock`)).send({ clientSecret: res.body.data.payment.clientSecret });

    const cart = await request(app).get(api('/cart')).set(auth);
    expect(cart.body.data.items.map((i: { variantId: string }) => i.variantId)).toEqual([other.id]);

    const orders = await request(app).get(api('/account/orders')).set(auth);
    expect(orders.body.data[0].status).toBe('PAID');
    const addresses = await request(app).get(api('/account/addresses')).set(auth);
    expect(addresses.body.data[0]).toMatchObject({ line1: SHIPPING_ADDRESS.line1, isDefault: true });

    // Owner can view the confirmation without the key.
    expect((await request(app).get(api(`/checkout/${res.body.data.orderNumber}/confirmation`)).set(auth)).status).toBe(200);
  });

  it('enforces per-customer coupon limits', async () => {
    const { auth, user } = await registerUser();
    const { variant } = await inStockVariant(5);
    await placeOrder({ variantId: variant.id, auth, email: user.email, couponCode: 'WELCOME10' });
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { code: 'WELCOME10' } });
    expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId: user.id } })).toBe(1);

    const again = await request(app)
      .post(api('/checkout'))
      .set(auth)
      .send({ email: user.email, shippingAddress: SHIPPING_ADDRESS, shippingMethod: 'standard', items: [{ variantId: variant.id, quantity: 1 }], couponCode: 'WELCOME10' });
    expect(again.status).toBe(422);
    expect(again.body.error.message).toBe('You have already used this code');
  });
});

describe('inventory integrity', () => {
  it('never oversells when two shoppers race for the last unit', async () => {
    const { variant } = await inStockVariant(3);
    const original = await inventory(variant.id);
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { quantity: 1, reserved: 0 } });

    const attempt = () =>
      request(app)
        .post(api('/checkout'))
        .send({ email: uniqueEmail('race'), shippingAddress: SHIPPING_ADDRESS, shippingMethod: 'standard', items: [{ variantId: variant.id, quantity: 1 }] });
    const results = await Promise.all([attempt(), attempt(), attempt()]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
    expect((await inventory(variant.id)).reserved).toBe(1);

    // Clean up: cancel the winning order and restore stock.
    const winner = results.find((r) => r.status === 201)!;
    await prisma.order.update({ where: { id: winner.body.data.orderId }, data: { reservationExpiresAt: new Date(0) } });
    await expireStaleReservations();
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { quantity: original.quantity, reserved: original.reserved } });
  });

  it('releases reservations from abandoned checkouts', async () => {
    const { variant } = await inStockVariant(3);
    const before = await inventory(variant.id);
    const placed = await placeOrder({ variantId: variant.id, pay: false });
    expect((await inventory(variant.id)).reserved).toBe(before.reserved + 1);

    await prisma.order.update({ where: { id: placed.orderId }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    expect(await expireStaleReservations()).toBeGreaterThanOrEqual(1);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: placed.orderId }, include: { events: true, payments: true } });
    expect(order.status).toBe('CANCELLED');
    expect(order.payments[0].status).toBe('CANCELLED');
    expect((await inventory(variant.id)).reserved).toBe(before.reserved);

    // Paying after expiry is refused.
    const late = await request(app).post(api(`/checkout/${placed.orderNumber}/confirm-mock`)).send({ clientSecret: placed.payment.clientSecret });
    expect(late.status).toBe(400);
  });
});

describe('abandoning a checkout attempt', () => {
  it('releases the reservation immediately with the right key only', async () => {
    const { variant } = await inStockVariant(3);
    const before = await inventory(variant.id);
    const placed = await placeOrder({ variantId: variant.id, pay: false });
    expect((await inventory(variant.id)).reserved).toBe(before.reserved + 1);

    const wrong = await request(app).post(api(`/checkout/${placed.orderNumber}/abandon`)).send({ clientSecret: 'x'.repeat(40) });
    expect(wrong.status).toBe(404);

    const ok = await request(app).post(api(`/checkout/${placed.orderNumber}/abandon`)).send({ clientSecret: placed.payment.clientSecret });
    expect(ok.body.data.status).toBe('CANCELLED');
    expect((await inventory(variant.id)).reserved).toBe(before.reserved);
  });

  it('never cancels an order that has already been paid', async () => {
    const { variant } = await inStockVariant(3);
    const placed = await placeOrder({ variantId: variant.id });
    const res = await request(app).post(api(`/checkout/${placed.orderNumber}/abandon`)).send({ clientSecret: placed.payment.clientSecret });
    expect(res.body.data.status).toBe('PAID');
  });
});

describe('payment configuration', () => {
  it('reports the active provider and hides the Stripe webhook when Stripe is off', async () => {
    expect((await request(app).get(api('/checkout/config'))).body.data.paymentProvider).toBe('mock');
    const hook = await request(app).post(api('/webhooks/stripe')).set('Content-Type', 'application/json').send('{}');
    expect(hook.status).toBe(404);
  });
});
