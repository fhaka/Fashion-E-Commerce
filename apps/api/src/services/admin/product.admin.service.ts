import type { Prisma, ProductStatus } from '@prisma/client';
import type { AdminProductInput } from '@maison/shared';
import { logger } from '../../config/logger';
import { prisma, type Tx } from '../../db/prisma';
import { getStorageProvider } from '../../providers/storage';
import { ApiError } from '../../utils/ApiError';
import { pageMeta, paginate, slugify } from '../../utils/helpers';

/* ───────────────────────── Helpers ───────────────────────── */

async function uniqueSlug(tx: Tx, base: string, excludeId?: string) {
  const root = slugify(base) || 'product';
  let slug = root;
  for (let i = 2; await tx.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } }); i++) {
    slug = `${root}-${i}`;
  }
  return slug;
}

function assertUniqueVariants(variants: AdminProductInput['variants']) {
  const combos = new Set<string>();
  const skus = new Set<string>();
  for (const v of variants) {
    const key = `${v.sizeId}:${v.colorId}`;
    if (combos.has(key)) throw ApiError.validation({ fields: { variants: 'Each size and colour combination can only appear once' } });
    if (skus.has(v.sku)) throw ApiError.validation({ fields: { variants: `SKU ${v.sku} is used more than once` } });
    combos.add(key);
    skus.add(v.sku);
  }
}

async function assertReferences(input: AdminProductInput) {
  const [category, sizes, colors, collections] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    prisma.size.count({ where: { id: { in: [...new Set(input.variants.map((v) => v.sizeId))] } } }),
    prisma.color.count({ where: { id: { in: [...new Set([...input.variants.map((v) => v.colorId), ...input.images.map((i) => i.colorId).filter((x): x is string => !!x)])] } } }),
    prisma.collection.count({ where: { id: { in: input.collectionIds } } }),
  ]);
  if (!category) throw ApiError.validation({ fields: { categoryId: 'Category not found' } });
  if (sizes !== new Set(input.variants.map((v) => v.sizeId)).size) throw ApiError.validation({ fields: { variants: 'Unknown size' } });
  const colorIds = new Set([...input.variants.map((v) => v.colorId), ...input.images.map((i) => i.colorId).filter(Boolean)]);
  if (colors !== colorIds.size) throw ApiError.validation({ fields: { variants: 'Unknown colour' } });
  if (collections !== new Set(input.collectionIds).size) throw ApiError.validation({ fields: { collectionIds: 'Unknown collection' } });
}

const adminDetailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  collections: { select: { collectionId: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  variants: {
    orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }],
    include: { size: true, color: true, inventory: true, _count: { select: { orderItems: true } } },
  },
} satisfies Prisma.ProductInclude;

/** Variants retired by an earlier edit (kept only for order history) carry this SKU marker. */
const RETIRED = '-RETIRED-';

function toAdminDetail(p: Prisma.ProductGetPayload<{ include: typeof adminDetailInclude }>) {
  const { collections, variants, ...rest } = p;
  return {
    ...rest,
    collectionIds: collections.map((c) => c.collectionId),
    variants: variants.filter((v) => !v.sku.includes(RETIRED)).map(({ inventory, _count, ...v }) => ({
      ...v,
      stock: inventory?.quantity ?? 0,
      reserved: inventory?.reserved ?? 0,
      available: Math.max(0, (inventory?.quantity ?? 0) - (inventory?.reserved ?? 0)),
      lowStockThreshold: inventory?.lowStockThreshold ?? 5,
      hasOrders: _count.orderItems > 0,
    })),
  };
}

/* ───────────────────────── Queries ───────────────────────── */

