'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { BarList, ColumnChart } from '@/components/admin/charts';
import { FilterSelect, PageHeader, StatTile } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { compactMoney, downloadFile, useAdminQuery } from '@/lib/admin';
import { formatMoney } from '@/lib/utils';
import { toast } from '@/stores/toast';

interface Report {
  rows: { period: string; orders: number; grossSales: number; discounts: number; shipping: number; tax: number; revenue: number }[];
  totals: { orders: number; grossSales: number; discounts: number; shipping: number; tax: number; revenue: number; unitsSold: number };
  byCategory: { category: string; units: number; revenue: number }[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const PRESETS: Record<string, () => [string, string]> = {
  '30d': () => [iso(new Date(Date.now() - 29 * 86_400_000)), iso(new Date())],
  '90d': () => [iso(new Date(Date.now() - 89 * 86_400_000)), iso(new Date())],
  ytd: () => [`${new Date().getFullYear()}-01-01`, iso(new Date())],
  '12m': () => [iso(new Date(Date.now() - 364 * 86_400_000)), iso(new Date())],
};

export default function ReportsPage() {
  const [preset, setPreset] = useState('90d');
  const [[from, to], setRange] = useState(PRESETS['90d']());
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('week');
  const [exporting, setExporting] = useState(false);
  const query = { from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(new Date(`${to}T00:00:00`).getTime() + 86_400_000).toISOString(), groupBy };
  const { data, loading, error } = useAdminQuery<Report>('/admin/reports/sales', query);

  const label = (p: string) => {
    const d = new Date(`${p}T00:00:00Z`);
    return groupBy === 'month' ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile('/admin/reports/sales', { ...query, format: 'csv' }, `maison-sales-${from}-to-${to}-by-${groupBy}.csv`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Sales reports"
        description="Paid, processing, shipped and delivered orders. Cancelled and refunded orders are excluded."
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv} loading={exporting} disabled={!data?.rows.length}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <FilterSelect
          label="Range"
          value={preset}
          onChange={(v) => {
            setPreset(v);
            if (PRESETS[v]) setRange(PRESETS[v]());
          }}
          options={[
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
            { value: 'ytd', label: 'Year to date' },
            { value: '12m', label: 'Last 12 months' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {preset === 'custom' && (
          <>
            <input type="date" aria-label="From" value={from} max={to} onChange={(e) => setRange([e.target.value, to])} className="h-10 border border-stone-300 bg-paper px-3 text-sm" />
            <input type="date" aria-label="To" value={to} min={from} onChange={(e) => setRange([from, e.target.value])} className="h-10 border border-stone-300 bg-paper px-3 text-sm" />
          </>
        )}
        <FilterSelect label="Group by" value={groupBy} onChange={(v) => setGroupBy(v as typeof groupBy)} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
      </div>
      {error && <p className="mb-6 text-sm text-sale">{error}</p>}

      <div className={loading && data ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {data ? (
            <>
              <StatTile label="Net revenue" value={formatMoney(data.totals.revenue)} />
              <StatTile label="Orders" value={data.totals.orders.toLocaleString('en-US')} />
              <StatTile label="Units sold" value={data.totals.unitsSold.toLocaleString('en-US')} />
              <StatTile label="Discounts given" value={formatMoney(data.totals.discounts)} />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)
          )}
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            {data ? (
              <ColumnChart title="Net revenue" subtitle={`Per ${groupBy}`} columns={data.rows.map((r) => ({ label: label(r.period), value: r.revenue }))} format={(v) => formatMoney(v)} formatAxis={compactMoney} />
            ) : (
              <div className="skeleton h-80" />
            )}
          </div>
          {data ? (
            <BarList title="Revenue by category" subtitle="Line totals before order-level discounts" items={data.byCategory.map((c) => ({ label: c.category, value: c.revenue, hint: `${c.units} units` }))} format={(v) => formatMoney(v)} />
          ) : (
            <div className="skeleton h-80" />
          )}
        </div>

        {data && (
          <div className="overflow-x-auto border border-stone-200 bg-paper focus-visible:outline-1 focus-visible:outline-ink" tabIndex={0} role="region" aria-label="Report breakdown">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="border-b border-stone-200 bg-stone-100/60 text-left text-[0.66rem] tracking-[0.12em] text-stone-600 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Gross sales</th>
                  <th className="px-4 py-3 text-right font-medium">Discounts</th>
                  <th className="px-4 py-3 text-right font-medium">Shipping</th>
                  <th className="px-4 py-3 text-right font-medium">Tax</th>
                  <th className="px-4 py-3 text-right font-medium">Net revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 tabular-nums">
                {data.rows.map((r) => (
                  <tr key={r.period}>
                    <td className="px-4 py-2.5">{label(r.period)}</td>
                    <td className="px-4 py-2.5 text-right">{r.orders}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(r.grossSales)}</td>
                    <td className="px-4 py-2.5 text-right">{r.discounts ? `−${formatMoney(r.discounts)}` : '—'}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(r.shipping)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(r.tax)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMoney(r.revenue)}</td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-stone-500">
                      No sales in this range.
                    </td>
                  </tr>
                )}
              </tbody>
              {data.rows.length > 0 && (
                <tfoot className="border-t-2 border-ink font-medium tabular-nums">
                  <tr>
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{data.totals.orders}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(data.totals.grossSales)}</td>
                    <td className="px-4 py-3 text-right">−{formatMoney(data.totals.discounts)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(data.totals.shipping)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(data.totals.tax)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(data.totals.revenue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </>
  );
}
