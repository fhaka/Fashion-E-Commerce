import type { BannerPlacement, Category, Prisma } from '@prisma/client';
import type { ProductQuery } from '@maison/shared';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { pageMeta, paginate } from '../utils/helpers';
import { productCardInclude, productDetailInclude, toProductCard, toProductDetail } from './serializers';

/* ───────────────────────── Category tree (cached) ───────────────────────── */

let categoryCache: { at: number; rows: Category[] } | null = null;
const CATEGORY_TTL = 60_000;

async function allCategories(): Promise<Category[]> {
  if (categoryCache && Date.now() - categoryCache.at < CATEGORY_TTL) return categoryCache.rows;
  const rows = await prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  categoryCache = { at: Date.now(), rows };
  return rows;
}

export function invalidateCategoryCache() {
  categoryCache = null;
}

/** The category plus all of its descendants. */
async function categoryAndDescendants(slug: string): Promise<string[] | null> {
  const rows = await allCategories();
  const root = rows.find((c) => c.slug === slug);
  if (!root) return null;
  const ids = [root.id];
  for (let i = 0; i < ids.length; i++) {
    for (const c of rows) if (c.parentId === ids[i]) ids.push(c.id);
  }
  return ids;
}

export async function getCategoryTree() {
  const rows = await allCategories();
  const build = (parentId: string | null): any[] =>
    rows
      .filter((c) => c.parentId === parentId)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image, children: build(c.id) }));
  return build(null);
}

export async function getCategory(slug: string) {
  const rows = await allCategories();
  const cat = rows.find((c) => c.slug === slug);
  if (!cat) throw ApiError.notFound('Category not found');
  const parent = cat.parentId ? rows.find((c) => c.id === cat.parentId) : null;
  const children = rows.filter((c) => c.parentId === cat.id);
  const siblings = parent ? rows.filter((c) => c.parentId === parent.id) : children;
  const pick = (c: Category) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image });
  return {
    ...pick(cat),
    description: cat.description,
    parent: parent ? pick(parent) : null,
    children: children.map(pick),
    siblings: siblings.map(pick),
    breadcrumbs: [...(parent ? [{ name: parent.name, href: `/category/${parent.slug}` }] : []), { name: cat.name, href: `/category/${cat.slug}` }],
  };
}

/* ───────────────────────── Product listing ───────────────────────── */

async function buildBaseWhere(q: ProductQuery): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };
  const and: Prisma.ProductWhereInput[] = [];

  if (q.q) {
    const terms = q.q.split(/\s+/).filter(Boolean).slice(0, 6);
    // Every term must match somewhere (name, description, category or colour).
    for (const term of terms) {
      and.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
          { variants: { some: { color: { name: { contains: term, mode: 'insensitive' } } } } },
        ],
      });
    }
  }
  if (q.category) {
    const ids = await categoryAndDescendants(q.category);
    and.push({ categoryId: { in: ids ?? [] } });
  }
  if (q.collection) and.push({ collections: { some: { collection: { slug: q.collection, isActive: true } } } });
  if (q.gender) and.push({ gender: { in: q.gender === 'UNISEX' ? ['UNISEX'] : [q.gender, 'UNISEX'] } });
  if (q.onSale) and.push({ compareAtPrice: { not: null } });
  if (q.featured) and.push({ isFeatured: true });
  if (q.bestSeller) and.push({ isBestSeller: true });
  if (q.isNew) and.push({ isNew: true });

  if (and.length) where.AND = and;
  return where;
}

function variantFilter(q: ProductQuery): Prisma.ProductVariantWhereInput | null {
  const v: Prisma.ProductVariantWhereInput = { isActive: true };
  let used = false;
  if (q.size.length) {
    v.size = { label: { in: q.size } };
    used = true;
  }
  if (q.color.length) {
    v.color = { slug: { in: q.color } };
    used = true;
  }
  if (q.inStock) {
    v.inventory = { quantity: { gt: prisma.inventory.fields.reserved } };
    used = true;
  }
  return used ? v : null;
}

const SORTS: Record<ProductQuery['sort'], Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  price_asc: [{ basePrice: 'asc' }, { id: 'asc' }],
  price_desc: [{ basePrice: 'desc' }, { id: 'asc' }],
  bestselling: [{ salesCount: 'desc' }, { id: 'asc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }, { id: 'asc' }],
};

export async function listProducts(q: ProductQuery) {
  const base = await buildBaseWhere(q);
  const vf = variantFilter(q);
  const where: Prisma.ProductWhereInput = {
    ...base,
    AND: [
      ...((base.AND as Prisma.ProductWhereInput[]) ?? []),
      ...(vf ? [{ variants: { some: vf } }] : []),
      ...(q.minPrice !== undefined ? [{ basePrice: { gte: q.minPrice } }] : []),
      ...(q.maxPrice !== undefined ? [{ basePrice: { lte: q.maxPrice } }] : []),
    ],
  };

  const [total, rows, facets] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: productCardInclude, orderBy: SORTS[q.sort], ...paginate(q.page, q.limit) }),
    getFacets(base),
  ]);

  return { data: rows.map(toProductCard), meta: { ...pageMeta(total, q.page, q.limit), facets } };
}

/**
 * Facets are computed against the "base" filter (search, category, collection, gender)
 * so selecting a size doesn't hide the other sizes from the filter panel.
 */