export async function listProducts(q: {
  q?: string;
  status?: ProductStatus;
  categoryId?: string;
  featured?: boolean;
  lowStock?: boolean;
  sort?: 'newest' | 'name' | 'price' | 'sales';
  page: number;
  limit: number;
}) {
  const where: Prisma.ProductWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.featured ? { isFeatured: true } : {}),
    ...(q.q
      ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q.q, mode: 'insensitive' } } } }] }
      : {}),
    ...(q.lowStock ? { variants: { some: { isActive: true, inventory: { quantity: { lte: prisma.inventory.fields.lowStockThreshold } } } } } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === 'name' ? { name: 'asc' } : q.sort === 'price' ? { basePrice: 'desc' } : q.sort === 'sales' ? { salesCount: 'desc' } : { createdAt: 'desc' };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      ...paginate(q.page, q.limit),
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        variants: { select: { isActive: true, inventory: { select: { quantity: true, reserved: true, lowStockThreshold: true } } } },
      },
    }),
  ]);

  return {
    data: rows.map(({ variants, images, ...p }) => {
      const active = variants.filter((v) => v.isActive);
      const stock = active.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0);
      return {
        ...p,
        image: images[0]?.url ?? null,
        variantCount: active.length,
        stock,
        outOfStockVariants: active.filter((v) => (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0) <= 0).length,
        lowStockVariants: active.filter((v) => {
          const avail = (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
          return avail > 0 && avail <= (v.inventory?.lowStockThreshold ?? 5);
        }).length,
      };
    }),
    meta: pageMeta(total, q.page, q.limit),
  };
}

export async function getProduct(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: adminDetailInclude });
  if (!p) throw ApiError.notFound('Product not found');
  return toAdminDetail(p);
}

/* ───────────────────────── Create / update ───────────────────────── */

export async function createProduct(input: AdminProductInput, actorId: string) {
  assertUniqueVariants(input.variants);
  await assertReferences(input);

  const id = await prisma.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx, input.slug || input.name);
    const product = await tx.product.create({
      data: {
        ...productFields(input),
        slug,
        collections: { create: input.collectionIds.map((collectionId, i) => ({ collectionId, sortOrder: i })) },
        images: { create: input.images.map(({ id: _id, ...img }, i) => ({ ...img, sortOrder: img.sortOrder ?? i })) },
      },
    });
    for (const v of input.variants) await createVariant(tx, product.id, v, actorId);
    return product.id;
  });
  return getProduct(id);
}

function productFields(input: AdminProductInput) {
  return {
    name: input.name,
    description: input.description,
    details: input.details,
    materials: input.materials ?? null,
    care: input.care ?? null,
    basePrice: input.basePrice,
    compareAtPrice: input.compareAtPrice && input.compareAtPrice > input.basePrice ? input.compareAtPrice : null,
    gender: input.gender,
    status: input.status,
    categoryId: input.categoryId,
    isFeatured: input.isFeatured,
    isBestSeller: input.isBestSeller,
    isNew: input.isNew,
    videoUrl: input.videoUrl ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
  };
}

async function createVariant(tx: Tx, productId: string, v: AdminProductInput['variants'][number], actorId: string) {
  await tx.productVariant.create({
    data: {
      productId,
      sizeId: v.sizeId,
      colorId: v.colorId,
      sku: v.sku,
      priceOverride: v.priceOverride ?? null,
      isActive: v.isActive,
      inventory: { create: { quantity: v.stock, lowStockThreshold: v.lowStockThreshold } },
      movements: { create: { delta: v.stock, reason: 'INITIAL', actorId, note: 'Variant created' } },
    },
  });
}

