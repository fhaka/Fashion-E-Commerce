import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../db/prisma';
import { api, app } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

const get = (path: string) => request(app).get(api(path));

describe('product listing', () => {
  it('returns paginated product cards with facets', async () => {
    const res = await get('/products?limit=12');
    const active = await prisma.product.count({ where: { status: 'ACTIVE' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(12);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 12, total: active, pages: Math.ceil(active / 12) });

    const card = res.body.data[0];
    expect(card).toHaveProperty('slug');
    expect(card.image.url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(card.colors.length).toBeGreaterThan(0);
    expect(card.sizes.length).toBeGreaterThan(0);
    expect(typeof card.price).toBe('number');

    const { facets } = res.body.meta;
    expect(facets.sizes.map((s: { label: string }) => s.label)).toEqual(expect.arrayContaining(['XS', 'M', '32', 'One Size']));
    expect(facets.colors.length).toBeGreaterThan(5);
    expect(facets.price.min).toBeLessThan(facets.price.max);
  });

  it('paginates without overlap', async () => {
    const p1 = await get('/products?limit=10&page=1&sort=price_asc');
    const p2 = await get('/products?limit=10&page=2&sort=price_asc');
    const ids1 = p1.body.data.map((p: { id: string }) => p.id);
    const ids2 = p2.body.data.map((p: { id: string }) => p.id);
    expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0);
  });

  it('filters by parent category including subcategories', async () => {
    const res = await get('/products?category=women&limit=60');
    expect(res.body.data.length).toBeGreaterThan(10);
    expect(res.body.data.every((p: { gender: string }) => p.gender !== 'MEN')).toBe(true);
    const sub = await get('/products?category=women-dresses');
    expect(sub.body.data.every((p: { category: { slug: string } }) => p.category.slug === 'women-dresses')).toBe(true);
  });

  it('filters by gender (unisex items appear under both)', async () => {
    const res = await get('/products?gender=MEN&limit=60');
    const genders = new Set(res.body.data.map((p: { gender: string }) => p.gender));
    expect([...genders].every((g) => g === 'MEN' || g === 'UNISEX')).toBe(true);
    expect(res.body.data.some((p: { name: string }) => p.name === 'Leather Weekender')).toBe(true);
  });

  it('filters by size and colour on the same variant', async () => {
    const res = await get('/products?size=32&limit=60');
    expect(res.body.data.map((p: { name: string }) => p.name).sort()).toEqual(['Selvedge Denim Jeans', 'Tailored Chinos']);

    const black = await get('/products?color=black&limit=60');
    expect(black.body.data.length).toBeGreaterThan(5);
    expect(black.body.data.every((p: { colors: { slug: string }[] }) => p.colors.some((c) => c.slug === 'black'))).toBe(true);

    const combo = await get('/products?color=indigo&size=XS');
    expect(combo.body.data).toHaveLength(0);
  });

  it('accepts repeated and comma-separated multi-value filters', async () => {
    const a = await get('/products?color=black,ivory&limit=60');
    const b = await get('/products?color=black&color=ivory&limit=60');
    expect(a.body.meta.total).toBe(b.body.meta.total);
    expect(a.body.meta.total).toBeGreaterThan((await get('/products?color=black&limit=60')).body.meta.total);
  });

  it('filters by price range (cents) and sorts by price', async () => {
    const res = await get('/products?minPrice=20000&maxPrice=50000&sort=price_asc&limit=60');
    const prices = res.body.data.map((p: { price: number }) => p.price);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices.every((p: number) => p >= 20000 && p <= 50000)).toBe(true);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    const desc = await get('/products?sort=price_desc&limit=5');
    expect(desc.body.data[0].price).toBeGreaterThanOrEqual(desc.body.data[4].price);
  });

  it('filters sale, new and best-seller flags', async () => {
    const sale = await get('/products?onSale=true');
    expect(sale.body.data.length).toBeGreaterThan(0);
    expect(sale.body.data.every((p: { compareAtPrice: number | null; price: number }) => p.compareAtPrice! > p.price)).toBe(true);
    const fresh = await get('/products?isNew=true');
    expect(fresh.body.data.every((p: { isNew: boolean }) => p.isNew)).toBe(true);
  });

  it('only returns products with stock when inStock=true', async () => {
    const res = await get('/products?inStock=true&limit=60');
    expect(res.body.data.every((p: { inStock: boolean }) => p.inStock)).toBe(true);
  });

  it('searches across name, description, category and colour with all terms required', async () => {
    const res = await get('/products?q=cashmere');
    expect(res.body.data.length).toBeGreaterThan(1);
    const multi = await get('/products?q=leather%20jacket');
    const names = multi.body.data.map((p: { name: string }) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Leather Moto Jacket', 'Leather Rider Jacket']));
    expect((await get('/products?q=zzzznotathing')).body.data).toHaveLength(0);
  });

  it('treats search input as data (no injection)', async () => {
    const before = await prisma.product.count();
    const res = await get(`/products?q=${encodeURIComponent("' OR 1=1; DROP TABLE \"Product\"; --")}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(await prisma.product.count()).toBe(before);
  });

  it('rejects invalid query parameters', async () => {
    expect((await get('/products?sort=cheapest')).status).toBe(422);
    expect((await get('/products?limit=1000')).status).toBe(422);
    expect((await get('/products?gender=KIDS')).status).toBe(422);
  });
});

describe('product detail', () => {
  it('returns full product data with variants, colours, sizes and review summary', async () => {
    const res = await get('/products/camel-wrap-coat');
    expect(res.status).toBe(200);
    const p = res.body.data;
    expect(p.name).toBe('Camel Wrap Coat');
    expect(p.colors.map((c: { name: string }) => c.name)).toEqual(['Camel', 'Charcoal']);
    expect(p.sizes.map((s: { label: string }) => s.label)).toEqual(['XS', 'S', 'M', 'L', 'XL']);
    expect(p.variants).toHaveLength(10);
    expect(p.variants[0]).toEqual(expect.objectContaining({ sku: expect.any(String), available: expect.any(Number), lowStock: expect.any(Boolean) }));
    expect(p.images.length).toBe(6);
    expect(p.breadcrumbs).toEqual([
      { name: 'Women', href: '/category/women' },
      { name: 'Coats & Jackets', href: '/category/women-coats-jackets' },
    ]);
    expect(p.reviewSummary.distribution).toHaveLength(5);
    // Never leak inventory internals
    expect(JSON.stringify(p)).not.toContain('reserved');
  });

  it('404s for unknown or draft products', async () => {
    expect((await get('/products/not-a-real-product')).status).toBe(404);
    const draft = await prisma.product.update({ where: { slug: 'tailored-chinos' }, data: { status: 'DRAFT' } });
    expect((await get('/products/tailored-chinos')).status).toBe(404);
    await prisma.product.update({ where: { id: draft.id }, data: { status: 'ACTIVE' } });
  });

  it('returns related products, excluding the product itself', async () => {
    const res = await get('/products/camel-wrap-coat/related');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(3);
    expect(res.body.data.some((p: { slug: string }) => p.slug === 'camel-wrap-coat')).toBe(false);
  });

  it('batch-fetches products for "recently viewed" preserving order', async () => {
    const rows = await prisma.product.findMany({ take: 3, orderBy: { name: 'desc' }, select: { id: true } });
    const ids = [rows[2].id, 'missing-id', rows[0].id, rows[1].id];
    const res = await request(app).post(api('/products/batch')).send({ ids });
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([rows[2].id, rows[0].id, rows[1].id]);
  });
});

describe('navigation data', () => {
  it('returns the category tree', async () => {
    const res = await get('/categories');
    expect(res.body.data.map((c: { slug: string }) => c.slug)).toEqual(['women', 'men', 'accessories']);
    expect(res.body.data[0].children.length).toBe(6);
  });

  it('returns a category with breadcrumbs and siblings', async () => {
    const res = await get('/categories/men-suiting');
    expect(res.body.data.parent.slug).toBe('men');
    expect(res.body.data.siblings.length).toBe(6);
    expect(res.body.data.breadcrumbs.at(-1)).toEqual({ name: 'Suiting', href: '/category/men-suiting' });
    expect((await get('/categories/nope')).status).toBe(404);
  });

  it('lists collections with product counts and fetches one', async () => {
    const res = await get('/collections');
    const aw = res.body.data.find((c: { slug: string }) => c.slug === 'autumn-winter-26');
    expect(aw.productCount).toBeGreaterThan(10);
    expect((await get('/collections/the-essentials')).body.data.name).toBe('The Essentials');
    expect((await get('/collections/nope')).status).toBe(404);
  });

  it('returns banners by placement', async () => {
    expect((await get('/banners?placement=HERO')).body.data).toHaveLength(3);
    expect((await get('/banners?placement=EDITORIAL')).body.data).toHaveLength(6);
    expect((await get('/banners?placement=STORY')).body.data).toHaveLength(1);
    expect((await get('/banners?placement=NOPE')).status).toBe(422);
  });

  it('hides scheduled banners outside their window', async () => {
    const b = await prisma.banner.findFirstOrThrow({ where: { placement: 'PROMO' } });
    await prisma.banner.update({ where: { id: b.id }, data: { startsAt: new Date(Date.now() + 86_400_000) } });
    expect((await get('/banners?placement=PROMO')).body.data).toHaveLength(0);
    await prisma.banner.update({ where: { id: b.id }, data: { startsAt: null } });
  });

  it('returns sizes and colours', async () => {
    expect((await get('/sizes')).body.data.length).toBe(23);
    expect((await get('/colors')).body.data.length).toBe(15);
  });

  it('suggests products, categories and collections while typing', async () => {
    const res = await get('/search/suggest?q=coat');
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
    expect((await get('/search/suggest?q=')).status).toBe(422);
  });
});
