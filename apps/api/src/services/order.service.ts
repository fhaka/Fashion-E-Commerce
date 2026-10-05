import crypto from 'node:crypto';
import { Prisma, type Coupon, type OrderStatus } from '@prisma/client';
import { CURRENCY, formatMoney, type CheckoutInput, type QuoteInput } from '@maison/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma, type Tx } from '../db/prisma';
import { getPaymentProvider } from '../providers/payment';
import { sendEmail } from '../providers/email';
import { ApiError } from '../utils/ApiError';
import { addMinutes } from '../utils/helpers';
import { revalidateStorefront } from '../utils/revalidate';
import type { CartOwner } from './cart.service';
import { computeTotals, describeCoupon, priceLines, validateCoupon, type PricedLine } from './pricing.service';
import { toOrderDetail } from './account.service';

const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateOrderNumber() {
  const bytes = crypto.randomBytes(8);
  return 'MS-' + Array.from(bytes, (b) => ORDER_ALPHABET[b % ORDER_ALPHABET.length]).join('');
}

const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

/* ───────────────────────── Item resolution ───────────────────────── */

async function resolveItems(owner: CartOwner, items?: { variantId: string; quantity: number }[]) {
  if (items?.length) return { items, cartId: null as string | null };
  const cart = owner.userId
    ? await prisma.cart.findUnique({ where: { userId: owner.userId }, include: { items: true } })
    : owner.sessionId
      ? await prisma.cart.findUnique({ where: { sessionId: owner.sessionId }, include: { items: true } })
      : null;
  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your bag is empty');
  return { items: cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), cartId: cart.id };
}

/* ───────────────────────── Quote ───────────────────────── */

export async function quote(owner: CartOwner, input: QuoteInput, email?: string) {
  const { items } = await resolveItems(owner, input.items);
  const lines = await priceLines(items);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let coupon: Coupon | null = null;
  let couponError: string | null = null;
  if (input.couponCode) {
    try {
      coupon = await validateCoupon(input.couponCode, subtotal, { userId: owner.userId, email });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_COUPON') couponError = err.message;
      else throw err;
    }
  }
  return {
    lines,
    coupon: coupon ? describeCoupon(coupon) : null,
    couponError,
    shippingMethod: input.shippingMethod,
    ...computeTotals(lines, input.shippingMethod, coupon),
  };
}

/* ───────────────────────── Inventory primitives ───────────────────────── */

/** Atomically reserves stock; fails if available (quantity - reserved) is insufficient. */
async function reserve(tx: Tx, lines: PricedLine[]) {
  for (const l of lines) {
    const updated = await tx.$executeRaw`
      UPDATE "Inventory" SET "reserved" = "reserved" + ${l.quantity}, "updatedAt" = NOW()
      WHERE "variantId" = ${l.variantId} AND "quantity" - "reserved" >= ${l.quantity}`;
    if (updated !== 1) {
      throw new ApiError(409, 'STOCK_CHANGED', `Sorry, ${l.productName} (${l.variantLabel}) just sold out`, {
        items: { [l.variantId]: 'Sold out' },
      });
    }
  }
}

async function releaseReservation(tx: Tx, items: { variantId: string | null; quantity: number }[]) {
  for (const i of items) {
    if (!i.variantId) continue;
    await tx.$executeRaw`
      UPDATE "Inventory" SET "reserved" = GREATEST("reserved" - ${i.quantity}, 0), "updatedAt" = NOW()
      WHERE "variantId" = ${i.variantId}`;
  }
}

async function lockOrder(tx: Tx, orderId: string) {
  // Row lock so concurrent webhooks / admin actions on one order are serialised.
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payments: true } });
}

/* ───────────────────────── Create order ───────────────────────── */

