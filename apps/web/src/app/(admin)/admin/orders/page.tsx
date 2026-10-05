'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DataTable, PageHeader, Pagination, SearchInput, Tabs, type Column } from '@/components/admin/ui';
import { StatusBadge } from '@/components/order/OrderParts';
import { formatDate, useAdminQuery } from '@/lib/admin';
import type { OrderStatus } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface Row {
  id: string;
  orderNumber: string;
  email: string;
  customer: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
}

const TABS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PAID', label: 'To fulfil' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PENDING', label: 'Awaiting payment' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function OrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  // "To" is inclusive in the UI; the API filter is exclusive, so send the following midnight.
  const toExclusive = to ? new Date(new Date(`${to}T00:00:00`).getTime() + 86_400_000).toISOString() : undefined;
  const fromIso = from ? new Date(`${from}T00:00:00`).toISOString() : undefined;
  const { data, meta, loading } = useAdminQuery<Row[]>('/admin/orders', { status: status || undefined, q: q || undefined, from: fromIso, to: toExclusive, page, limit: 25 });

  const columns: Column<Row>[] = [
    { key: 'num', header: 'Order', cell: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: 'date', header: 'Date', cell: (o) => <span className="text-stone-600">{formatDate(o.createdAt, true)}</span> },
    {
      key: 'customer',
      header: 'Customer',
      cell: (o) => (
        <span>
          <span className="block">{o.customer}</span>
          <span className="text-xs text-stone-500">{o.email}</span>
        </span>
      ),
    },
    { key: 'items', header: 'Items', cell: (o) => o.itemCount, align: 'right' },
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
    { key: 'total', header: 'Total', cell: (o) => formatMoney(o.total), align: 'right' },
  ];

  return (
    <>
      <PageHeader title="Orders" description="Fulfil, track and refund customer orders." />
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={TABS} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Order number, email or name" />
        <label className="flex h-10 items-center gap-2 border border-stone-300 bg-paper px-3 text-sm">
          <span className="text-stone-500">From</span>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="bg-transparent outline-none" />
        </label>
        <label className="flex h-10 items-center gap-2 border border-stone-300 bg-paper px-3 text-sm">
          <span className="text-stone-500">To</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="bg-transparent outline-none" />
        </label>
      </div>
      <DataTable columns={columns} rows={data} rowKey={(o) => o.id} loading={loading} onRowClick={(o) => router.push(`/admin/orders/${o.id}`)} empty="No orders match these filters." />
      {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
    </>
  );
}
