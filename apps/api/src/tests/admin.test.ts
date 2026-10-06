import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../db/prisma';
import { ADMIN, api, app, inStockVariant, placeOrder, registerUser, signIn } from './helpers';

let admin: Record<string, string>;
let adminId: string;

beforeAll(async () => {
  const s = await signIn(ADMIN);
  admin = s.auth;
  adminId = s.user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const A = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string) => request(app)[method](api(`/admin${path}`)).set(admin);

async function refs() {
  const [category, sizes, colors, collection] = await Promise.all([
    prisma.category.findUniqueOrThrow({ where: { slug: 'women-knitwear' } }),
    prisma.size.findMany({ where: { group: 'APPAREL' }, orderBy: { sortOrder: 'asc' } }),
    prisma.color.findMany({ where: { slug: { in: ['black', 'ivory'] } }, orderBy: { name: 'asc' } }),
    prisma.collection.findUniqueOrThrow({ where: { slug: 'the-essentials' } }),
  ]);
  return { category, sizes, colors, collection };
}

async function productPayload(overrides: Record<string, unknown> = {}) {
  const { category, sizes, colors, collection } = await refs();
  const sku = `TST-${Date.now().toString(36).toUpperCase()}`;
  return {
    name: 'Ribbed Merino Polo',
    description: 'A fine ribbed merino polo with a three-button placket and a clean, close fit.',
    details: ['Slim fit', 'Three-button placket'],
    materials: '100% merino wool',
    care: 'Hand wash cold',
    basePrice: 19500,
    compareAtPrice: null,
    gender: 'WOMEN',
    status: 'ACTIVE',
    categoryId: category.id,
    collectionIds: [collection.id],
    isFeatured: false,
    isBestSeller: false,
    isNew: true,
    images: [
      { url: 'https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?w=1200', alt: 'Front', colorId: colors[0].id, sortOrder: 0 },
      { url: 'https://images.unsplash.com/photo-1587999882859-34b3f313df77?w=1200', alt: 'Ivory', colorId: colors[1].id, sortOrder: 1 },
    ],
    variants: [
      { sizeId: sizes[1].id, colorId: colors[0].id, sku: `${sku}-BLK-S`, stock: 10, lowStockThreshold: 3, isActive: true },
      { sizeId: sizes[2].id, colorId: colors[0].id, sku: `${sku}-BLK-M`, stock: 4, lowStockThreshold: 3, isActive: true },
      { sizeId: sizes[2].id, colorId: colors[1].id, sku: `${sku}-IVO-M`, stock: 0, lowStockThreshold: 3, isActive: true },
    ],
    ...overrides,
  };
}

describe('admin access control', () => {
  it('rejects anonymous users and customers', async () => {
    expect((await request(app).get(api('/admin/stats/overview'))).status).toBe(401);
    const { auth } = await signIn();
    expect((await request(app).get(api('/admin/stats/overview')).set(auth)).status).toBe(403);
    expect((await request(app).post(api('/admin/products')).set(auth).send({})).status).toBe(403);
  });

  it('revokes admin access immediately when an admin is demoted', async () => {
    const { user, auth } = await registerUser();
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    // Token still says CUSTOMER, but the guard checks the database.
    expect((await request(app).get(api('/admin/orders')).set(auth)).status).toBe(200);
    await prisma.user.update({ where: { id: user.id }, data: { role: 'CUSTOMER' } });
    expect((await request(app).get(api('/admin/orders')).set(auth)).status).toBe(403);
  });
});

describe('dashboard and reports', () => {
  it('returns KPIs, a daily revenue series and operational lists', async () => {
    const res = await A('get', '/stats/overview?range=30');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.kpis.revenue.value).toBeGreaterThan(0);
    expect(typeof d.kpis.revenue.change).toBe('number');
    expect(d.revenueSeries).toHaveLength(30);
    expect(d.revenueSeries.reduce((s: number, p: { revenue: number }) => s + p.revenue, 0)).toBe(d.kpis.revenue.value);
    expect(d.topProducts.length).toBeGreaterThan(0);
    expect(d.recentOrders).toHaveLength(8);
    expect(Array.isArray(d.lowStock)).toBe(true);
    expect((await A('get', '/stats/overview?range=12')).status).toBe(422);
  });

  it('builds a sales report and exports CSV', async () => {
    const res = await A('get', '/reports/sales?groupBy=month&from=2025-01-01&to=2027-01-01');
    expect(res.status).toBe(200);
    const r = res.body.data;
    expect(r.rows.length).toBeGreaterThan(1);
    expect(r.totals.revenue).toBe(r.rows.reduce((s: number, x: { revenue: number }) => s + x.revenue, 0));
    expect(r.byCategory.length).toBeGreaterThan(3);

    const csv = await A('get', '/reports/sales?groupBy=week&format=csv');
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.replace('﻿', '').split('\n')[0]).toBe('period,orders,grossSales,discounts,shipping,tax,revenue');
  });
});

