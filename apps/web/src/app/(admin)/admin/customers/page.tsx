'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DataTable, FilterSelect, PageHeader, Pagination, Pill, SearchInput, type Column } from '@/components/admin/ui';
import { formatDate, useAdminQuery } from '@/lib/admin';
import { formatMoney } from '@/lib/utils';

interface Row {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export default function CustomersPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading } = useAdminQuery<Row[]>('/admin/customers', { q: q || undefined, role: role || undefined, page, limit: 25 });

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (c) => (
        <span>
          <span className="block font-medium">
            {c.firstName} {c.lastName}
          </span>
          <span className="text-xs text-stone-500">{c.email}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Account',
      cell: (c) => (
        <span className="flex gap-1">
          {c.role === 'ADMIN' && <Pill tone="dark">Admin</Pill>}
          {!c.isActive && <Pill tone="bad">Disabled</Pill>}
          {c.isActive && c.role !== 'ADMIN' && <Pill>Customer</Pill>}
        </span>
      ),
    },
    { key: 'orders', header: 'Orders', align: 'right', cell: (c) => c.orderCount },
    { key: 'spent', header: 'Total spent', align: 'right', cell: (c) => formatMoney(c.totalSpent) },
    { key: 'last', header: 'Last order', cell: (c) => <span className="text-stone-600">{c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}</span> },
    { key: 'since', header: 'Joined', cell: (c) => <span className="text-stone-600">{formatDate(c.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Customers" description="Accounts, lifetime value and access." />
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name or email" />
        <FilterSelect label="Role" value={role} onChange={(v) => { setRole(v); setPage(1); }} options={[{ value: '', label: 'All' }, { value: 'CUSTOMER', label: 'Customers' }, { value: 'ADMIN', label: 'Admins' }]} />
      </div>
      <DataTable columns={columns} rows={data} rowKey={(c) => c.id} loading={loading} onRowClick={(c) => router.push(`/admin/customers/${c.id}`)} empty="No customers match." />
      {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
    </>
  );
}
