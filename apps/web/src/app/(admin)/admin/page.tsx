'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BarList, TimeSeriesChart } from '@/components/admin/charts';
import { FilterSelect, PageHeader, Panel, Pill, StatTile, Thumb } from '@/components/admin/ui';
import { StatusBadge, STATUS_LABEL } from '@/components/order/OrderParts';
import { compactMoney, formatDate, useAdminQuery } from '@/lib/admin';
import type { OrderStatus } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface Overview {
  kpis: Record<'revenue' | 'orders' | 'averageOrderValue' | 'newCustomers', { value: number; change: number }>;
  revenueSeries: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  topProducts: { productId: string; name: string; slug: string | null; image: string | null; unitsSold: number; revenue: number }[];
  lowStock: { variantId: string; sku: string; productId: string; productName: string; size: string; color: string; available: number; lowStockThreshold: number }[];
  recentOrders: { id: string; orderNumber: string; customer: string; email: string; status: OrderStatus; total: number; createdAt: string }[];
  pendingReviews: number;
}

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export default function DashboardPage() {
  const [range, setRange] = useState('30');
  const { data, loading, error } = useAdminQuery<Overview>('/admin/stats/overview', { range });
  const period = `previous ${range} days`;
  const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <>
      <PageHeader title="Dashboard" description="How the store is performing." actions={<FilterSelect label="Period" value={range} onChange={setRange} options={RANGES} />} />
      {error && <p className="mb-6 text-sm text-sale">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {data ? (
          <>
            <StatTile label="Revenue" value={formatMoney(data.kpis.revenue.value)} change={data.kpis.revenue.change} period={period} />
            <StatTile label="Orders" value={data.kpis.orders.value.toLocaleString('en-US')} change={data.kpis.orders.change} period={period} />
            <StatTile label="Average order value" value={formatMoney(data.kpis.averageOrderValue.value)} change={data.kpis.averageOrderValue.change} period={period} />
            <StatTile label="New customers" value={data.kpis.newCustomers.value.toLocaleString('en-US')} change={data.kpis.newCustomers.change} period={period} />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)
        )}
      </div>

      <div className={loading && data ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <div className="mb-6 grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            {data ? (
              <TimeSeriesChart
                title="Revenue"
                subtitle={`Paid orders per day · ${RANGES.find((r) => r.value === range)?.label.toLowerCase()}`}
                points={data.revenueSeries.map((p) => ({ label: dayLabel(p.date), value: p.revenue }))}
                format={(v) => formatMoney(v)}
                formatAxis={compactMoney}
              />
            ) : (
              <div className="skeleton h-80" />
            )}
          </div>
          {data ? (
            <BarList
              title="Orders by status"
              subtitle="Orders placed in this period"
              items={[...data.ordersByStatus].sort((a, b) => b.count - a.count).map((s) => ({ label: STATUS_LABEL[s.status], value: s.count }))}
              format={(v) => v.toLocaleString('en-US')}
            />
          ) : (
            <div className="skeleton h-80" />
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel
            title="Recent orders"
            className="xl:col-span-2"
            bodyClassName="p-0"
            actions={
              <Link href="/admin/orders" className="flex items-center gap-1 text-xs text-stone-600 hover:text-ink">
                All orders <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <ul className="divide-y divide-stone-200">
              {(data?.recentOrders ?? []).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-stone-100/60">
                    <span className="w-28 font-medium tabular-nums">{o.orderNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-stone-600">{o.customer}</span>
                    <StatusBadge status={o.status} />
                    <span className="w-24 text-right tabular-nums">{formatMoney(o.total)}</span>
                    <span className="hidden w-28 text-right text-xs text-stone-500 md:inline">{formatDate(o.createdAt)}</span>
                  </Link>
                </li>
              ))}
              {!data && <li className="p-5"><div className="skeleton h-40" /></li>}
            </ul>
          </Panel>

          <div className="space-y-6">
            {data && data.pendingReviews > 0 && (
              <Link href="/admin/reviews" className="flex items-center justify-between border border-camel/40 bg-camel/10 px-5 py-4 text-sm hover:bg-camel/15">
                <span>
                  <strong className="font-medium">{data.pendingReviews}</strong> review{data.pendingReviews === 1 ? '' : 's'} awaiting moderation
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Panel title="Top products" bodyClassName="p-0">
              <ul className="divide-y divide-stone-200">
                {(data?.topProducts ?? []).map((p, i) => (
                  <li key={p.productId ?? i} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <Thumb src={p.image} alt={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{p.name}</p>
                      <p className="text-xs text-stone-500">{p.unitsSold} sold</p>
                    </div>
                    <span className="tabular-nums">{formatMoney(p.revenue)}</span>
                  </li>
                ))}
                {data && data.topProducts.length === 0 && <li className="px-5 py-6 text-center text-sm text-stone-500">No sales in this period.</li>}
              </ul>
            </Panel>
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-camel-dark" aria-hidden /> Low stock
                </span>
              }
              bodyClassName="p-0"
              actions={
                <Link href="/admin/inventory?filter=low" className="flex items-center gap-1 text-xs text-stone-600 hover:text-ink">
                  Inventory <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              <ul className="divide-y divide-stone-200">
                {(data?.lowStock ?? []).map((v) => (
                  <li key={v.variantId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{v.productName}</span>
                      <span className="text-xs text-stone-500">
                        {v.color} · {v.size}
                      </span>
                    </span>
                    {v.available === 0 ? <Pill tone="bad">Sold out</Pill> : <Pill tone="warn">{v.available} left</Pill>}
                  </li>
                ))}
                {data && data.lowStock.length === 0 && <li className="px-5 py-6 text-center text-sm text-stone-500">All variants are well stocked.</li>}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
