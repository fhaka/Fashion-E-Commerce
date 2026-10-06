import type { OrderStatus, Prisma, ReviewStatus, Role } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { hasFeature } from '../../middleware/plan';
import { sendBrandedEmail } from '../../providers/email/branded';
import { ApiError } from '../../utils/ApiError';
import { pageMeta, paginate } from '../../utils/helpers';
import { toOrderDetail } from '../account.service';
import { isDemoAccount } from '../demo.service';
import { cancelPendingOrder, refundOrder } from '../order.service';
import { refreshProductRating } from '../review.service';
import { REVENUE_STATUSES } from './stats.service';

/* ───────────────────────── Orders ───────────────────────── */

/** Allowed manual transitions. PENDING → PAID only ever happens through the payment provider. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export async function listOrders(q: { q?: string; status?: OrderStatus; from?: Date; to?: Date; page: number; limit: number }) {
  const where: Prisma.OrderWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: q.to } : {}) } } : {}),
    ...(q.q
      ? {
          OR: [
            { orderNumber: { contains: q.q, mode: 'insensitive' } },
            { email: { contains: q.q, mode: 'insensitive' } },
            { user: { OR: [{ firstName: { contains: q.q, mode: 'insensitive' } }, { lastName: { contains: q.q, mode: 'insensitive' } }] } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginate(q.page, q.limit),
      include: { user: { select: { firstName: true, lastName: true } }, items: { select: { quantity: true } } },
    }),
  ]);
  return {
    data: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      email: o.email,
      customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Guest',
      status: o.status,
      total: o.total,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: o.createdAt,
    })),
    meta: pageMeta(total, q.page, q.limit),
  };
}

export async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true } },
    },
  });
  if (!order) throw ApiError.notFound('Order not found');
  return {
    ...toOrderDetail(order),
    notes: order.notes,
    customer: order.user,
    payments: order.payments.map((p) => ({ id: p.id, provider: p.provider, providerRef: p.providerRef, amount: p.amount, status: p.status, createdAt: p.createdAt })),
    allowedTransitions: ORDER_TRANSITIONS[order.status],
  };
}

export async function updateOrderStatus(
  id: string,
  input: { status: OrderStatus; note?: string | null; trackingNumber?: string | null; carrier?: string | null; restock?: boolean },
  actorId: string,
) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound('Order not found');
  if (!ORDER_TRANSITIONS[order.status].includes(input.status)) {
    throw ApiError.badRequest(`Cannot change an order from ${order.status} to ${input.status}`);
  }

  if (input.status === 'CANCELLED') {
    if (order.status === 'PENDING') await cancelPendingOrder(id, input.note ?? 'Cancelled by staff', actorId);
    else await refundOrder(id, { restock: true, actorId, finalStatus: 'CANCELLED', note: input.note ?? undefined });
    return getOrder(id);
  }
  if (input.status === 'REFUNDED') {
    await refundOrder(id, { restock: input.restock ?? false, actorId, note: input.note ?? undefined });
    return getOrder(id);
  }

  const trackingNumber = input.trackingNumber ?? order.trackingNumber;
  const carrier = input.carrier ?? order.carrier;
  if (input.status === 'SHIPPED' && (!trackingNumber || !carrier)) {
    throw ApiError.validation({ fields: { trackingNumber: 'Add a carrier and tracking number before marking as shipped' } });
  }

  const defaultNotes: Partial<Record<OrderStatus, string>> = {
    PROCESSING: 'Your order is being prepared in our atelier',
    SHIPPED: `Handed to ${carrier}`,
    DELIVERED: 'Delivered',
  };
  await prisma.order.update({
    where: { id },
    data: {
      status: input.status,
      trackingNumber,
      carrier,
      ...(input.status === 'SHIPPED' ? { shippedAt: new Date() } : {}),
      ...(input.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      events: { create: { status: input.status, note: input.note || defaultNotes[input.status], actorId } },
    },
  });

  if ((input.status === 'SHIPPED' || input.status === 'DELIVERED') && hasFeature('shippingEmails')) {
    const track = { label: 'Track your order', url: `${env.WEB_URL}/track-order?orderNumber=${order.orderNumber}` };
    void sendBrandedEmail(order.email, (s) =>
      input.status === 'SHIPPED'
        ? {
            subject: `Your order ${order.orderNumber} is on its way`,
            heading: 'Your order has shipped',
            paragraphs: [`Good news: order ${order.orderNumber} is on its way with ${carrier}.`],
            rows: trackingNumber ? [{ label: 'Tracking number', value: trackingNumber }] : undefined,
            button: track,
          }
        : {
            subject: `Your order ${order.orderNumber} has been delivered`,
            heading: 'Your order has arrived',
            paragraphs: [
              `Order ${order.orderNumber} has been delivered. We hope you love it.`,
              s.returnDays > 0 ? `If anything isn't quite right, you can return it within ${s.returnDays} days.` : 'If anything is not quite right, please contact us.',
            ],
            button: { label: 'View the shop', url: `${env.WEB_URL}/shop` },
          },
    );
  }
  return getOrder(id);
}

/** Lets staff add tracking details or an internal note without changing status. */
export async function updateOrderMeta(id: string, input: { trackingNumber?: string | null; carrier?: string | null; note?: string | null }, actorId: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound('Order not found');
  await prisma.order.update({
    where: { id },
    data: {
      ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber } : {}),
      ...(input.carrier !== undefined ? { carrier: input.carrier } : {}),
      ...(input.note ? { events: { create: { status: order.status, note: input.note, actorId } } } : {}),
    },
  });
  return getOrder(id);
}