describe('product management', () => {
  it('creates a product with variants, stock and images that appears in the store', async () => {
    const res = await A('post', '/products').send(await productPayload());
    expect(res.status).toBe(201);
    const p = res.body.data;
    expect(p.slug).toBe('ribbed-merino-polo');
    expect(p.variants).toHaveLength(3);
    expect(p.collectionIds).toHaveLength(1);
    expect(await prisma.inventoryMovement.count({ where: { variantId: { in: p.variants.map((v: { id: string }) => v.id) }, reason: 'INITIAL' } })).toBe(3);

    const store = await request(app).get(api('/products/ribbed-merino-polo'));
    expect(store.status).toBe(200);
    expect(store.body.data.colors).toHaveLength(2);

    // Same name gets a unique slug.
    const second = await A('post', '/products').send(await productPayload({ status: 'DRAFT' }));
    expect(second.body.data.slug).toBe('ribbed-merino-polo-2');
    expect((await request(app).get(api('/products/ribbed-merino-polo-2'))).status).toBe(404); // drafts hidden
  });

  it('rejects duplicate variants, duplicate SKUs and unknown references', async () => {
    const payload = await productPayload();
    const dupCombo = await A('post', '/products').send({ ...payload, variants: [payload.variants[0], { ...payload.variants[0], sku: 'OTHER-SKU' }] });
    expect(dupCombo.status).toBe(422);
    const dupSku = await A('post', '/products').send({ ...payload, variants: [payload.variants[0], { ...payload.variants[1], sku: payload.variants[0].sku }] });
    expect(dupSku.status).toBe(422);
    expect((await A('post', '/products').send({ ...payload, categoryId: 'missing' })).status).toBe(422);
  });

  it('updates fields, syncs variants and logs stock adjustments', async () => {
    const created = (await A('post', '/products').send(await productPayload())).body.data;
    const payload = await productPayload();
    const [keep, , drop] = created.variants;
    const res = await A('put', `/products/${created.id}`).send({
      ...payload,
      name: 'Ribbed Merino Polo Shirt',
      basePrice: 21000,
      compareAtPrice: 26000,
      images: [{ ...payload.images[0], id: created.images[0].id }],
      variants: [
        { id: keep.id, sizeId: keep.sizeId, colorId: keep.colorId, sku: keep.sku, stock: 25, lowStockThreshold: 3, isActive: true },
        { ...payload.variants[1], sku: `${keep.sku}-NEW` },
      ],
    });
    expect(res.status).toBe(200);
    const u = res.body.data;
    expect(u.basePrice).toBe(21000);
    expect(u.images).toHaveLength(1);
    expect(u.variants).toHaveLength(2);
    expect(u.variants.find((v: { id: string }) => v.id === keep.id).stock).toBe(25);
    expect(await prisma.productVariant.findUnique({ where: { id: drop.id } })).toBeNull();
    const adj = await prisma.inventoryMovement.findFirstOrThrow({ where: { variantId: keep.id, reason: 'ADJUSTMENT' } });
    expect(adj.delta).toBe(15);
    expect(adj.actorId).toBe(adminId);
  });

  it('retires a removed variant with order history exactly once and hides it from the editor', async () => {
    const created = (await A('post', '/products').send(await productPayload())).body.data;
    const sold = created.variants[0];
    await placeOrder({ variantId: sold.id });

    const payload = await productPayload();
    const keep = created.variants.slice(1).map((v: { id: string; sizeId: string; colorId: string; sku: string }) => ({
      id: v.id, sizeId: v.sizeId, colorId: v.colorId, sku: v.sku, stock: 5, lowStockThreshold: 3, isActive: true,
    }));
    const body = { ...payload, images: [], status: 'DRAFT', variants: keep };

    const first = await A('put', `/products/${created.id}`).send(body);
    expect(first.status).toBe(200);
    expect(first.body.data.variants.map((v: { id: string }) => v.id)).not.toContain(sold.id);
    const retiredSku = (await prisma.productVariant.findUniqueOrThrow({ where: { id: sold.id } })).sku;
    expect(retiredSku).toMatch(/-RETIRED-/);

    await A('put', `/products/${created.id}`).send(body).expect(200);
    const after = await prisma.productVariant.findUniqueOrThrow({ where: { id: sold.id } });
    expect(after.sku).toBe(retiredSku); // not renamed again
    expect(after.isActive).toBe(false);
  });

  it('archives products with sales history instead of deleting them', async () => {
    const fresh = (await A('post', '/products').send(await productPayload())).body.data;
    expect((await A('delete', `/products/${fresh.id}`)).body.data).toEqual({ archived: false });
    expect(await prisma.product.findUnique({ where: { id: fresh.id } })).toBeNull();

    const sold = await prisma.orderItem.findFirstOrThrow({ where: { productId: { not: null } } });
    const before = await prisma.product.findUniqueOrThrow({ where: { id: sold.productId! }, select: { status: true } });
    expect((await A('delete', `/products/${sold.productId}`)).body.data).toEqual({ archived: true });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: sold.productId! } })).status).toBe('ARCHIVED');
    // Put it back exactly as it was (it may be a draft created by another test).
    await prisma.product.update({ where: { id: sold.productId! }, data: { status: before.status } });
  });

  it('duplicates a product as a draft with zero stock', async () => {
    const original = await prisma.product.findUniqueOrThrow({ where: { slug: 'camel-wrap-coat' } });
    const res = await A('post', `/products/${original.id}/duplicate`);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Camel Wrap Coat (Copy)', status: 'DRAFT', isFeatured: false });
    expect(res.body.data.variants.every((v: { stock: number }) => v.stock === 0)).toBe(true);
  });

  it('lists, filters and bulk-updates products (featured products)', async () => {
    const list = await A('get', '/products?featured=true&limit=50');
    expect(list.body.data.every((p: { isFeatured: boolean }) => p.isFeatured)).toBe(true);
    const target = await prisma.product.findFirstOrThrow({ where: { isFeatured: false, status: 'ACTIVE' } });
    const bulk = await A('patch', '/products/bulk').send({ ids: [target.id], isFeatured: true });
    expect(bulk.body.data.updated).toBe(1);
    const after = await A('get', '/products?featured=true&limit=50');
    expect(after.body.data.some((p: { id: string }) => p.id === target.id)).toBe(true);
    const bySku = await A('get', '/products?q=MS-CWC-CAM');
    expect(bySku.body.data.map((p: { name: string }) => p.name)).toContain('Camel Wrap Coat');
  });
});