async function getFacets(base: Prisma.ProductWhereInput) {
  const [variantRows, price, genders] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, product: base },
      select: {
        productId: true,
        size: { select: { label: true, sortOrder: true, group: true } },
        color: { select: { name: true, hex: true, slug: true } },
      },
    }),
    prisma.product.aggregate({ where: base, _min: { basePrice: true }, _max: { basePrice: true } }),
    prisma.product.groupBy({ by: ['gender'], where: base, _count: { _all: true } }),
  ]);

  const sizes = new Map<string, { label: string; sortOrder: number; group: string; products: Set<string> }>();
  const colors = new Map<string, { name: string; hex: string; slug: string; products: Set<string> }>();
  for (const v of variantRows) {
    const s = sizes.get(v.size.label) ?? { ...v.size, products: new Set<string>() };
    s.products.add(v.productId);
    sizes.set(v.size.label, s);
    const c = colors.get(v.color.slug) ?? { ...v.color, products: new Set<string>() };
    c.products.add(v.productId);
    colors.set(v.color.slug, c);
  }

  const GROUP_ORDER = ['APPAREL', 'WAIST', 'SHOE_W', 'SHOE_M', 'ONE_SIZE'];
  return {
    sizes: [...sizes.values()]
      .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.sortOrder - b.sortOrder)
      .map((s) => ({ label: s.label, group: s.group, count: s.products.size })),
    colors: [...colors.values()]
      .sort((a, b) => b.products.size - a.products.size)
      .map((c) => ({ name: c.name, hex: c.hex, slug: c.slug, count: c.products.size })),
    price: { min: price._min.basePrice ?? 0, max: price._max.basePrice ?? 0 },
    genders: genders.map((g) => ({ value: g.gender, count: g._count._all })),
  };
}

/* ───────────────────────── Product detail ───────────────────────── */

export async function getProductBySlug(slug: string) {
  const p = await prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, include: productDetailInclude });
  if (!p) throw ApiError.notFound('Product not found');

  const [distribution, fit] = await Promise.all([
    prisma.review.groupBy({ by: ['rating'], where: { productId: p.id, status: 'APPROVED' }, _count: { _all: true } }),
    prisma.review.groupBy({ by: ['fit'], where: { productId: p.id, status: 'APPROVED', fit: { not: null } }, _count: { _all: true } }),
  ]);

  return {
    ...toProductDetail(p),
    reviewSummary: {
      average: p.ratingAvg,
      count: p.ratingCount,
      distribution: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: distribution.find((d) => d.rating === r)?._count._all ?? 0 })),
      fit: Object.fromEntries(fit.map((f) => [f.fit, f._count._all])),
    },
  };
}

export async function getRelatedProducts(slug: string, limit = 8) {
  const p = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: { id: true, categoryId: true, gender: true, category: { select: { parentId: true } } },
  });
  if (!p) throw ApiError.notFound('Product not found');

  const sameCategory = await prisma.product.findMany({
    where: { status: 'ACTIVE', categoryId: p.categoryId, id: { not: p.id } },
    include: productCardInclude,
    orderBy: [{ salesCount: 'desc' }, { id: 'asc' }],
    take: limit,
  });
  let rows = sameCategory;
  if (rows.length < limit) {
    // Top up from sibling categories with the same gender.
    const more = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { notIn: [p.id, ...rows.map((r) => r.id)] },
        gender: { in: [p.gender, 'UNISEX'] },
        ...(p.category.parentId ? { category: { parentId: p.category.parentId } } : {}),
      },
      include: productCardInclude,
      orderBy: [{ salesCount: 'desc' }, { id: 'asc' }],
      take: limit - rows.length,
    });
    rows = [...rows, ...more];
  }
  return rows.map(toProductCard);
}

/** Used for "recently viewed" — preserves the requested order and silently drops unavailable products. */
export async function getProductsByIds(ids: string[]) {
  const rows = await prisma.product.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, include: productCardInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r).map(toProductCard);
}

/* ───────────────────────── Collections ───────────────────────── */

export async function listCollections() {
  const rows = await prisma.collection.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: { where: { product: { status: 'ACTIVE' } } } } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
}

export async function getCollection(slug: string) {
  const c = await prisma.collection.findFirst({ where: { slug, isActive: true } });
  if (!c) throw ApiError.notFound('Collection not found');
  return c;
}

/* ───────────────────────── Reference data ───────────────────────── */

export async function listSizes() {
  return prisma.size.findMany({ orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }] });
}

export async function listColors() {
  return prisma.color.findMany({ orderBy: { name: 'asc' } });
}

export async function listBanners(placement?: BannerPlacement) {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      isActive: true,
      ...(placement ? { placement } : {}),
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }],
  });
}

/* ───────────────────────── Search suggestions ───────────────────────── */

export async function searchSuggest(q: string) {
  const [products, categories, collections] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { category: { name: { contains: q, mode: 'insensitive' } } }],
      },
      include: productCardInclude,
      orderBy: [{ salesCount: 'desc' }],
      take: 6,
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      select: { name: true, slug: true, parent: { select: { name: true } } },
      take: 4,
    }),
    prisma.collection.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      select: { name: true, slug: true },
      take: 3,
    }),
  ]);
  return {
    products: products.map(toProductCard),
    categories: categories.map((c) => ({ name: c.parent ? `${c.parent.name} · ${c.name}` : c.name, slug: c.slug })),
    collections,
  };
}