/* ───────────────────────── Customers ───────────────────────── */

export async function listCustomers(q: { q?: string; role?: Role; page: number; limit: number }) {
  const where: Prisma.UserWhereInput = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.q
      ? {
          OR: [
            { email: { contains: q.q, mode: 'insensitive' } },
            { firstName: { contains: q.q, mode: 'insensitive' } },
            { lastName: { contains: q.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginate(q.page, q.limit),
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    }),
  ]);
  const stats = await prisma.order.groupBy({
    by: ['userId'],
    where: { userId: { in: users.map((u) => u.id) }, status: { in: REVENUE_STATUSES } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
  });
  return {
    data: users.map((u) => {
      const s = stats.find((x) => x.userId === u.id);
      return { ...u, orderCount: s?._count._all ?? 0, totalSpent: s?._sum.total ?? 0, lastOrderAt: s?._max.createdAt ?? null };
    }),
    meta: pageMeta(total, q.page, q.limit),
  };
}

export async function getCustomer(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true, lastLoginAt: true,
      addresses: true,
      orders: { orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, orderNumber: true, status: true, total: true, createdAt: true } },
      reviews: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, rating: true, title: true, status: true, createdAt: true, product: { select: { name: true, slug: true } } } },
    },
  });
  if (!user) throw ApiError.notFound('Customer not found');
  const paid = user.orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const newsletter = await prisma.newsletterSubscriber.findUnique({ where: { email: user.email }, select: { status: true } });
  return {
    ...user,
    newsletter: newsletter?.status === 'SUBSCRIBED',
    stats: {
      orderCount: paid.length,
      totalSpent: paid.reduce((s, o) => s + o.total, 0),
      averageOrderValue: paid.length ? Math.round(paid.reduce((s, o) => s + o.total, 0) / paid.length) : 0,
    },
  };
}

export async function updateCustomer(id: string, input: { isActive?: boolean; role?: Role }, actorId: string) {
  if (id === actorId && (input.isActive === false || input.role === 'CUSTOMER')) {
    throw ApiError.badRequest('You cannot deactivate or demote your own account');
  }
  if (env.DEMO_MODE) {
    if (input.role !== undefined) throw ApiError.forbidden('Changing roles is disabled in the demo');
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } });
    if (input.isActive === false && target && (target.role === 'ADMIN' || isDemoAccount(target.email))) {
      throw ApiError.forbidden('Disabling this account is not allowed in the demo');
    }
  }
  const user = await prisma.user.update({ where: { id }, data: input });
  if (input.isActive === false) {
    await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  return { id: user.id, isActive: user.isActive, role: user.role };
}

/* ───────────────────────── Reviews ───────────────────────── */

export async function listReviews(q: { status?: ReviewStatus; rating?: number; q?: string; page: number; limit: number }) {
  const where: Prisma.ReviewWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { body: { contains: q.q, mode: 'insensitive' } }, { product: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      ...paginate(q.page, q.limit),
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        product: { select: { id: true, name: true, slug: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } } },
      },
    }),
  ]);
  return {
    data: rows.map((r) => ({ ...r, product: { ...r.product, image: r.product.images[0]?.url ?? null, images: undefined } })),
    meta: pageMeta(total, q.page, q.limit),
  };
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.update({ where: { id }, data: { status } });
    await refreshProductRating(review.productId, tx);
    return review;
  });
}

export async function deleteReview(id: string) {
  await prisma.$transaction(async (tx) => {
    const review = await tx.review.delete({ where: { id } });
    await refreshProductRating(review.productId, tx);
  });
}

/* ───────────────────────── Newsletter & messages ───────────────────────── */

export async function listSubscribers(q: { q?: string; status?: 'SUBSCRIBED' | 'UNSUBSCRIBED'; page: number; limit: number }) {
  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.q ? { email: { contains: q.q, mode: 'insensitive' } } : {}),
  };
  const [total, rows, subscribed] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(q.page, q.limit) }),
    prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
  ]);
  return { data: rows, meta: { ...pageMeta(total, q.page, q.limit), subscribed } };
}

export async function allSubscribersForExport() {
  return prisma.newsletterSubscriber.findMany({
    where: { status: 'SUBSCRIBED' },
    orderBy: { createdAt: 'asc' },
    select: { email: true, source: true, createdAt: true },
  });
}

export async function listMessages(page: number, limit: number) {
  const [total, rows, unread] = await Promise.all([
    prisma.contactMessage.count(),
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  return { data: rows, meta: { ...pageMeta(total, page, limit), unread } };
}

export const markMessageRead = (id: string, isRead: boolean) => prisma.contactMessage.update({ where: { id }, data: { isRead } });