describe('inventory', () => {
  it('adjusts stock with an audit trail and protects reserved units', async () => {
    const { variant } = await inStockVariant(5);
    const before = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });

    const restock = await A('patch', `/inventory/${variant.id}`).send({ delta: 5, note: 'Delivery from mill' });
    expect(restock.body.data.quantity).toBe(before.quantity + 5);
    const moves = await A('get', `/inventory/${variant.id}/movements`);
    expect(moves.body.data[0]).toMatchObject({ delta: 5, reason: 'RESTOCK', note: 'Delivery from mill' });

    const placed = await placeOrder({ variantId: variant.id, quantity: 2, pay: false });
    const tooLow = await A('patch', `/inventory/${variant.id}`).send({ quantity: 1 });
    expect(tooLow.status).toBe(422);
    expect((await A('patch', `/inventory/${variant.id}`).send({ delta: -10_000 })).status).toBe(422);

    await A('patch', `/orders/${placed.orderId}/status`).send({ status: 'CANCELLED' }).expect(200);
    await A('patch', `/inventory/${variant.id}`).send({ quantity: before.quantity }).expect(200);
  });

  it('lists inventory with low/out filters', async () => {
    const out = await A('get', '/inventory?filter=out&limit=100');
    expect(out.body.data.length).toBeGreaterThan(0);
    expect(out.body.data.every((r: { available: number }) => r.available === 0)).toBe(true);
    const low = await A('get', '/inventory/low-stock');
    expect(low.body.data.every((r: { available: number; lowStockThreshold: number }) => r.available <= r.lowStockThreshold)).toBe(true);
  });
});