export async function createOrder(owner: CartOwner, input: CheckoutInput) {
  const { items, cartId } = await resolveItems(owner, input.items);
  const lines = await priceLines(items);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const coupon = input.couponCode ? await validateCoupon(input.couponCode, subtotal, { userId: owner.userId, email: input.email }) : null;
  const totals = computeTotals(lines, input.shippingMethod, coupon);

  const shippingAddress = { ...input.shippingAddress };
  const billingAddress = input.billingSameAsShipping || !input.billingAddress ? shippingAddress : { ...input.billingAddress };

  const order = await prisma.$transaction(async (tx) => {
    await reserve(tx, lines);

    let orderNumber = generateOrderNumber();
    while (await tx.order.findUnique({ where: { orderNumber }, select: { id: true } })) orderNumber = generateOrderNumber();

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: owner.userId ?? null,
        email: input.email,
        status: 'PENDING',
        currency: CURRENCY,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shippingTotal: totals.shippingTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        shippingMethod: input.shippingMethod,
        shippingAddress: shippingAddress as Prisma.InputJsonValue,
        billingAddress: billingAddress as Prisma.InputJsonValue,
        couponId: coupon?.id,
        couponCode: coupon?.code,
        notes: input.notes ?? null,
        cartId,
        reservationExpiresAt: addMinutes(new Date(), env.ORDER_RESERVATION_MINUTES),
        items: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            productId: l.productId,
            productName: l.productName,
            productSlug: l.productSlug,
            variantLabel: l.variantLabel,
            sku: l.sku,
            image: l.image,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
          })),
        },
        events: { create: { status: 'PENDING', note: 'Order placed' } },
      },
    });

    if (owner.userId && input.saveAddress) {
      const count = await tx.address.count({ where: { userId: owner.userId } });
      if (count < 10) {
        await tx.address.create({ data: { ...input.shippingAddress, userId: owner.userId, label: 'Checkout', isDefault: count === 0 } });
      }
    }
    return created;
  });

  const provider = getPaymentProvider();
  try {
    const payment = await provider.createPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency,
      email: order.email,
    });
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        providerRef: payment.providerRef,
        clientSecret: payment.clientSecret,
        amount: order.total,
        currency: order.currency,
      },
    });
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      currency: order.currency,
      reservationExpiresAt: order.reservationExpiresAt,
      payment: { provider: provider.name, clientSecret: payment.clientSecret },
    };
  } catch (err) {
    logger.error({ err, orderId: order.id }, 'Payment initialisation failed; releasing reservation');
    await cancelPendingOrder(order.id, 'Payment could not be initialised');
    throw new ApiError(502, 'PAYMENT_UNAVAILABLE', 'We could not start the payment. Please try again in a moment.');
  }
}

/* ───────────────────────── Payment success ───────────────────────── */

/** Idempotent: safe to call repeatedly (e.g. webhook retries). */
export async function markOrderPaid(orderId: string, providerRef?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (order.status !== 'PENDING') {
      if (order.status === 'CANCELLED') {
        logger.error({ orderId, providerRef }, 'Payment succeeded for a cancelled order — refund required');
      }
      return null;
    }

    for (const item of order.items) {
      if (!item.variantId) continue;
      await tx.$executeRaw`
        UPDATE "Inventory"
        SET "quantity" = GREATEST("quantity" - ${item.quantity}, 0),
            "reserved" = GREATEST("reserved" - ${item.quantity}, 0),
            "updatedAt" = NOW()
        WHERE "variantId" = ${item.variantId}`;
      await tx.inventoryMovement.create({
        data: { variantId: item.variantId, delta: -item.quantity, reason: 'SALE', orderId: order.id, note: order.orderNumber },
      });
      if (item.productId) {
        await tx.product.updateMany({ where: { id: item.productId }, data: { salesCount: { increment: item.quantity } } });
      }
    }

    await tx.payment.updateMany({
      where: { orderId, status: 'PENDING', ...(providerRef ? { providerRef } : {}) },
      data: { status: 'SUCCEEDED' },
    });
    if (order.couponId) {
      await tx.couponRedemption.create({ data: { couponId: order.couponId, orderId, userId: order.userId, email: order.email } });
      await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    }
    if (order.cartId) {
      await tx.cartItem.deleteMany({
        where: { cartId: order.cartId, variantId: { in: order.items.map((i) => i.variantId).filter((v): v is string => !!v) } },
      });
    }
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paidAt: new Date(), reservationExpiresAt: null, events: { create: { status: 'PAID', note: 'Payment confirmed' } } },
      include: { items: true },
    });
    return updated;
  });

  if (result) {
    // Stock changed: refresh those product pages.
    revalidateStorefront(result.items.map((i) => i.productSlug).filter((x): x is string => !!x).map((slug) => `product:${slug}`));
    void sendEmail({
      to: result.email,
      subject: `Order confirmed — ${result.orderNumber}`,
      text: [
        'Thank you for your order.',
        '',
        ...result.items.map((i) => `${i.quantity} × ${i.productName} (${i.variantLabel}) — ${formatMoney(i.lineTotal)}`),
        '',
        `Total: ${formatMoney(result.total)}`,
        `Track your order: ${env.WEB_URL}/track-order?orderNumber=${result.orderNumber}`,
      ].join('\n'),
    });
  }
  return result;
}

export async function recordPaymentFailure(providerRef: string, reason: string) {
  await prisma.payment.updateMany({
    where: { providerRef, status: 'PENDING' },
    data: { raw: { lastError: reason } as Prisma.InputJsonValue },
  });
}

/* ───────────────────────── Cancellation & expiry ───────────────────────── */

export async function cancelPendingOrder(orderId: string, reason: string, actorId?: string) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (order.status !== 'PENDING') return null;
    await releaseReservation(tx, order.items);
    await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        reservationExpiresAt: null,
        events: { create: { status: 'CANCELLED', note: reason, actorId } },
      },
      include: { payments: true },
    });
  });
  if (cancelled) {
    const provider = getPaymentProvider();
    for (const p of cancelled.payments) {
      if (p.providerRef && p.provider === provider.name) {
        await provider.cancelPayment(p.providerRef).catch((err) => logger.warn({ err }, 'Could not cancel provider payment'));
      }
    }
  }
  return cancelled;
}