export async function updateProduct(id: string, input: AdminProductInput, actorId: string) {
  assertUniqueVariants(input.variants);
  await assertReferences(input);
  const existing = await prisma.product.findUnique({ where: { id }, include: { images: true, variants: { include: { inventory: true, _count: { select: { orderItems: true } } } } } });
  if (!existing) throw ApiError.notFound('Product not found');

  const keepImageIds = new Set(input.images.map((i) => i.id).filter(Boolean));
  const removedImages = existing.images.filter((i) => !keepImageIds.has(i.id));

  await prisma.$transaction(async (tx) => {
    const slug = input.slug ? await uniqueSlug(tx, input.slug, id) : existing.slug;
    await tx.product.update({ where: { id }, data: { ...productFields(input), slug } });

    // Collections
    await tx.productCollection.deleteMany({ where: { productId: id } });
    if (input.collectionIds.length) {
      await tx.productCollection.createMany({ data: input.collectionIds.map((collectionId, i) => ({ productId: id, collectionId, sortOrder: i })) });
    }

    // Images
    if (removedImages.length) await tx.productImage.deleteMany({ where: { id: { in: removedImages.map((i) => i.id) } } });
    for (const [i, img] of input.images.entries()) {
      const data = { url: img.url, publicId: img.publicId ?? null, alt: img.alt ?? null, colorId: img.colorId ?? null, sortOrder: img.sortOrder ?? i };
      if (img.id && existing.images.some((e) => e.id === img.id)) await tx.productImage.update({ where: { id: img.id }, data });
      else await tx.productImage.create({ data: { ...data, productId: id } });
    }

    // Variants: update, create, then remove/deactivate missing ones.
    const inputIds = new Set(input.variants.map((v) => v.id).filter(Boolean));
    for (const old of existing.variants.filter((v) => !inputIds.has(v.id) && !v.sku.includes(RETIRED))) {
      if (old._count.orderItems > 0) {
        // Keep history intact — retire the variant and free its SKU for reuse.
        await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false, sku: `${old.sku}${RETIRED}${Date.now().toString(36)}` } });
      } else {
        await tx.productVariant.delete({ where: { id: old.id } });
      }
    }
    for (const v of input.variants) {
      const current = v.id ? existing.variants.find((e) => e.id === v.id) : undefined;
      if (!current) {
        await createVariant(tx, id, v, actorId);
        continue;
      }
      await tx.productVariant.update({
        where: { id: current.id },
        data: { sizeId: v.sizeId, colorId: v.colorId, sku: v.sku, priceOverride: v.priceOverride ?? null, isActive: v.isActive },
      });
      const prevQty = current.inventory?.quantity ?? 0;
      if (v.stock < (current.inventory?.reserved ?? 0)) {
        throw ApiError.validation({ fields: { variants: `${v.sku}: stock cannot be lower than the ${current.inventory?.reserved} units held by pending orders` } });
      }
      await tx.inventory.upsert({
        where: { variantId: current.id },
        create: { variantId: current.id, quantity: v.stock, lowStockThreshold: v.lowStockThreshold },
        update: { quantity: v.stock, lowStockThreshold: v.lowStockThreshold },
      });
      if (v.stock !== prevQty) {
        await tx.inventoryMovement.create({ data: { variantId: current.id, delta: v.stock - prevQty, reason: 'ADJUSTMENT', actorId, note: 'Product editor' } });
      }
    }
  });

  await removeStoredImages(removedImages.map((i) => i.publicId));
  return getProduct(id);
}

async function removeStoredImages(publicIds: (string | null)[]) {
  const storage = getStorageProvider();
  for (const pid of publicIds) {
    if (!pid) continue;
    await storage.remove(pid).catch((err) => logger.warn({ err, pid }, 'Could not delete stored image'));
  }
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) throw ApiError.notFound('Product not found');
  const hasOrders = await prisma.orderItem.count({ where: { productId: id } });
  if (hasOrders) {
    // Products with sales history are archived so reports and order history stay accurate.
    await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED', isFeatured: false } });
    return { archived: true };
  }
  await prisma.product.delete({ where: { id } });
  await removeStoredImages(product.images.map((i) => i.publicId));
  return { archived: false };
}

export async function duplicateProduct(id: string, actorId: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: adminDetailInclude });
  if (!p) throw ApiError.notFound('Product not found');
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return createProduct(
    {
      name: `${p.name} (Copy)`,
      description: p.description,
      details: p.details,
      materials: p.materials,
      care: p.care,
      basePrice: p.basePrice,
      compareAtPrice: p.compareAtPrice,
      gender: p.gender,
      status: 'DRAFT',
      categoryId: p.categoryId,
      collectionIds: p.collections.map((c) => c.collectionId),
      isFeatured: false,
      isBestSeller: false,
      isNew: p.isNew,
      videoUrl: p.videoUrl,
      seoTitle: null,
      seoDescription: null,
      images: p.images.map((i) => ({ url: i.url, publicId: null, alt: i.alt, colorId: i.colorId, sortOrder: i.sortOrder })),
      variants: p.variants
        .filter((v) => v.isActive)
        .map((v) => ({ sizeId: v.sizeId, colorId: v.colorId, sku: `${v.sku}-${suffix}`, priceOverride: v.priceOverride, stock: 0, lowStockThreshold: v.inventory?.lowStockThreshold ?? 5, isActive: true })),
    },
    actorId,
  );
}