describe('order management', () => {
  it('moves an order through fulfilment with tracking and a timeline', async () => {
    const { variant } = await inStockVariant(5);
    const placed = await placeOrder({ variantId: variant.id });

    const detail = await A('get', `/orders/${placed.orderId}`);
    expect(detail.body.data.allowedTransitions).toEqual(['PROCESSING', 'SHIPPED', 'CANCELLED']);

    await A('patch', `/orders/${placed.orderId}/status`).send({ status: 'PROCESSING' }).expect(200);
    const noTracking = await A('patch', `/orders/${placed.orderId}/status`).send({ status: 'SHIPPED' });
    expect(noTracking.status).toBe(422);
    const shipped = await A('patch', `/orders/${placed.orderId}/status`).send({ status: 'SHIPPED', carrier: 'DHL Express', trackingNumber: 'JD0146000033' });
    expect(shipped.body.data).toMatchObject({ status: 'SHIPPED', carrier: 'DHL Express', trackingNumber: 'JD0146000033' });

    const invalid = await A('patch', `/orders/${placed.orderId}/status`).send({ status: 'PROCESSING' });
    expect(invalid.status).toBe(400);

    const delivered = await A('patch', `/orders/${placed.orderId}/status`).send({ status: 'DELIVERED' });
    expect(delivered.body.data.timeline.map((e: { status: string }) => e.status)).toEqual(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']);

    // Refund after delivery, with restock.
    const stockBefore = (await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } })).quantity;
    const refunded = await A('post', `/orders/${placed.orderId}/refund`).send({ restock: true });
    expect(refunded.body.data.status).toBe('REFUNDED');
    expect(refunded.body.data.payment.status).toBe('REFUNDED');
    expect((await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } })).quantity).toBe(stockBefore + 1);
  });

  it('cancelling a paid order refunds and restocks it', async () => {
    const { variant } = await inStockVariant(5);
    const before = (await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } })).quantity;
    const placed = await placeOrder({ variantId: variant.id, quantity: 2 });
    expect((await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } })).quantity).toBe(before - 2);

    const res = await A('patch', `/orders/${placed.orderId}/status`).send({ status: 'CANCELLED', note: 'Customer changed mind' });
    expect(res.body.data.status).toBe('CANCELLED');
    expect((await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } })).quantity).toBe(before);
  });

  it('searches and filters orders', async () => {
    const order = await prisma.order.findFirstOrThrow({ where: { status: 'DELIVERED' } });
    const res = await A('get', `/orders?q=${order.orderNumber}`);
    expect(res.body.data[0].orderNumber).toBe(order.orderNumber);
    const shipped = await A('get', '/orders?status=SHIPPED&limit=100');
    expect(shipped.body.data.every((o: { status: string }) => o.status === 'SHIPPED')).toBe(true);
  });
});

