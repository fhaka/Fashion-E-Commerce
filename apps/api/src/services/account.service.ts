import type { Prisma } from '@prisma/client';
import type { AddressInput, UpdateProfileInput } from '@maison/shared';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { pageMeta, paginate } from '../utils/helpers';
import { toPublicUser } from './auth.service';

const MAX_ADDRESSES = 10;

/* ───────────────────────── Profile ───────────────────────── */

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return toPublicUser(user);
}

/* ───────────────────────── Addresses ───────────────────────── */

export function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
}

export async function createAddress(userId: string, input: AddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses`);
  const isDefault = input.isDefault || count === 0;
  return prisma.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, isDefault, userId } });
  });
}

async function ownedAddress(userId: string, id: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw ApiError.notFound('Address not found');
  return address;
}

export async function updateAddress(userId: string, id: string, input: AddressInput) {
  const current = await ownedAddress(userId, id);
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId, id: { not: id } }, data: { isDefault: false } });
    // An address can't be "un-defaulted" directly — choose another default instead.
    return tx.address.update({ where: { id }, data: { ...input, isDefault: input.isDefault || current.isDefault } });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const address = await ownedAddress(userId, id);
  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (address.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}

/* ───────────────────────── Orders ───────────────────────── */

const orderDetailInclude = {
  items: true,
  events: { orderBy: { createdAt: 'asc' } },
  payments: { select: { provider: true, status: true, amount: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export function toOrderDetail(o: OrderDetailRow) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    email: o.email,
    status: o.status,
    currency: o.currency,
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    shippingTotal: o.shippingTotal,
    taxTotal: o.taxTotal,
    total: o.total,
    couponCode: o.couponCode,
    shippingMethod: o.shippingMethod,
    shippingAddress: o.shippingAddress,
    billingAddress: o.billingAddress,
    trackingNumber: o.trackingNumber,
    carrier: o.carrier,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    shippedAt: o.shippedAt,
    deliveredAt: o.deliveredAt,
    cancelledAt: o.cancelledAt,
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      productSlug: i.productSlug,
      variantLabel: i.variantLabel,
      sku: i.sku,
      image: i.image,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    timeline: o.events.map((e) => ({ status: e.status, note: e.note, at: e.createdAt })),
    payment: o.payments[0] ? { provider: o.payments[0].provider, status: o.payments[0].status } : null,
  };
}

export async function listOrders(userId: string, page: number, limit: number) {
  const where = { userId };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginate(page, limit),
      include: { items: { select: { image: true, productName: true, quantity: true } } },
    }),
  ]);
  return {
    data: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      previewImages: o.items.slice(0, 4).map((i) => ({ url: i.image, alt: i.productName })),
    })),
    meta: pageMeta(total, page, limit),
  };
}

export async function getOrder(userId: string, orderNumber: string) {
  const order = await prisma.order.findFirst({ where: { userId, orderNumber }, include: orderDetailInclude });
  if (!order) throw ApiError.notFound('Order not found');
  return toOrderDetail(order);
}

/** Public tracking for guests: both the order number and email must match. */
export async function trackOrder(orderNumber: string, email: string) {
  const order = await prisma.order.findFirst({
    where: { orderNumber, email: { equals: email, mode: 'insensitive' } },
    include: orderDetailInclude,
  });
  if (!order) throw ApiError.notFound('We could not find an order with those details');
  const detail = toOrderDetail(order);
  // Guests see a reduced address (city/country only) for privacy.
  const addr = (order.shippingAddress ?? {}) as Record<string, string | null>;
  return { ...detail, shippingAddress: { city: addr.city, country: addr.country }, billingAddress: null };
}
