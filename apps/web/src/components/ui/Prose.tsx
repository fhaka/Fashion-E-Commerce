import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Long-form text layout for policy and service pages: sticky contents list + readable measure. */
export function ProseLayout({ sections, updated }: { sections: { id: string; title: string; body: ReactNode }[]; updated?: string }) {
  return (
    <div className="container-site grid gap-12 pb-(--spacing-section) lg:grid-cols-12">
      <nav aria-label="On this page" className="lg:col-span-3">
        <ul className="space-y-2 text-sm lg:sticky lg:top-32">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="link-underline text-stone-600 hover:text-ink">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="max-w-2xl lg:col-span-8 lg:col-start-5">
        {updated && <p className="mb-10 text-xs tracking-[0.14em] text-stone-500 uppercase">Last updated {updated}</p>}
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mb-14 scroll-mt-32">
            <h2 className="mb-5 font-display text-3xl font-light">{s.title}</h2>
            <div>{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mb-4 leading-relaxed text-stone-700', className)}>{children}</p>;
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-stone-700 marker:text-stone-500">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function InfoTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink">
            {head.map((h) => (
              <th key={h} scope="col" className="py-3 pr-4 text-[0.66rem] font-medium tracking-[0.14em] uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-stone-200">
              {r.map((c, j) => (
                <td key={j} className="py-3 pr-4 align-top text-stone-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