/** Releases stock held by abandoned checkouts. Runs on an interval from server.ts. */
export async function expireStaleReservations() {
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING', reservationExpiresAt: { lt: new Date() } },
    select: { id: true },
    take: 100,
  });
  for (const o of stale) await cancelPendingOrder(o.id, 'Checkout expired — reserved stock released');
  return stale.length;
}

/**
 * Refunds a paid order through the payment provider. Optionally restocks items.
 * `finalStatus` is REFUNDED (after delivery/return) or CANCELLED (before shipping).
 */
export async function refundOrder(orderId: string, opts: { restock: boolean; actorId?: string; finalStatus?: 'REFUNDED' | 'CANCELLED'; note?: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } });
  if (!order) throw ApiError.notFound('Order not found');
  if (!PAID_STATUSES.includes(order.status)) throw ApiError.badRequest(`A ${order.status.toLowerCase()} order cannot be refunded`);

  const payment = order.payments.find((p) => p.status === 'SUCCEEDED');
  const provider = getPaymentProvider();
  let refundRef: string | null = null;
  if (payment?.providerRef && payment.provider === provider.name) {
    refundRef = (await provider.refund(payment.providerRef)).refundRef;
  }

  const finalStatus = opts.finalStatus ?? 'REFUNDED';
  await prisma.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', raw: { refundRef } as Prisma.InputJsonValue },
      });
    }
    if (opts.restock) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.inventory.updateMany({ where: { variantId: item.variantId }, data: { quantity: { increment: item.quantity } } });
        await tx.inventoryMovement.create({
          data: { variantId: item.variantId, delta: item.quantity, reason: 'RETURN', orderId, actorId: opts.actorId, note: `${finalStatus.toLowerCase()} ${order.orderNumber}` },
        });
      }
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: finalStatus,
        ...(finalStatus === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
        events: {
          create: {
            status: finalStatus,
            actorId: opts.actorId,
            note: opts.note ?? (finalStatus === 'CANCELLED' ? 'Order cancelled and refunded' : `Refund of ${formatMoney(order.total)} issued`),
          },
        },
      },
    });
  });

  if (opts.restock) revalidateStorefront(order.items.map((i) => i.productSlug).filter((x): x is string => !!x).map((slug) => `product:${slug}`));
  void sendEmail({
    to: order.email,
    subject: `Your refund for ${order.orderNumber}`,
    text: `We have issued a refund of ${formatMoney(order.total)} to your original payment method. It may take 5–10 business days to appear.`,
  });
}

/* ───────────────────────── Demo payment confirmation ───────────────────────── */

function secretsMatch(a: string | null, b: string) {
  if (!a) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * DEMO MODE ONLY. Simulates the customer completing payment with the mock provider.
 * The storefront decides the outcome from the test card entered (no card data is sent).
 */
export async function confirmMockPayment(orderNumber: string, clientSecret: string, outcome: 'success' | 'decline') {
  if (getPaymentProvider().name !== 'mock') throw ApiError.notFound();
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { payments: true } });
  const payment = order?.payments.find((p) => secretsMatch(p.clientSecret, clientSecret));
  if (!order || !payment) throw ApiError.notFound('Order not found');

  if (order.status !== 'PENDING') {
    if (PAID_STATUSES.includes(order.status)) return { status: order.status };
    throw ApiError.badRequest('This checkout has expired. Please return to your bag and try again.');
  }
  if (outcome === 'decline') {
    await recordPaymentFailure(payment.providerRef!, 'card_declined');
    throw new ApiError(402, 'CARD_DECLINED', 'Your card was declined. Please try another card.');
  }
  const paid = await markOrderPaid(order.id, payment.providerRef ?? undefined);
  return { status: paid?.status ?? 'PAID' };
}

/**
 * Lets the storefront abandon its own unpaid order (e.g. the shopper edited their details after a
 * declined card) so the reserved stock is released immediately rather than after the expiry window.
 */
export async function abandonPendingOrder(orderNumber: string, clientSecret: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { payments: true } });
  if (!order || !order.payments.some((p) => secretsMatch(p.clientSecret, clientSecret))) throw ApiError.notFound('Order not found');
  if (order.status !== 'PENDING') return { status: order.status };
  await cancelPendingOrder(order.id, 'Checkout updated by customer — reservation released');
  return { status: 'CANCELLED' as const };
}

/* ───────────────────────── Confirmation page ───────────────────────── */

export async function getConfirmation(orderNumber: string, opts: { key?: string; userId?: string }) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, events: { orderBy: { createdAt: 'asc' } }, payments: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) throw ApiError.notFound('Order not found');
  const owns = opts.userId && order.userId === opts.userId;
  const hasKey = opts.key && order.payments.some((p) => secretsMatch(p.clientSecret, opts.key!));
  if (!owns && !hasKey) throw ApiError.notFound('Order not found');
  return toOrderDetail(order);
}
