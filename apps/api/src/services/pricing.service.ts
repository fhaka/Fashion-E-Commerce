import type { Coupon } from '@prisma/client';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS, TAX_RATE, type ShippingMethod } from '@maison/shared';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';

export interface PricedLine {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
}

/**
 * Loads and prices line items from the database. Client-supplied prices are never trusted.
 * Throws if any item is unavailable or there is not enough stock.
 */
export async function priceLines(items: { variantId: string; quantity: number }[]): Promise<PricedLine[]> {
  // Merge duplicate variants.
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity);
  if (merged.size === 0) throw ApiError.badRequest('Your bag is empty');

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: {
      inventory: true,
      size: { select: { label: true } },
      color: { select: { id: true, name: true } },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          basePrice: true,
          images: { orderBy: { sortOrder: 'asc' }, select: { url: true, colorId: true }, take: 20 },
        },
      },
    },
  });

  const problems: Record<string, string> = {};
  const lines: PricedLine[] = [];
  for (const [variantId, quantity] of merged) {
    const v = variants.find((x) => x.id === variantId);
    if (!v || !v.isActive || v.product.status !== 'ACTIVE') {
      problems[variantId] = 'This item is no longer available';
      continue;
    }
    const available = v.inventory ? Math.max(0, v.inventory.quantity - v.inventory.reserved) : 0;
    if (available < quantity) {
      problems[variantId] = available === 0 ? `${v.product.name} (${v.size.label}) is sold out` : `Only ${available} left of ${v.product.name} (${v.size.label})`;
      continue;
    }
    const unitPrice = v.priceOverride ?? v.product.basePrice;
    lines.push({
      variantId,
      productId: v.product.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantLabel: `${v.color.name} / ${v.size.label}`,
      sku: v.sku,
      image: v.product.images.find((i) => i.colorId === v.color.id)?.url ?? v.product.images[0]?.url ?? null,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      available,
    });
  }

  if (Object.keys(problems).length) {
    throw new ApiError(409, 'STOCK_CHANGED', 'Some items in your bag are no longer available in the quantity requested', { items: problems });
  }
  return lines;
}

/* ───────────────────────── Coupons ───────────────────────── */

export async function validateCoupon(
  code: string,
  subtotal: number,
  who: { userId?: string; email?: string },
): Promise<Coupon> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  const invalid = (msg: string) => new ApiError(422, 'INVALID_COUPON', msg, { fields: { couponCode: msg } });

  if (!coupon || !coupon.isActive) throw invalid('This code is not valid');
  if (coupon.startsAt && coupon.startsAt > now) throw invalid('This code is not active yet');
  if (coupon.endsAt && coupon.endsAt < now) throw invalid('This code has expired');
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw invalid('This code has reached its usage limit');
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    throw invalid(`Spend $${(coupon.minSubtotal / 100).toFixed(0)} or more to use this code`);
  }
  if (coupon.perUserLimit && (who.userId || who.email)) {
    const used = await prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        OR: [...(who.userId ? [{ userId: who.userId }] : []), ...(who.email ? [{ email: who.email }] : [])],
      },
    });
    if (used >= coupon.perUserLimit) throw invalid('You have already used this code');
  }
  return coupon;
}

/* ───────────────────────── Totals ───────────────────────── */

export interface Totals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
}

export function computeTotals(lines: Pick<PricedLine, 'lineTotal'>[], method: ShippingMethod, coupon: Coupon | null): Totals {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let discountTotal = 0;
  if (coupon?.type === 'PERCENT') discountTotal = Math.round((subtotal * Math.min(coupon.value, 100)) / 100);
  if (coupon?.type === 'FIXED') discountTotal = Math.min(coupon.value, subtotal);

  const qualifiesFree = subtotal >= FREE_SHIPPING_THRESHOLD;
  let shippingTotal: number = SHIPPING_METHODS[method].price;
  if (method === 'standard' && qualifiesFree) shippingTotal = 0;
  if (coupon?.type === 'FREE_SHIPPING') shippingTotal = 0;

  const taxTotal = Math.round((subtotal - discountTotal) * TAX_RATE);
  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    total: subtotal - discountTotal + shippingTotal + taxTotal,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
  };
}

export function describeCoupon(c: Coupon) {
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    description:
      c.description ??
      (c.type === 'PERCENT' ? `${c.value}% off` : c.type === 'FIXED' ? `$${(c.value / 100).toFixed(0)} off` : 'Free shipping'),
  };
}
