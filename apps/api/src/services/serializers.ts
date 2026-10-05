import type { Prisma } from '@prisma/client';

/* ───────────────────────── Product card (listing) ───────────────────────── */

export const productCardInclude = {
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' }, take: 16, select: { url: true, alt: true, colorId: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      colorId: true,
      priceOverride: true,
      color: { select: { id: true, name: true, hex: true, slug: true } },
      size: { select: { id: true, label: true, sortOrder: true } },
      inventory: { select: { quantity: true, reserved: true } },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductCardRow = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

const available = (inv: { quantity: number; reserved: number } | null) => (inv ? Math.max(0, inv.quantity - inv.reserved) : 0);

export function toProductCard(p: ProductCardRow) {
  const prices = p.variants.map((v) => v.priceOverride ?? p.basePrice);
  const price = prices.length ? Math.min(...prices) : p.basePrice;

  const colors = new Map<string, { name: string; hex: string; slug: string; image: string | null; inStock: boolean }>();
  const sizes = new Map<string, { label: string; sortOrder: number; inStock: boolean }>();
  for (const v of p.variants) {
    const stock = available(v.inventory) > 0;
    const c = colors.get(v.color.id);
    if (c) c.inStock ||= stock;
    else {
      colors.set(v.color.id, {
        name: v.color.name,
        hex: v.color.hex,
        slug: v.color.slug,
        image: p.images.find((i) => i.colorId === v.color.id)?.url ?? null,
        inStock: stock,
      });
    }
    const s = sizes.get(v.size.id);
    if (s) s.inStock ||= stock;
    else sizes.set(v.size.id, { label: v.size.label, sortOrder: v.size.sortOrder, inStock: stock });
  }

  // Primary + hover image come from the default (first) colour's gallery when possible.
  const firstColorId = p.images[0]?.colorId;
  const gallery = p.images.filter((i) => i.colorId === firstColorId);
  const primary = gallery[0] ?? p.images[0];
  const hover = gallery[1] ?? p.images.find((i) => i.url !== primary?.url);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price,
    compareAtPrice: p.compareAtPrice && p.compareAtPrice > price ? p.compareAtPrice : null,
    gender: p.gender,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    isFeatured: p.isFeatured,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    category: p.category,
    image: primary ? { url: primary.url, alt: primary.alt ?? p.name } : null,
    hoverImage: hover ? { url: hover.url, alt: hover.alt ?? p.name } : null,
    colors: [...colors.values()],
    sizes: [...sizes.values()].sort((a, b) => a.sortOrder - b.sortOrder).map(({ label, inStock }) => ({ label, inStock })),
    inStock: p.variants.some((v) => available(v.inventory) > 0),
    updatedAt: p.updatedAt,
  };
}

export type ProductCard = ReturnType<typeof toProductCard>;

/* ───────────────────────── Product detail ───────────────────────── */

export const productDetailInclude = {
  category: { select: { id: true, name: true, slug: true, parent: { select: { name: true, slug: true } } } },
  collections: { select: { collection: { select: { name: true, slug: true } } } },
  images: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, alt: true, colorId: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      priceOverride: true,
      color: { select: { id: true, name: true, hex: true, slug: true } },
      size: { select: { id: true, label: true, sortOrder: true } },
      inventory: { select: { quantity: true, reserved: true, lowStockThreshold: true } },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductDetailRow = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

export function toProductDetail(p: ProductDetailRow) {
  const variants = p.variants
    .map((v) => {
      const qty = available(v.inventory);
      return {
        id: v.id,
        sku: v.sku,
        colorId: v.color.id,
        sizeId: v.size.id,
        price: v.priceOverride ?? p.basePrice,
        available: qty,
        lowStock: qty > 0 && qty <= (v.inventory?.lowStockThreshold ?? 5),
      };
    });

  const colorMap = new Map<string, { id: string; name: string; hex: string; slug: string }>();
  const sizeMap = new Map<string, { id: string; label: string; sortOrder: number }>();
  for (const v of p.variants) {
    colorMap.set(v.color.id, v.color);
    sizeMap.set(v.size.id, v.size);
  }
  // Keep colours in gallery order so the default colour matches the first image.
  const colorOrder = [...new Set(p.images.map((i) => i.colorId).filter(Boolean))] as string[];
  const colors = [...colorMap.values()].sort(
    (a, b) => (colorOrder.indexOf(a.id) + 1 || 99) - (colorOrder.indexOf(b.id) + 1 || 99),
  );
  const prices = variants.map((v) => v.price);
  const price = prices.length ? Math.min(...prices) : p.basePrice;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    details: p.details,
    materials: p.materials,
    care: p.care,
    price,
    compareAtPrice: p.compareAtPrice && p.compareAtPrice > price ? p.compareAtPrice : null,
    gender: p.gender,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    videoUrl: p.videoUrl,
    seoTitle: p.seoTitle ?? p.name,
    seoDescription: p.seoDescription ?? p.description.slice(0, 160),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    category: { name: p.category.name, slug: p.category.slug },
    breadcrumbs: [
      ...(p.category.parent ? [{ name: p.category.parent.name, href: `/category/${p.category.parent.slug}` }] : []),
      { name: p.category.name, href: `/category/${p.category.slug}` },
    ],
    collections: p.collections.map((c) => c.collection),
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? p.name, colorId: i.colorId })),
    colors,
    sizes: [...sizeMap.values()].sort((a, b) => a.sortOrder - b.sortOrder).map(({ id, label }) => ({ id, label })),
    variants,
    inStock: variants.some((v) => v.available > 0),
  };
}
