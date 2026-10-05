import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../db/prisma';
import { app } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('foundation', () => {
  it('GET /health responds ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/health checks the database', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ok', database: 'ok' });
  });

  it('sets secure headers and hides the framework', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects malformed JSON with a 400', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON body');
  });
});

describe('seed data integrity', () => {
  it('has active products, each with images and in-stock variants', async () => {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: { images: true, variants: { include: { inventory: true } } },
    });
    expect(products.length).toBeGreaterThanOrEqual(30);
    for (const p of products) {
      expect(p.images.length, `${p.name} images`).toBeGreaterThan(0);
      expect(p.variants.length, `${p.name} variants`).toBeGreaterThan(0);
      expect(p.variants.every((v) => v.inventory !== null), `${p.name} inventory`).toBe(true);
    }
  });

  it('has an admin user and order totals that add up', async () => {
    expect(await prisma.user.count({ where: { role: 'ADMIN' } })).toBe(1);
    const orders = await prisma.order.findMany({ include: { items: true }, take: 50 });
    for (const o of orders) {
      const itemsTotal = o.items.reduce((s, i) => s + i.lineTotal, 0);
      expect(itemsTotal).toBe(o.subtotal);
      expect(o.total).toBe(o.subtotal - o.discountTotal + o.shippingTotal + o.taxTotal);
    }
  });

  it('keeps denormalised product ratings in sync with approved reviews', async () => {
    const p = await prisma.product.findFirstOrThrow({ where: { ratingCount: { gt: 0 } } });
    const count = await prisma.review.count({ where: { productId: p.id, status: 'APPROVED' } });
    expect(p.ratingCount).toBe(count);
  });
});
