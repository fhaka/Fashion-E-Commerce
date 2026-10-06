'use client';

import { History } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { DataTable, PageHeader, Pagination, Pill, SearchInput, Tabs, Thumb, type Column } from '@/components/admin/ui';
import { useSite } from '@/components/layout/SiteProvider';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { formatDate, useAdminQuery } from '@/lib/admin';
import { api, ApiRequestError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/stores/toast';

interface Row {
  variantId: string;
  sku: string;
  productId: string;
  productName: string;
  image: string | null;
  size: string;
  color: { name: string; hex: string };
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
}
interface Movement { id: string; delta: number; reason: string; note: string | null; orderId: string | null; createdAt: string }

function InventoryInner() {
  const params = useSearchParams();
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>((params.get('filter') as 'low' | 'out') ?? 'all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<Row | null>(null);
  const { data, meta, loading, setData } = useAdminQuery<Row[]>('/admin/inventory', { filter, q: q || undefined, page, limit: 30 });

  const { features } = useSite();
  const columns: Column<Row>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (r) => (
        <Link href={`/admin/products/${r.productId}`} className="flex items-center gap-3 hover:underline">
          <Thumb src={r.image} alt={r.productName} />
          <span className="min-w-0">
            <span className="block truncate">{r.productName}</span>
            <span className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-stone-300" style={{ backgroundColor: r.color.hex }} />
              {r.color.name} · {r.size}
            </span>
          </span>
        </Link>
      ),
    },
    { key: 'sku', header: 'SKU', cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      cell: (r) =>
        r.available === 0 ? <Pill tone="bad">Sold out</Pill> : r.available <= r.lowStockThreshold ? <Pill tone="warn">{r.available} · low</Pill> : <span>{r.available}</span>,
    },
    { key: 'reserved', header: 'Held', align: 'right', cell: (r) => (r.reserved ? <span title="Held by unpaid checkouts">{r.reserved}</span> : <span className="text-stone-300">0</span>) },
    { key: 'adjust', header: 'On hand', cell: (r) => <StockEditor row={r} onSaved={(u) => setData((rows) => rows?.map((x) => (x.variantId === r.variantId ? { ...x, ...u } : x)) ?? rows)} /> },
    // The stock audit trail is part of the Premium plan.
    ...(features.inventoryHistory
      ? [
          {
            key: 'history',
            header: <span className="sr-only">History</span>,
            cell: (r: Row) => (
              <button type="button" onClick={() => setHistory(r)} className="flex items-center gap-1 text-xs text-stone-500 hover:text-ink" aria-label={`Stock history for ${r.sku}`}>
                <History className="h-3.5 w-3.5" /> History
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Inventory" description="Stock on hand per variant. Every change is recorded with who made it and why." />
      <Tabs
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
        tabs={[
          { value: 'all', label: 'All variants' },
          { value: 'low', label: 'Low stock' },
          { value: 'out', label: 'Sold out' },
        ]}
      />
      <div className="mb-4">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Product name or SKU" />
      </div>
      <DataTable columns={columns} rows={data} rowKey={(r) => r.variantId} loading={loading} empty="No variants match." />
      {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
      <HistoryDrawer row={history} onClose={() => setHistory(null)} />
    </>
  );
}

export default function InventoryPage() {
  return (
    <Suspense>
      <InventoryInner />
    </Suspense>
  );
}

function StockEditor({ row, onSaved }: { row: Row; onSaved: (u: Partial<Row>) => void }) {
  const [value, setValue] = useState(String(row.quantity));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = Number(value) !== row.quantity;

  const save = async () => {
    setSaving(true);
    try {
      const res = await api<{ quantity: number; reserved: number; available: number }>(`/admin/inventory/${row.variantId}`, {
        method: 'PATCH',
        body: { quantity: Number(value), note: note || (Number(value) > row.quantity ? 'Restock' : 'Stock count adjustment') },
      });
      onSaved({ quantity: res.quantity, reserved: res.reserved, available: res.available });
      setNote('');
      toast.success(`${row.sku} updated to ${res.quantity}`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? Object.values(err.fieldErrors)[0] ?? err.message : 'Could not update');
      setValue(String(row.quantity));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) void save();
      }}
    >
      <input
        aria-label={`Stock for ${row.sku}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        className={cn('h-8 w-16 border bg-transparent px-2 text-right text-sm outline-none focus:border-ink', dirty ? 'border-ink' : 'border-stone-300')}
      />
      {dirty && (
        <>
          <input aria-label="Reason" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason" className="h-8 w-28 border border-stone-300 bg-transparent px-2 text-xs outline-none focus:border-ink" />
          <Button type="submit" size="sm" loading={saving} className="h-8 px-3">
            Save
          </Button>
        </>
      )}
    </form>
  );
}

const REASON: Record<string, string> = { INITIAL: 'Initial stock', RESTOCK: 'Restock', SALE: 'Sale', RETURN: 'Return', ADJUSTMENT: 'Adjustment' };

function HistoryDrawer({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const { data } = useAdminQuery<Movement[]>(row ? `/admin/inventory/${row.variantId}/movements` : null, { limit: 50 });
  return (
    <Drawer open={!!row} onClose={onClose} title={row ? `Stock history · ${row.sku}` : 'Stock history'}>
      <ul className="divide-y divide-stone-200 px-6">
        {(data ?? []).map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-4 py-4 text-sm">
            <span>
              <span className="block">{REASON[m.reason] ?? m.reason}</span>
              {m.note && <span className="block text-xs text-stone-500">{m.note}</span>}
              <span className="text-xs text-stone-500">{formatDate(m.createdAt, true)}</span>
            </span>
            <span className={cn('font-medium tabular-nums', m.delta > 0 ? 'text-success' : 'text-sale')}>
              {m.delta > 0 ? '+' : ''}
              {m.delta}
            </span>
          </li>
        ))}
        {data && data.length === 0 && <li className="py-8 text-center text-sm text-stone-500">No movements recorded.</li>}
      </ul>
    </Drawer>
  );
}
