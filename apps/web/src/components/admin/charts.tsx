'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight SVG charts for the admin dashboard.
 * Specs (dataviz skill): single series → no legend, title names it; validated series hue
 * #A8691B (bronze, passes lightness / chroma / contrast on the light surface); 2px line,
 * ~10% area wash, hairline solid grid, bars ≤ 24px with 4px rounded data-end, hover tooltip,
 * selective labels (end value / bar tips) and a table view for every chart.
 */
const SERIES = '#A8691B';
const GRID = '#E2DED7';
const SURFACE = '#FFFFFF';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round axis max up to a clean number so ticks read 0 / 2,000 / 4,000… */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function ChartFrame({ title, subtitle, children, table }: { title: string; subtitle?: string; children: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className="border border-stone-200 bg-paper">
      <figcaption className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
        <div>
          <p className="text-sm font-medium">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
        </div>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="shrink-0 text-xs text-stone-500 underline-offset-4 hover:text-ink hover:underline" aria-pressed={asTable}>
          {asTable ? 'View chart' : 'View as table'}
        </button>
      </figcaption>
      <div className="p-5">{asTable ? <div className="max-h-72 overflow-y-auto">{table}</div> : children}</div>
    </figure>
  );
}

function SimpleTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
          <th className="py-2 font-normal">{head[0]}</th>
          <th className="py-2 text-right font-normal">{head[1]}</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map(([a, b], i) => (
          <tr key={i} className="border-b border-stone-100">
            <td className="py-1.5">{a}</td>
            <td className="py-1.5 text-right">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ───────────────────────── Area / line over time ───────────────────────── */

export function TimeSeriesChart({
  title,
  subtitle,
  points,
  format,
  formatAxis = format,
  height = 260,
}: {
  title: string;
  subtitle?: string;
  points: { label: string; value: number }[];
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 16, right: 72, bottom: 28, left: 56 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const x = (i: number) => (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => h - (v / max) * h;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(w / 90))));
  const last = points.length - 1;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    setHover(Math.min(last, Math.max(0, Math.round(rel * last))));
  };

  return (
    <ChartFrame title={title} subtitle={subtitle} table={<SimpleTable head={['Date', 'Value']} rows={points.map((p) => [p.label, format(p.value)])} />}>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${title}. ${points.length} points, latest ${points.length ? format(points[last].value) : 'n/a'}.`}>
            <g transform={`translate(${pad.left},${pad.top})`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={0} x2={w} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                  <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-stone-500 text-[11px] tabular-nums">
                    {formatAxis(t)}
                  </text>
                </g>
              ))}
              {points.map((p, i) =>
                i % labelEvery === 0 || i === last ? (
                  <text key={p.label} x={x(i)} y={h + 18} textAnchor={i === last ? 'end' : i === 0 ? 'start' : 'middle'} className="fill-stone-500 text-[11px]">
                    {p.label}
                  </text>
                ) : null,
              )}
              <path d={area} fill={SERIES} fillOpacity={0.1} />
              <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {last >= 0 && (
                <>
                  <circle cx={x(last)} cy={y(points[last].value)} r={4} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
                  <text x={x(last) + 8} y={y(points[last].value)} dy="0.32em" className="fill-ink text-[11px] font-medium tabular-nums">
                    {format(points[last].value)}
                  </text>
                </>
              )}
              {hover !== null && points[hover] && (
                <>
                  <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} stroke="#7d776e" strokeWidth={1} />
                  <circle cx={x(hover)} cy={y(points[hover].value)} r={5} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
                </>
              )}
              {/* Hit area larger than the marks: the whole plot. */}
              <rect width={w} height={h} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
            </g>
          </svg>
        )}
        {hover !== null && points[hover] && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 bg-ink px-3 py-2 text-xs whitespace-nowrap text-bone shadow-lg"
            style={{ left: Math.min(Math.max(pad.left + x(hover), 70), width - 70) }}
            role="status"
          >
            <span className="block text-bone/70">{points[hover].label}</span>
            <span className="font-medium tabular-nums">{format(points[hover].value)}</span>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

/* ───────────────────────── Horizontal bars (ranked categories) ───────────────────────── */

export function BarList({
  title,
  subtitle,
  items,
  format,
}: {
  title: string;
  subtitle?: string;
  items: { label: string; value: number; hint?: string }[];
  format: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ChartFrame title={title} subtitle={subtitle} table={<SimpleTable head={['Item', 'Value']} rows={items.map((i) => [i.label, format(i.value)])} />}>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-500">No data for this period.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={item.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="relative">
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-stone-700">{item.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{format(item.value)}</span>
              </div>
              <div className="h-3 bg-stone-100">
                <div className={cn('h-full rounded-r-[4px] transition-opacity', hover !== null && hover !== i && 'opacity-50')} style={{ width: `${(item.value / max) * 100}%`, backgroundColor: SERIES }} />
              </div>
              {hover === i && item.hint && <p className="mt-1 text-[11px] text-stone-500">{item.hint}</p>}
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}

/* ───────────────────────── Columns (periods) ───────────────────────── */

export function ColumnChart({
  title,
  subtitle,
  columns,
  format,
  formatAxis = format,
  height = 260,
}: {
  title: string;
  subtitle?: string;
  columns: { label: string; value: number }[];
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 16, right: 8, bottom: 28, left: 56 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...columns.map((c) => c.value), 0));
  const band = columns.length ? w / columns.length : 0;
  const barW = Math.min(24, Math.max(2, band - 2)); // ≤24px, 2px surface gap
  const y = (v: number) => h - (v / max) * h;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(columns.length / Math.max(2, Math.floor(w / 70))));

  return (
    <ChartFrame title={title} subtitle={subtitle} table={<SimpleTable head={['Period', 'Value']} rows={columns.map((c) => [c.label, format(c.value)])} />}>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${title}. ${columns.length} periods.`}>
            <g transform={`translate(${pad.left},${pad.top})`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={0} x2={w} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                  <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-stone-500 text-[11px] tabular-nums">
                    {formatAxis(t)}
                  </text>
                </g>
              ))}
              {columns.map((c, i) => {
                const cx = i * band + band / 2;
                const bh = h - y(c.value);
                const r = Math.min(4, bh, barW / 2);
                const x0 = cx - barW / 2;
                // 4px rounded data-end (top), square at the baseline.
                const d = `M${x0},${h} L${x0},${h - bh + r} Q${x0},${h - bh} ${x0 + r},${h - bh} L${x0 + barW - r},${h - bh} Q${x0 + barW},${h - bh} ${x0 + barW},${h - bh + r} L${x0 + barW},${h} Z`;
                return (
                  <g key={c.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                    <rect x={i * band} y={0} width={band} height={h} fill="transparent" />
                    {bh > 0 && <path d={d} fill={SERIES} opacity={hover !== null && hover !== i ? 0.5 : 1} />}
                    {(i % labelEvery === 0 || i === columns.length - 1) && (
                      <text x={cx} y={h + 18} textAnchor="middle" className="fill-stone-500 text-[11px]">
                        {c.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
        {hover !== null && columns[hover] && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 bg-ink px-3 py-2 text-xs whitespace-nowrap text-bone shadow-lg"
            style={{ left: Math.min(Math.max(pad.left + hover * band + band / 2, 70), width - 70) }}
            role="status"
          >
            <span className="block text-bone/70">{columns[hover].label}</span>
            <span className="font-medium tabular-nums">{format(columns[hover].value)}</span>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