describe('customers', () => {
  it('lists customers with spend and can deactivate them', async () => {
    const list = await A('get', '/customers?q=ava');
    expect(list.body.data[0]).toMatchObject({ email: 'ava@maison.test' });
    expect(list.body.data[0].totalSpent).toBeGreaterThan(0);

    const { user, email, password } = await registerUser();
    const detail = await A('get', `/customers/${user.id}`);
    expect(detail.body.data.stats.orderCount).toBe(0);

    await A('patch', `/customers/${user.id}`).send({ isActive: false }).expect(200);
    expect((await request(app).post(api('/auth/login')).send({ email, password })).status).toBe(403);
  });

  it('prevents admins from locking themselves out', async () => {
    expect((await A('patch', `/customers/${adminId}`).send({ isActive: false })).status).toBe(400);
    expect((await A('patch', `/customers/${adminId}`).send({ role: 'CUSTOMER' })).status).toBe(400);
  });
});

describe('review moderation', () => {
  it('approving a review publishes it and updates the product rating', async () => {
    const { auth } = await registerUser();
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: 'leather-weekender' } });
    const created = await request(app).post(api('/products/leather-weekender/reviews')).set(auth).send({ rating: 1, title: 'Not for me', body: 'Too heavy for travelling, unfortunately.' });

    const pending = await A('get', '/reviews?status=PENDING&limit=100');
    expect(pending.body.data.some((r: { id: string }) => r.id === created.body.data.id)).toBe(true);

    await A('patch', `/reviews/${created.body.data.id}`).send({ status: 'APPROVED' }).expect(200);
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.ratingCount).toBe(product.ratingCount + 1);
    const pub = await request(app).get(api('/products/leather-weekender/reviews?limit=50'));
    expect(pub.body.data.some((r: { id: string }) => r.id === created.body.data.id)).toBe(true);

    await A('delete', `/reviews/${created.body.data.id}`).expect(204);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).ratingCount).toBe(product.ratingCount);
  });
});

describe('merchandising', () => {
  it('manages coupons with validation and safe deletion', async () => {
    expect((await A('post', '/coupons').send({ code: 'BAD', type: 'PERCENT', value: 150 })).status).toBe(422);
    const c = await A('post', '/coupons').send({ code: 'press-15', type: 'PERCENT', value: 15, description: 'Press friends' });
    expect(c.status).toBe(201);
    expect(c.body.data.code).toBe('PRESS-15');
    expect((await A('post', '/coupons').send({ code: 'PRESS-15', type: 'PERCENT', value: 15 })).status).toBe(409);

    const list = await A('get', '/coupons');
    expect(list.body.data.find((x: { code: string }) => x.code === 'SUMMER25').state).toBe('expired');

    expect((await A('delete', `/coupons/${c.body.data.id}`)).body.data).toEqual({ deactivated: false });
    const used = await prisma.coupon.findUniqueOrThrow({ where: { code: 'VIP20' } });
    expect((await A('delete', `/coupons/${used.id}`)).body.data).toEqual({ deactivated: true });
    await prisma.coupon.update({ where: { id: used.id }, data: { isActive: true } });
  });

  it('manages categories and prevents cycles and orphaning products', async () => {
    const women = await prisma.category.findUniqueOrThrow({ where: { slug: 'women' } });
    const created = await A('post', '/categories').send({ name: 'Swimwear', parentId: women.id });
    expect(created.body.data.slug).toBe('swimwear');
    expect((await request(app).get(api('/categories'))).body.data[0].children.some((c: { slug: string }) => c.slug === 'swimwear')).toBe(true);

    const cycle = await A('put', `/categories/${women.id}`).send({ name: 'Women', slug: 'women', parentId: created.body.data.id });
    expect(cycle.status).toBe(422);
    expect((await A('delete', `/categories/${women.id}`)).status).toBe(409);
    await A('delete', `/categories/${created.body.data.id}`).expect(204);
  });

  it('manages collections and their products', async () => {
    const col = await A('post', '/collections').send({ name: 'Gift Guide' });
    const ids = (await prisma.product.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, take: 3, select: { id: true } })).map((p) => p.id);
    const set = await A('put', `/collections/${col.body.data.id}/products`).send({ productIds: ids });
    expect(set.body.data.products.map((p: { id: string }) => p.id)).toEqual(ids);
    expect((await request(app).get(api('/products?collection=gift-guide'))).body.meta.total).toBe(3);
  });

  it('protects sizes and colours that are in use', async () => {
    const used = await prisma.color.findUniqueOrThrow({ where: { slug: 'black' } });
    expect((await A('delete', `/colors/${used.id}`)).status).toBe(409);
    const fresh = await A('post', '/colors').send({ name: 'Sage', hex: '#9caf88' });
    expect(fresh.body.data).toMatchObject({ slug: 'sage', hex: '#9CAF88' });
    await A('delete', `/colors/${fresh.body.data.id}`).expect(204);
  });

  it('creates and reorders homepage banners', async () => {
    const b = await A('post', '/banners').send({ title: 'Winter Sale', placement: 'HERO', image: 'https://images.unsplash.com/photo-1514813836041-518668f092b1?w=2400', ctaLabel: 'Shop', ctaHref: '/shop' });
    expect(b.status).toBe(201);
    const heroes = (await A('get', '/banners?placement=HERO')).body.data.map((x: { id: string }) => x.id);
    const reordered = [b.body.data.id, ...heroes.filter((id: string) => id !== b.body.data.id)];
    await A('put', '/banners/reorder').send({ ids: reordered }).expect(204);
    const pub = await request(app).get(api('/banners?placement=HERO'));
    expect(pub.body.data[0].title).toBe('Winter Sale');
    await A('delete', `/banners/${b.body.data.id}`).expect(204);
  });
});

