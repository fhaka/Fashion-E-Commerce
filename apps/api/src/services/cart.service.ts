import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { randomToken } from '../utils/helpers';

export const MAX_LINE_QTY = 20;

export interface CartOwner {
  userId?: string;
  sessionId?: string;
}

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          size: { select: { label: true } },
          color: { select: { id: true, name: true, hex: true } },
          inventory: { select: { quantity: true, reserved: true } },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              basePrice: true,
              compareAtPrice: true,
              images: { orderBy: { sortOrder: 'asc' }, select: { url: true, colorId: true }, take: 20 },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function serialize(cart: CartRow | null) {
  if (!cart) return { id: null, items: [], itemCount: 0, subtotal: 0, hasIssues: false };
  const items = cart.items.map((item) => {
    const v = item.variant;
    const p = v.product;
    const available = v.inventory ? Math.max(0, v.inventory.quantity - v.inventory.reserved) : 0;
    const unitPrice = v.priceOverride ?? p.basePrice;
    const purchasable = p.status === 'ACTIVE' && v.isActive;
    const image = p.images.find((i) => i.colorId === v.color.id)?.url ?? p.images[0]?.url ?? null;
    return {
      id: item.id,
      quantity: item.quantity,
      variantId: v.id,
      sku: v.sku,
      size: v.size.label,
      color: { name: v.color.name, hex: v.color.hex },
      product: { id: p.id, name: p.name, slug: p.slug, image },
      unitPrice,
      compareAtPrice: p.compareAtPrice && p.compareAtPrice > unitPrice ? p.compareAtPrice : null,
      lineTotal: unitPrice * item.quantity,
      available,
      maxQuantity: Math.min(MAX_LINE_QTY, available),
      issue: !purchasable
        ? ('UNAVAILABLE' as const)
        : available === 0
          ? ('OUT_OF_STOCK' as const)
          : item.quantity > available
            ? ('INSUFFICIENT_STOCK' as const)
            : null,
    };
  });
  const valid = items.filter((i) => !i.issue);
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: valid.reduce((s, i) => s + i.lineTotal, 0),
    hasIssues: items.some((i) => i.issue),
  };
}

export type CartDTO = ReturnType<typeof serialize>;

async function findCart(owner: CartOwner) {
  if (owner.userId) return prisma.cart.findUnique({ where: { userId: owner.userId }, include: cartInclude });
  if (owner.sessionId) return prisma.cart.findUnique({ where: { sessionId: owner.sessionId }, include: cartInclude });
  return null;
}

/** Returns the cart id, creating a cart (and a new guest session id if needed). */
async function ensureCart(owner: CartOwner): Promise<{ cartId: string; newSessionId?: string }> {
  if (owner.userId) {
    const cart = await prisma.cart.upsert({ where: { userId: owner.userId }, create: { userId: owner.userId }, update: {} });
    return { cartId: cart.id };
  }
  if (owner.sessionId) {
    const cart = await prisma.cart.upsert({ where: { sessionId: owner.sessionId }, create: { sessionId: owner.sessionId }, update: {} });
    return { cartId: cart.id };
  }
  const sessionId = randomToken(24);
  const cart = await prisma.cart.create({ data: { sessionId } });
  return { cartId: cart.id, newSessionId: sessionId };
}

export async function getCart(owner: CartOwner) {
  return serialize(await findCart(owner));
}

async function loadPurchasableVariant(variantId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { status: true, name: true } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== 'ACTIVE') {
    throw ApiError.notFound('This item is no longer available');
  }
  const available = variant.inventory ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved) : 0;
  return { variant, available };
}

function stockError(available: number, inBag = 0) {
  if (available === 0) return new ApiError(409, 'OUT_OF_STOCK', 'Sorry, this size is sold out');
  const message =
    inBag > 0 ? `Only ${available} available — you already have ${inBag} in your bag` : `Only ${available} left in stock`;
  return new ApiError(409, 'INSUFFICIENT_STOCK', message, { available, inBag });
}

export async function addItem(owner: CartOwner, variantId: string, quantity: number) {
  const { available } = await loadPurchasableVariant(variantId);
  const { cartId, newSessionId } = await ensureCart(owner);

  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const desired = (existing?.quantity ?? 0) + quantity;
  if (desired > MAX_LINE_QTY) throw ApiError.badRequest(`You can add up to ${MAX_LINE_QTY} of each item`);
  if (desired > available) throw stockError(available, existing?.quantity ?? 0);

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity },
    update: { quantity: desired },
  });
  await prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  const cart = await prisma.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude });
  return { cart: serialize(cart), newSessionId };
}

async function ownedItem(owner: CartOwner, itemId: string) {
  const cart = await findCart(owner);
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) throw ApiError.notFound('Cart item not found');
  return { cart, item };
}

export async function updateItem(owner: CartOwner, itemId: string, quantity: number) {
  const { cart, item } = await ownedItem(owner, itemId);
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    const { available } = await loadPurchasableVariant(item.variantId);
    if (quantity > available) throw stockError(available);
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }
  return serialize(await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude }));
}

export async function removeItem(owner: CartOwner, itemId: string) {
  return updateItem(owner, itemId, 0);
}

export async function clearCart(owner: CartOwner) {
  const cart = await findCart(owner);
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

/**
 * Moves a guest cart into the user's cart on login/registration. Quantities are
 * summed and capped by stock; the guest cart is deleted afterwards.
 */
export async function mergeGuestCart(userId: string, sessionId: string | undefined) {
  if (!sessionId) return;
  const guest = await prisma.cart.findUnique({ where: { sessionId }, include: { items: { include: { variant: { include: { inventory: true } } } } } });
  if (!guest) return;
  if (guest.items.length === 0) {
    await prisma.cart.delete({ where: { id: guest.id } });
    return;
  }

  const { cartId } = await ensureCart({ userId });
  await prisma.$transaction(async (tx) => {
    for (const g of guest.items) {
      const inv = g.variant.inventory;
      const available = inv ? Math.max(0, inv.quantity - inv.reserved) : 0;
      const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId: g.variantId } } });
      const quantity = Math.min(MAX_LINE_QTY, Math.max(available, 1), (existing?.quantity ?? 0) + g.quantity);
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId, variantId: g.variantId } },
        create: { cartId, variantId: g.variantId, quantity },
        update: { quantity },
      });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}