export async function bulkUpdate(ids: string[], data: { status?: ProductStatus; isFeatured?: boolean; isBestSeller?: boolean; isNew?: boolean }) {
  const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data });
  return { updated: result.count };
}

/* ───────────────────────── Inventory ───────────────────────── */

export async function listInventory(q: { q?: string; filter?: 'all' | 'low' | 'out'; page: number; limit: number }) {
  const invFilter: Prisma.InventoryWhereInput | undefined =
    q.filter === 'out'
      ? { quantity: { lte: prisma.inventory.fields.reserved } }
      : q.filter === 'low'
        ? { quantity: { lte: prisma.inventory.fields.lowStockThreshold } }
        : undefined;
  const where: Prisma.ProductVariantWhereInput = {
    isActive: true,
    product: { status: { not: 'ARCHIVED' } },
    ...(invFilter ? { inventory: invFilter } : {}),
    ...(q.q ? { OR: [{ sku: { contains: q.q, mode: 'insensitive' } }, { product: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({
      where,
      orderBy: [{ product: { name: 'asc' } }, { color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }],
      ...paginate(q.page, q.limit),
      include: {
        inventory: true,
        size: { select: { label: true } },
        color: { select: { name: true, hex: true } },
        product: { select: { id: true, name: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } } },
      },
    }),
  ]);
  return {
    data: rows.map((v) => {
      const quantity = v.inventory?.quantity ?? 0;
      const reserved = v.inventory?.reserved ?? 0;
      return {
        variantId: v.id,
        sku: v.sku,
        productId: v.product.id,
        productName: v.product.name,
        image: v.product.images[0]?.url ?? null,
        size: v.size.label,
        color: v.color,
        quantity,
        reserved,
        available: Math.max(0, quantity - reserved),
        lowStockThreshold: v.inventory?.lowStockThreshold ?? 5,
      };
    }),
    meta: pageMeta(total, q.page, q.limit),
  };
}

export async function adjustInventory(
  variantId: string,
  input: { quantity?: number; delta?: number; lowStockThreshold?: number; note?: string | null },
  actorId: string,
) {
  if (input.quantity === undefined && input.delta === undefined && input.lowStockThreshold === undefined) {
    throw ApiError.badRequest('Provide quantity, delta or lowStockThreshold');
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Inventory" WHERE "variantId" = ${variantId} FOR UPDATE`;
    const inv = await tx.inventory.findUnique({ where: { variantId } });
    if (!inv) throw ApiError.notFound('Variant not found');

    const next = input.quantity ?? inv.quantity + (input.delta ?? 0);
    if (next < 0) throw ApiError.validation({ fields: { quantity: 'Stock cannot be negative' } });
    if (next < inv.reserved) throw ApiError.validation({ fields: { quantity: `${inv.reserved} units are held by pending orders` } });

    const updated = await tx.inventory.update({
      where: { variantId },
      data: { quantity: next, ...(input.lowStockThreshold !== undefined ? { lowStockThreshold: input.lowStockThreshold } : {}) },
    });
    if (next !== inv.quantity) {
      await tx.inventoryMovement.create({
        data: { variantId, delta: next - inv.quantity, reason: next > inv.quantity ? 'RESTOCK' : 'ADJUSTMENT', actorId, note: input.note ?? null },
      });
    }
    return { ...updated, available: Math.max(0, updated.quantity - updated.reserved) };
  });
}

export async function inventoryMovements(variantId: string, page: number, limit: number) {
  const where = { variantId };
  const [total, rows] = await Promise.all([
    prisma.inventoryMovement.count({ where }),
    prisma.inventoryMovement.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
  ]);
  return { data: rows, meta: pageMeta(total, page, limit) };
}
