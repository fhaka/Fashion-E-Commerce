import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../db/prisma';
import { unsubscribeToken } from '../services/engagement.service';
import { api, app, registerUser, signIn, uniqueEmail } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

const address = {
  label: 'Home',
  fullName: 'Test Person',
  line1: '1 Test Street',
  city: 'Boston',
  state: 'MA',
  postalCode: '02116',
  country: 'us',
};

describe('authorization', () => {
  it('requires a token for account routes', async () => {
    for (const path of ['/account/profile', '/account/addresses', '/account/orders', '/wishlist']) {
      expect((await request(app).get(api(path))).status, path).toBe(401);
    }
  });
});

describe('profile', () => {
  it('updates name and phone', async () => {
    const { auth } = await registerUser();
    const res = await request(app).patch(api('/account/profile')).set(auth).send({ firstName: 'Renamed', lastName: 'Person', phone: '+1 555 0100' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ firstName: 'Renamed', phone: '+1 555 0100' });
  });

  it('ignores attempts to escalate role via profile update', async () => {
    const { auth, user } = await registerUser();
    await request(app).patch(api('/account/profile')).set(auth).send({ firstName: 'X', lastName: 'Y', role: 'ADMIN' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('CUSTOMER');
  });
});

describe('addresses', () => {
  it('manages defaults correctly across create, update and delete', async () => {
    const { auth } = await registerUser();
    const a1 = await request(app).post(api('/account/addresses')).set(auth).send(address);
    expect(a1.status).toBe(201);
    expect(a1.body.data.isDefault).toBe(true); // first address becomes default
    expect(a1.body.data.country).toBe('US');

    const a2 = await request(app).post(api('/account/addresses')).set(auth).send({ ...address, label: 'Work', isDefault: true });
    const list = await request(app).get(api('/account/addresses')).set(auth);
    expect(list.body.data.filter((a: { isDefault: boolean }) => a.isDefault)).toHaveLength(1);
    expect(list.body.data[0].id).toBe(a2.body.data.id);

    await request(app).delete(api(`/account/addresses/${a2.body.data.id}`)).set(auth).expect(204);
    const after = await request(app).get(api('/account/addresses')).set(auth);
    expect(after.body.data).toHaveLength(1);
    expect(after.body.data[0].isDefault).toBe(true);
  });

  it('validates addresses', async () => {
    const { auth } = await registerUser();
    const res = await request(app).post(api('/account/addresses')).set(auth).send({ ...address, country: 'USA', line1: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.details.fields).toHaveProperty('country');
  });

  it('cannot touch another user\'s address', async () => {
    const owner = await registerUser();
    const created = await request(app).post(api('/account/addresses')).set(owner.auth).send(address);
    const other = await registerUser();
    expect((await request(app).put(api(`/account/addresses/${created.body.data.id}`)).set(other.auth).send(address)).status).toBe(404);
    expect((await request(app).delete(api(`/account/addresses/${created.body.data.id}`)).set(other.auth)).status).toBe(404);
  });
});

describe('orders', () => {
  it('lists the customer\'s orders and shows details with a timeline', async () => {
    const { auth } = await signIn();
    const list = await request(app).get(api('/account/orders?limit=5')).set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(6);

    const { orderNumber } = list.body.data[0];
    const detail = await request(app).get(api(`/account/orders/${orderNumber}`)).set(auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.items.length).toBeGreaterThan(0);
    expect(detail.body.data.timeline[0].status).toBe('PENDING');
  });

  it('hides other customers\' orders', async () => {
    const someone = await prisma.order.findFirstOrThrow({ where: { user: { email: { not: 'ava@maison.test' } } } });
    const { auth } = await signIn();
    expect((await request(app).get(api(`/account/orders/${someone.orderNumber}`)).set(auth)).status).toBe(404);
  });

  it('lets guests track an order with order number + email only', async () => {
    const order = await prisma.order.findFirstOrThrow({ where: { status: 'SHIPPED' } });
    const ok = await request(app).get(api(`/orders/track?orderNumber=${order.orderNumber.toLowerCase()}&email=${order.email.toUpperCase()}`));
    expect(ok.status).toBe(200);
    expect(ok.body.data.trackingNumber).toBeTruthy();
    expect(Object.keys(ok.body.data.shippingAddress)).toEqual(['city', 'country']);

    const wrong = await request(app).get(api(`/orders/track?orderNumber=${order.orderNumber}&email=attacker@example.test`));
    expect(wrong.status).toBe(404);
  });
});

describe('wishlist', () => {
  it('adds, lists and removes products idempotently', async () => {
    const { auth } = await registerUser();
    const [p1, p2] = await prisma.product.findMany({ take: 2, orderBy: { name: 'asc' } });

    await request(app).post(api(`/wishlist/${p1.id}`)).set(auth).expect(201);
    await request(app).post(api(`/wishlist/${p1.id}`)).set(auth).expect(201);
    const added = await request(app).post(api(`/wishlist/${p2.id}`)).set(auth);
    expect(added.body.data.sort()).toEqual([p1.id, p2.id].sort());

    const list = await request(app).get(api('/wishlist')).set(auth);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0]).toHaveProperty('image');

    const removed = await request(app).delete(api(`/wishlist/${p1.id}`)).set(auth);
    expect(removed.body.data).toEqual([p2.id]);
    expect((await request(app).post(api('/wishlist/does-not-exist')).set(auth)).status).toBe(404);
  });
});

describe('reviews', () => {
  it('lists approved reviews with anonymised authors', async () => {
    const res = await request(app).get(api('/products/camel-wrap-coat/reviews?sort=highest'));
    expect(res.status).toBe(200);
    for (const r of res.body.data) expect(r.author).toMatch(/^\S+ \S\.$/);
    const ratings = res.body.data.map((r: { rating: number }) => r.rating);
    expect([...ratings].sort((a, b) => b - a)).toEqual(ratings);
  });

  it('accepts one moderated review per customer, sanitising HTML', async () => {
    const { auth } = await registerUser();
    const body = { rating: 5, title: '<b>Lovely</b> coat', body: 'Beautiful quality <script>alert(1)</script> and fit.', fit: 'TRUE_TO_SIZE' };
    const res = await request(app).post(api('/products/camel-wrap-coat/reviews')).set(auth).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');

    const stored = await prisma.review.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(stored.title).toBe('Lovely coat');
    expect(stored.body).not.toContain('<script>');
    expect(stored.isVerifiedPurchase).toBe(false);

    const list = await request(app).get(api('/products/camel-wrap-coat/reviews?limit=50'));
    expect(list.body.data.some((r: { id: string }) => r.id === stored.id)).toBe(false);

    expect((await request(app).post(api('/products/camel-wrap-coat/reviews')).set(auth).send(body)).status).toBe(409);
    const elig = await request(app).get(api('/products/camel-wrap-coat/reviews/eligibility')).set(auth);
    expect(elig.body.data).toEqual({ canReview: false, existingStatus: 'PENDING' });
  });

  it('requires sign-in and valid input to review', async () => {
    expect((await request(app).post(api('/products/camel-wrap-coat/reviews')).send({ rating: 5, title: 'Hi', body: 'Long enough body' })).status).toBe(401);
    const { auth } = await registerUser();
    expect((await request(app).post(api('/products/camel-wrap-coat/reviews')).set(auth).send({ rating: 9, title: 'x', body: 'short' })).status).toBe(422);
  });
});

describe('newsletter and contact', () => {
  it('subscribes idempotently and unsubscribes only with a valid token', async () => {
    const email = uniqueEmail('news');
    expect((await request(app).post(api('/newsletter/subscribe')).send({ email })).status).toBe(201);
    expect((await request(app).post(api('/newsletter/subscribe')).send({ email })).status).toBe(200);

    const bad = await request(app).post(api('/newsletter/unsubscribe')).send({ email, token: 'x'.repeat(32) });
    expect(bad.status).toBe(400);
    const good = await request(app).post(api('/newsletter/unsubscribe')).send({ email, token: unsubscribeToken(email) });
    expect(good.status).toBe(200);
    expect((await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email } })).status).toBe('UNSUBSCRIBED');
  });

  it('stores contact messages', async () => {
    const email = uniqueEmail('contact');
    const res = await request(app).post(api('/contact')).send({ name: 'Jo', email, subject: 'Sizing', message: 'Does the wrap coat run large?' });
    expect(res.status).toBe(201);
    expect(await prisma.contactMessage.count({ where: { email } })).toBe(1);
  });
});
