import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { ADMIN, DEMO, api, app, signIn } from './helpers';

let admin: Record<string, string>;
let customer: Record<string, string>;
let slug: string;
let variantId: string;
let orderId: string;

beforeAll(async () => {
  admin = (await signIn(ADMIN)).auth;
  customer = (await signIn(DEMO)).auth;
  const product = await prisma.product.findFirstOrThrow({ where: { status: 'ACTIVE' }, include: { variants: { take: 1 } } });
  slug = product.slug;
  variantId = product.variants[0].id;
  orderId = (await prisma.order.findFirstOrThrow({ where: { status: 'DELIVERED' } })).id;
});

afterEach(() => {
  env.PLAN = 'premium';
});

afterAll(async () => {
  await prisma.$disconnect();
});

const get = (path: string, auth?: Record<string, string>) => request(app).get(api(path)).set(auth ?? {});

/** Endpoints that belong to each paid tier (method, path, auth). */
const advancedOnly: [string, () => request.Test][] = [
  ['wishlist', () => get('/wishlist', customer)],
  ['reviews', () => get(`/products/${slug}/reviews`)],
  ['collections', () => get('/collections')],
  ['search suggestions', () => get('/search/suggest?q=coat')],
  ['related products', () => get(`/products/${slug}/related`)],
  ['order tracking', () => get('/orders/track?orderNumber=MS-NOPE&email=a@b.co')],
  ['newsletter signup', () => request(app).post(api('/newsletter/subscribe')).send({ email: 'plan.test@example.test' })],
  ['admin reviews', () => get('/admin/reviews', admin)],
  ['admin collections', () => get('/admin/collections', admin)],
  ['admin newsletter', () => get('/admin/newsletter', admin)],
  ['refunds', () => request(app).post(api(`/admin/orders/${orderId}/refund`)).set(admin).send({ restock: false })],
];
const premiumOnly: [string, () => request.Test][] = [
  ['sales reports', () => get('/admin/reports/sales', admin)],
  ['inventory history', () => get(`/admin/inventory/${variantId}/movements`, admin)],
];

describe('site configuration', () => {
  it('publishes the plan and its feature flags', async () => {
    env.PLAN = 'basic';
    const s = (await get('/site')).body.data.settings;
    expect(s.plan).toBe('basic');
    expect(s.features).toMatchObject({ coupons: true, wishlist: false, motion: false });
    env.PLAN = 'premium';
    expect((await get('/site')).body.data.settings.features.motion).toBe(true);
  });
});

describe('basic plan', () => {
  it.each([...advancedOnly, ...premiumOnly])('closes %s', async (_name, call) => {
    env.PLAN = 'basic';
    const res = await call();
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FEATURE_UNAVAILABLE');
  });

  it('keeps discount codes and the core shop', async () => {
    env.PLAN = 'basic';
    expect((await get('/products')).status).toBe(200);
    expect((await get(`/products/${slug}`)).status).toBe(200);
    expect((await get('/admin/coupons', admin)).status).toBe(200);
    const coupon = await request(app).post(api('/checkout/coupon/validate')).send({ code: 'WELCOME10', subtotal: 50000 });
    expect(coupon.status).toBe(200);
  });

  it('serves only hero banners and refuses editorial placements', async () => {
    env.PLAN = 'basic';
    const banners = (await get('/banners')).body.data as { placement: string }[];
    expect(banners.length).toBeGreaterThan(0);
    expect(new Set(banners.map((b) => b.placement))).toEqual(new Set(['HERO']));
    expect((await get('/banners?placement=STORY')).body.data).toEqual([]);

    const res = await request(app)
      .post(api('/admin/banners'))
      .set(admin)
      .send({ title: 'Campaign', image: 'https://images.unsplash.com/photo-1?w=1200', placement: 'PROMO', isActive: false });
    expect(res.status).toBe(422);
    expect(res.body.error.details.fields.placement).toMatch(/Premium/);
  });
});

describe('advanced plan', () => {
  it.each(advancedOnly)('opens %s', async (_name, call) => {
    env.PLAN = 'advanced';
    // May still fail for its own reasons (e.g. unknown order number), but not because of the plan.
    expect((await call()).body.error?.code).not.toBe('FEATURE_UNAVAILABLE');
  });

  it.each(premiumOnly)('still closes %s', async (_name, call) => {
    env.PLAN = 'advanced';
    expect((await call()).status).toBe(404);
  });
});

describe('premium plan', () => {
  it.each(premiumOnly)('opens %s', async (_name, call) => {
    env.PLAN = 'premium';
    expect((await call()).status).toBe(200);
  });

  it('serves editorial banners', async () => {
    const placements = new Set(((await get('/banners')).body.data as { placement: string }[]).map((b) => b.placement));
    expect(placements.has('STORY')).toBe(true);
  });
});