describe('uploads', () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  it('stores a real image and returns a public URL', async () => {
    const res = await A('post', '/uploads').attach('files', png, { filename: 'swatch.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const [file] = res.body.data;
    expect(file.url).toMatch(/\/uploads\/products\/.+\.png$/);
    const onDisk = path.resolve(__dirname, '..', '..', 'uploads', file.publicId);
    expect(fs.existsSync(onDisk)).toBe(true);
    await A('delete', '/uploads').send({ publicId: file.publicId }).expect(204);
    expect(fs.existsSync(onDisk)).toBe(false);
  });

  it('rejects files that only pretend to be images, and disallowed types', async () => {
    const fake = await A('post', '/uploads').attach('files', Buffer.from('<script>alert(1)</script>'.padEnd(64)), { filename: 'evil.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
    const svg = await A('post', '/uploads').attach('files', Buffer.from('<svg/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(svg.status).toBe(400);
  });

  it('ignores path traversal when deleting', async () => {
    await A('delete', '/uploads').send({ publicId: '../../package.json' }).expect(204);
    expect(fs.existsSync(path.resolve(__dirname, '..', '..', 'package.json'))).toBe(true);
  });

  it('stores product videos (MP4 and WebM)', async () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypisom'), Buffer.alloc(64)]);
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64)]);
    for (const [buf, name, type, ext] of [[mp4, 'clip.mp4', 'video/mp4', 'mp4'], [webm, 'clip.webm', 'video/webm', 'webm']] as const) {
      const res = await A('post', '/uploads/video').attach('file', buf, { filename: name, contentType: type });
      expect(res.status).toBe(201);
      expect(res.body.data.url).toMatch(new RegExp(`/uploads/videos/.+\.${ext}$`));
      await A('delete', '/uploads').send({ publicId: res.body.data.publicId }).expect(204);
    }
  });

  it('rejects fake videos, other file types and anonymous uploads', async () => {
    const fake = await A('post', '/uploads/video').attach('file', Buffer.from('definitely not a video'.padEnd(64)), { filename: 'x.mp4', contentType: 'video/mp4' });
    expect(fake.status).toBe(400);
    const mov = await A('post', '/uploads/video').attach('file', Buffer.alloc(64), { filename: 'x.mov', contentType: 'video/quicktime' });
    expect(mov.status).toBe(400);
    const anon = await request(app).post(api('/admin/uploads/video')).attach('file', Buffer.alloc(64), { filename: 'x.mp4', contentType: 'video/mp4' });
    expect(anon.status).toBe(401);
  });
});

describe('newsletter export', () => {
  it('exports subscribers as CSV', async () => {
    const res = await A('get', '/newsletter?format=csv');
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('email,source,createdAt');
  });
});
