'use client';

import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

/* ───────────────────────── Page chrome ───────────────────────── */

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-light">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className, bodyClassName }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('border border-stone-200 bg-paper', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
          {title && <h2 className="text-[0.7rem] font-medium tracking-[0.14em] uppercase">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ───────────────────────── Stat tile ───────────────────────── */

/** label · value · delta vs previous period (up = good unless `invert`). */
export function StatTile({ label, value, change, period, invert = false }: { label: string; value: string; change?: number; period?: string; invert?: boolean }) {
  const up = (change ?? 0) >= 0;
  const good = invert ? !up : up;
  return (
    <div className="border border-stone-200 bg-paper p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {change !== undefined && (
        <p className={cn('mt-2 flex items-center gap-1 text-xs', change === 0 ? 'text-stone-500' : good ? 'text-success' : 'text-sale')}>
          {change !== 0 && (up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />)}
          <span>
            {change > 0 ? '+' : ''}
            {change}%
          </span>
          {period && <span className="text-stone-500">vs {period}</span>}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Data table ───────────────────────── */

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty = 'Nothing to show yet.',
  onRowClick,
  selectable,
  selected,
  onSelect,
  label = 'Results',
}: {
  columns: Column<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  /** Accessible name for the scrollable table region. */
  label?: string;
}) {
  const all = rows ?? [];
  const allSelected = selectable && all.length > 0 && all.every((r) => selected?.has(rowKey(r)));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelect?.(next);
  };
  return (
    // Focusable so keyboard users can scroll the table horizontally on small screens.
    <div className="overflow-x-auto border border-stone-200 bg-paper focus-visible:outline-1 focus-visible:outline-ink" tabIndex={0} role="region" aria-label={label}>
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-100/60">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  className="accent-ink"
                  checked={!!allSelected}
                  onChange={() => onSelect?.(allSelected ? new Set() : new Set(all.map(rowKey)))}
                />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 text-[0.66rem] font-medium tracking-[0.12em] text-stone-600 uppercase', c.align === 'right' && 'text-right', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn('divide-y divide-stone-200 transition-opacity', loading && rows && 'opacity-50')}>
          {!rows ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-3">
                  <div className="skeleton h-5" />
                </td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-stone-500">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = rowKey(row);
              return (
                <tr key={id} className={cn('tabular-nums', onRowClick && 'cursor-pointer hover:bg-stone-100/60')} onClick={() => onRowClick?.(row)}>
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Select row" className="accent-ink" checked={!!selected?.has(id)} onChange={() => toggle(id)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 align-middle', c.align === 'right' && 'text-right', c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="mt-4 text-xs text-stone-500">{total} total</p>;
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-1">
        <button type="button" className="flex h-8 w-8 items-center justify-center border border-stone-300 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center border border-stone-300 disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Filters ───────────────────────── */

/** Debounced search box (300ms). */
export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return (
    <label className="flex h-10 min-w-56 flex-1 items-center gap-2 border border-stone-300 bg-paper px-3 focus-within:border-ink sm:max-w-xs">
      <Search className="h-4 w-4 text-stone-500" />
      <span className="sr-only">Search</span>
      <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm outline-none" />
    </label>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex h-10 items-center gap-2 border border-stone-300 bg-paper px-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-stone-200" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('-mb-px border-b-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors', value === t.value ? 'border-ink text-ink' : 'border-transparent text-stone-500 hover:text-ink')}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-xs text-stone-500">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Bits ───────────────────────── */

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'dark' }) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-700',
    good: 'bg-success/10 text-success',
    warn: 'bg-camel/15 text-camel-dark',
    bad: 'bg-sale/10 text-sale',
    dark: 'bg-ink text-bone',
  };
  return <span className={cn('inline-block px-2 py-0.5 text-[0.65rem] font-medium tracking-[0.08em] whitespace-nowrap uppercase', tones[tone])}>{children}</span>;
}

export function Thumb({ src, alt = '' }: { src: string | null | undefined; alt?: string }) {
  // Plain <img>: admin thumbnails are tiny and may come from local uploads.
  return (
    <span className="block h-12 w-10 shrink-0 overflow-hidden bg-stone-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src.includes('images.unsplash.com') ? src.replace(/w=\d+/, 'w=120') : src} alt={alt} className="h-full w-full object-cover" loading="lazy" />}
    </span>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-ink' : 'bg-stone-300')}
    >
      <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-paper transition-transform', checked && 'translate-x-4')} />
    </button>
  );
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-md">
      <h2 className="font-display text-3xl font-light">{title}</h2>
      {body && <div className="mt-3 text-sm text-stone-600">{body}</div>}
      {children}
      <div className="mt-8 flex gap-3">
        <Button onClick={onConfirm} loading={loading} className={cn(danger && 'bg-sale')}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

export function TextArea({ label, value, onChange, rows = 4, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.68rem] tracking-[0.14em] uppercase">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y border border-stone-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink"
      />
      {hint && <span className="mt-1.5 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}
