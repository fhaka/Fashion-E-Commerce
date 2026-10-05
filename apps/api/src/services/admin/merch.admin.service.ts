import type { BannerPlacement, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { ApiError } from '../../utils/ApiError';
import { slugify } from '../../utils/helpers';
import { invalidateCategoryCache } from '../catalog.service';

/* ───────────────────────── Categories ───────────────────────── */

type CategoryInput = { name: string; slug?: string; description?: string | null; image?: string | null; parentId?: string | null; sortOrder: number; isActive: boolean };

export async function listCategories() {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true, children: true } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products, childCount: _count.children }));
}

async function assertNoCycle(id: string, parentId: string | null | undefined) {
  let cursor = parentId;
  while (cursor) {
    if (cursor === id) throw ApiError.validation({ fields: { parentId: 'A category cannot be placed inside itself' } });
    cursor = (await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } }))?.parentId;
  }
}

export async function createCategory(input: CategoryInput) {
  const c = await prisma.category.create({ data: { ...input, slug: input.slug || slugify(input.name) } });
  invalidateCategoryCache();
  return c;
}

export async function updateCategory(id: string, input: CategoryInput) {
  await assertNoCycle(id, input.parentId);
  const c = await prisma.category.update({ where: { id }, data: { ...input, slug: input.slug || slugify(input.name) } });
  invalidateCategoryCache();
  return c;
}

export async function deleteCategory(id: string) {
  const counts = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!counts) throw ApiError.notFound('Category not found');
  if (counts._count.products || counts._count.children) {
    throw ApiError.conflict('Move or delete this category’s products and subcategories first');
  }
  await prisma.category.delete({ where: { id } });
  invalidateCategoryCache();
}

/* ───────────────────────── Collections ───────────────────────── */

type CollectionInput = { name: string; slug?: string; description?: string | null; heroImage?: string | null; isFeatured: boolean; isActive: boolean; sortOrder: number };

export async function listCollections() {
  const rows = await prisma.collection.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } });
  return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
}

export async function getCollection(id: string) {
  const c = await prisma.collection.findUnique({
    where: { id },
    include: { products: { orderBy: { sortOrder: 'asc' }, include: { product: { select: { id: true, name: true, status: true, images: { take: 1, select: { url: true } } } } } } },
  });
  if (!c) throw ApiError.notFound('Collection not found');
  return { ...c, products: c.products.map((p) => ({ ...p.product, image: p.product.images[0]?.url ?? null, images: undefined })) };
}

export const createCollection = (input: CollectionInput) =>
  prisma.collection.create({ data: { ...input, slug: input.slug || slugify(input.name) } });

export const updateCollection = (id: string, input: CollectionInput) =>
  prisma.collection.update({ where: { id }, data: { ...input, slug: input.slug || slugify(input.name) } });

export async function deleteCollection(id: string) {
  await prisma.collection.delete({ where: { id } });
}

export async function setCollectionProducts(id: string, productIds: string[]) {
  await prisma.$transaction([
    prisma.productCollection.deleteMany({ where: { collectionId: id } }),
    prisma.productCollection.createMany({ data: productIds.map((productId, i) => ({ collectionId: id, productId, sortOrder: i })), skipDuplicates: true }),
  ]);
  return getCollection(id);
}

/* ───────────────────────── Sizes & colours ───────────────────────── */

export async function listSizes() {
  const rows = await prisma.size.findMany({ orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }], include: { _count: { select: { variants: true } } } });
  return rows.map(({ _count, ...s }) => ({ ...s, variantCount: _count.variants }));
}
export const createSize = (input: { label: string; group: string; sortOrder: number }) => prisma.size.create({ data: input });
export const updateSize = (id: string, input: { label: string; group: string; sortOrder: number }) => prisma.size.update({ where: { id }, data: input });

export async function listColors() {
  const rows = await prisma.color.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { variants: true } } } });
  return rows.map(({ _count, ...c }) => ({ ...c, variantCount: _count.variants }));
}
export const createColor = (input: { name: string; hex: string }) => prisma.color.create({ data: { ...input, hex: input.hex.toUpperCase(), slug: slugify(input.name) } });
export const updateColor = (id: string, input: { name: string; hex: string }) =>
  prisma.color.update({ where: { id }, data: { ...input, hex: input.hex.toUpperCase(), slug: slugify(input.name) } });

/** Sizes/colours in use by variants can't be deleted (FK Restrict) — surfaced as a friendly 409. */
export async function deleteSize(id: string) {
  if (await prisma.productVariant.count({ where: { sizeId: id } })) throw ApiError.conflict('This size is used by product variants');
  await prisma.size.delete({ where: { id } });
}
export async function deleteColor(id: string) {
  if (await prisma.productVariant.count({ where: { colorId: id } })) throw ApiError.conflict('This colour is used by product variants');
  await prisma.color.delete({ where: { id } });
}

/* ───────────────────────── Coupons ───────────────────────── */

type CouponInput = Prisma.CouponCreateInput;

function checkCoupon(input: CouponInput) {
  if (input.type === 'PERCENT' && (input.value < 1 || input.value > 100)) throw ApiError.validation({ fields: { value: 'Percentage must be between 1 and 100' } });
  if (input.type === 'FIXED' && input.value < 1) throw ApiError.validation({ fields: { value: 'Enter an amount' } });
  if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
    throw ApiError.validation({ fields: { endsAt: 'End date must be after the start date' } });
  }
}

export async function listCoupons() {
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  const now = new Date();
  return rows.map((c) => ({
    ...c,
    state: !c.isActive ? 'inactive' : c.endsAt && c.endsAt < now ? 'expired' : c.startsAt && c.startsAt > now ? 'scheduled' : c.maxUses !== null && c.usedCount >= c.maxUses ? 'exhausted' : 'active',
  }));
}

export async function createCoupon(input: CouponInput) {
  checkCoupon(input);
  return prisma.coupon.create({ data: input });
}

export async function updateCoupon(id: string, input: CouponInput) {
  checkCoupon(input);
  return prisma.coupon.update({ where: { id }, data: input });
}

export async function deleteCoupon(id: string) {
  const used = await prisma.coupon.findUnique({ where: { id }, select: { usedCount: true } });
  if (!used) throw ApiError.notFound('Coupon not found');
  // Used coupons are deactivated, not deleted, so order history keeps its reference.
  if (used.usedCount > 0) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return { deactivated: true };
  }
  await prisma.coupon.delete({ where: { id } });
  return { deactivated: false };
}

/* ───────────────────────── Banners ───────────────────────── */

export const listBanners = (placement?: BannerPlacement) =>
  prisma.banner.findMany({ where: placement ? { placement } : {}, orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }] });
export const createBanner = (input: Prisma.BannerCreateInput) => prisma.banner.create({ data: input });
export const updateBanner = (id: string, input: Prisma.BannerUpdateInput) => prisma.banner.update({ where: { id }, data: input });
export const deleteBanner = (id: string) => prisma.banner.delete({ where: { id } });

export async function reorderBanners(ids: string[]) {
  await prisma.$transaction(ids.map((id, i) => prisma.banner.update({ where: { id }, data: { sortOrder: i } })));
}
