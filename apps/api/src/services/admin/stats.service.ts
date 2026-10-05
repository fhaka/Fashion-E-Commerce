import { Prisma, type OrderStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';

/** Orders that represent real revenue. */
export const REVENUE_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const revenueStatusSql = Prisma.sql`"status"::text IN (${Prisma.join(REVENUE_STATUSES)})`;

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

async function periodSummary(from: Date, to: Date) {
  const [agg, customers] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: from, lt: to } } }),
  ]);
  const revenue = agg._sum.total ?? 0;
  const orders = agg._count;
  return { revenue, orders, averageOrderValue: orders ? Math.round(revenue / orders) : 0, newCustomers: customers };
}

const delta = (current: number, previous: number) => (previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10);

export async function overview(rangeDays: number) {
  const now = new Date();
  const to = new Date(startOfDay(now).getTime() + DAY);
  const from = new Date(to.getTime() - rangeDays * DAY);
  const prevFrom = new Date(from.getTime() - rangeDays * DAY);

  const [current, previous, series, byStatus, topProducts, lowStock, recentOrders, pendingReviews] = await Promise.all([
    periodSummary(from, to),
    periodSummary(prevFrom, from),
    prisma.$queryRaw<{ day: Date; revenue: bigint | null; orders: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, SUM("total") AS revenue, COUNT(*) AS orders
      FROM "Order" WHERE ${revenueStatusSql} AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1 ORDER BY 1`,
    prisma.order.groupBy({ by: ['status'], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    }),
    lowStockVariants(8),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, orderNumber: true, email: true, status: true, total: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.review.count({ where: { status: 'PENDING' } }),
  ]);

  // Fill gaps so charts get one point per day.
  const byDay = new Map(series.map((r) => [startOfDay(r.day).toISOString().slice(0, 10), r]));
  const revenueSeries = Array.from({ length: rangeDays }, (_, i) => {
    const key = new Date(from.getTime() + i * DAY).toISOString().slice(0, 10);
    const row = byDay.get(key);
    return { date: key, revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
  });

  const productImages = await prisma.product.findMany({
    where: { id: { in: topProducts.map((t) => t.productId).filter((x): x is string => !!x) } },
    select: { id: true, slug: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } },
  });

  return {
    range: { from, to, days: rangeDays },
    kpis: {
      revenue: { value: current.revenue, change: delta(current.revenue, previous.revenue) },
      orders: { value: current.orders, change: delta(current.orders, previous.orders) },
      averageOrderValue: { value: current.averageOrderValue, change: delta(current.averageOrderValue, previous.averageOrderValue) },
      newCustomers: { value: current.newCustomers, change: delta(current.newCustomers, previous.newCustomers) },
    },
    revenueSeries,
    ordersByStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
    topProducts: topProducts.map((t) => {
      const p = productImages.find((x) => x.id === t.productId);
      return { productId: t.productId, name: t.productName, slug: p?.slug ?? null, image: p?.images[0]?.url ?? null, unitsSold: t._sum.quantity ?? 0, revenue: t._sum.lineTotal ?? 0 };
    }),
    lowStock,
    recentOrders: recentOrders.map((o) => ({ ...o, customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Guest', user: undefined })),
    pendingReviews,
  };
}

export async function lowStockVariants(limit = 50) {
  const rows = await prisma.$queryRaw<
    { variantId: string; sku: string; quantity: number; reserved: number; lowStockThreshold: number; productId: string; productName: string; size: string; color: string }[]
  >`
    SELECT i."variantId", v."sku", i."quantity", i."reserved", i."lowStockThreshold",
           p."id" AS "productId", p."name" AS "productName", s."label" AS "size", c."name" AS "color"
    FROM "Inventory" i
    JOIN "ProductVariant" v ON v."id" = i."variantId"
    JOIN "Product" p ON p."id" = v."productId"
    JOIN "Size" s ON s."id" = v."sizeId"
    JOIN "Color" c ON c."id" = v."colorId"
    WHERE p."status" <> 'ARCHIVED' AND v."isActive" = true AND i."quantity" - i."reserved" <= i."lowStockThreshold"
    ORDER BY i."quantity" - i."reserved" ASC, p."name" ASC
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, available: Math.max(0, r.quantity - r.reserved) }));
}

/* ───────────────────────── Sales report ───────────────────────── */

const GROUP_UNITS = { day: 'day', week: 'week', month: 'month' } as const;

export async function salesReport(from: Date, to: Date, groupBy: keyof typeof GROUP_UNITS) {
  const unit = Prisma.raw(`'${GROUP_UNITS[groupBy]}'`); // whitelisted above — never user text
  const [periods, categories, totals] = await Promise.all([
    prisma.$queryRaw<
      { period: Date; orders: bigint; revenue: bigint | null; discounts: bigint | null; shipping: bigint | null; tax: bigint | null; subtotal: bigint | null }[]
    >`
      SELECT date_trunc(${unit}, "createdAt") AS period, COUNT(*) AS orders, SUM("total") AS revenue,
             SUM("discountTotal") AS discounts, SUM("shippingTotal") AS shipping, SUM("taxTotal") AS tax, SUM("subtotal") AS subtotal
      FROM "Order" WHERE ${revenueStatusSql} AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ category: string; units: bigint; revenue: bigint }[]>`
      SELECT COALESCE(cat."name", 'Uncategorised') AS category, SUM(oi."quantity") AS units, SUM(oi."lineTotal") AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      LEFT JOIN "Product" p ON p."id" = oi."productId"
      LEFT JOIN "Category" cat ON cat."id" = p."categoryId"
      WHERE o."status"::text IN (${Prisma.join(REVENUE_STATUSES)}) AND o."createdAt" >= ${from} AND o."createdAt" < ${to}
      GROUP BY 1 ORDER BY 3 DESC`,
    prisma.orderItem.aggregate({
      where: { order: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } } },
      _sum: { quantity: true },
    }),
  ]);

  const rows = periods.map((p) => ({
    period: p.period.toISOString().slice(0, 10),
    orders: Number(p.orders),
    grossSales: Number(p.subtotal ?? 0),
    discounts: Number(p.discounts ?? 0),
    shipping: Number(p.shipping ?? 0),
    tax: Number(p.tax ?? 0),
    revenue: Number(p.revenue ?? 0),
  }));
  const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
  return {
    from,
    to,
    groupBy,
    rows,
    totals: {
      orders: sum('orders'),
      grossSales: sum('grossSales'),
      discounts: sum('discounts'),
      shipping: sum('shipping'),
      tax: sum('tax'),
      revenue: sum('revenue'),
      unitsSold: totals._sum.quantity ?? 0,
    },
    byCategory: categories.map((c) => ({ category: c.category, units: Number(c.units), revenue: Number(c.revenue) })),
  };
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (typeof v === 'number') return String(v);
    let s = v instanceof Date ? v.toISOString() : String(v ?? '');
    // Neutralise spreadsheet formula injection in text cells.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}
