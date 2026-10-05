'use client';

import { useState } from 'react';
import { api, ApiRequestError } from '@/lib/api';
import { useAdminQuery } from '@/lib/admin';
import { formatMoney } from '@/lib/utils';
import { toast } from '@/stores/toast';
import { Button } from '../ui/Button';
import { DataTable, FilterSelect, Pagination, Pill, SearchInput, Tabs, Thumb, Toggle, type Column } from './ui';

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  basePrice: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  salesCount: number;
  category: { name: string };
  image: string | null;
  variantCount: number;
  stock: number;
  outOfStockVariants: number;
  lowStockVariants: number;
}

interface CategoryRow {
  id: string;
  name: string;
  parentId: string | null;
}

/** Product table shared by the Products and Featured screens. */
export function ProductTable({ onOpen, featuredOnly = false }: { onOpen: (id: string) => void; featuredOnly?: boolean }) {
  const [status, setStatus] = useState<'' | ProductRow['status']>('');
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState(featuredOnly ? 'sales' : 'newest');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data, meta, loading, reload, setData } = useAdminQuery<ProductRow[]>('/admin/products', {
    status: status || undefined,
    q: q || undefined,
    categoryId: categoryId || undefined,
    featured: featuredOnly || undefined,
    lowStock: lowStock || undefined,
    sort,
    page,
    limit: 25,
  });
  const { data: categories } = useAdminQuery<CategoryRow[]>('/admin/categories');

  const bulk = async (patch: Record<string, unknown>, label: string) => {
    setBusy(true);
    try {
      const res = await api<{ updated: number }>('/admin/products/bulk', { method: 'PATCH', body: { ids: [...selected], ...patch } });
      toast.success(`${res.updated} product${res.updated === 1 ? '' : 's'} ${label}`);
      setSelected(new Set());
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Bulk update failed');
    } finally {
      setBusy(false);
    }
  };

  const flag = async (row: ProductRow, isFeatured: boolean) => {
    setData((rows) => rows?.map((r) => (r.id === row.id ? { ...r, isFeatured } : r)) ?? rows);
    try {
      await api('/admin/products/bulk', { method: 'PATCH', body: { ids: [row.id], isFeatured } });
      if (featuredOnly && !isFeatured) await reload();
    } catch {
      toast.error('Could not update');
      await reload();
    }
  };

  const columns: Column<ProductRow>[] = [
    {
      key: 'name',
      header: 'Product',
      cell: (p) => (
        <span className="flex items-center gap-3">
          <Thumb src={p.image} alt={p.name} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.name}</span>
            <span className="text-xs text-stone-500">{p.category.name}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => <Pill tone={p.status === 'ACTIVE' ? 'good' : p.status === 'DRAFT' ? 'neutral' : 'warn'}>{p.status.toLowerCase()}</Pill>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      cell: (p) => (
        <span>
          {formatMoney(p.basePrice)}
          {p.compareAtPrice && <s className="ml-1.5 text-xs text-stone-400">{formatMoney(p.compareAtPrice)}</s>}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      cell: (p) => (
        <span className="flex flex-col items-end gap-1">
          <span>
            {p.stock} <span className="text-xs text-stone-500">in {p.variantCount} variants</span>
          </span>
          {p.outOfStockVariants > 0 && <Pill tone="bad">{p.outOfStockVariants} sold out</Pill>}
          {p.outOfStockVariants === 0 && p.lowStockVariants > 0 && <Pill tone="warn">{p.lowStockVariants} low</Pill>}
        </span>
      ),
    },
    { key: 'sales', header: 'Sold', align: 'right', cell: (p) => p.salesCount },
    {
      key: 'featured',
      header: 'Featured',
      cell: (p) => <Toggle checked={p.isFeatured} onChange={(v) => flag(p, v)} label={`Feature ${p.name}`} />,
    },
  ];

  return (
    <>
      {!featuredOnly && (
        <Tabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          tabs={[
            { value: '', label: 'All' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'DRAFT', label: 'Drafts' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
        />
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name or SKU" />
        <FilterSelect
          label="Category"
          value={categoryId}
          onChange={(v) => { setCategoryId(v); setPage(1); }}
          options={[{ value: '', label: 'All' }, ...(categories ?? []).filter((c) => c.parentId).map((c) => ({ value: c.id, label: c.name }))]}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'name', label: 'Name' },
            { value: 'price', label: 'Price' },
            { value: 'sales', label: 'Best selling' },
          ]}
        />
        <label className="flex h-10 items-center gap-2 border border-stone-300 bg-paper px-3 text-sm">
          <input type="checkbox" className="accent-ink" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} />
          Low stock
        </label>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 border border-ink bg-ink px-4 py-2.5 text-sm text-bone">
          <span className="mr-2">{selected.size} selected</span>
          {[
            { label: 'Publish', patch: { status: 'ACTIVE' }, done: 'published' },
            { label: 'Move to draft', patch: { status: 'DRAFT' }, done: 'moved to drafts' },
            { label: 'Archive', patch: { status: 'ARCHIVED' }, done: 'archived' },
            { label: 'Feature', patch: { isFeatured: true }, done: 'featured' },
            { label: 'Unfeature', patch: { isFeatured: false }, done: 'unfeatured' },
            { label: 'Mark new', patch: { isNew: true }, done: 'marked as new' },
          ].map((a) => (
            <Button key={a.label} size="sm" variant="light" disabled={busy} onClick={() => bulk(a.patch, a.done)}>
              {a.label}
            </Button>
          ))}
          <button type="button" className="ml-auto text-xs text-bone/70 underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(p) => p.id}
        loading={loading}
        onRowClick={(p) => onOpen(p.id)}
        selectable
        selected={selected}
        onSelect={setSelected}
        empty={featuredOnly ? 'No featured products. Toggle "Featured" on any product to show it here.' : 'No products match these filters.'}
      />
      {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
    </>
  );
}
