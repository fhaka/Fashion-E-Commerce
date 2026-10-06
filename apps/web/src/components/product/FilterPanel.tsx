'use client';

import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ListingState } from '@/lib/listing';
import type { CategoryNode, ProductFacets } from '@/lib/types';
import { cn, STORE_CURRENCY } from '@/lib/utils';
import { useFeature } from '../layout/SiteProvider';
import { AccordionItem } from '../ui/Accordion';

const GENDER_LABELS: Record<string, string> = { WOMEN: 'Women', MEN: 'Men', UNISEX: 'Unisex' };
const SIZE_GROUP_LABELS: Record<string, string> = {
  APPAREL: 'Clothing',
  WAIST: 'Waist',
  SHOE_W: 'Shoes (EU)',
  SHOE_M: 'Shoes (EU)',
  ONE_SIZE: 'Accessories',
};

export function FilterPanel({
  state,
  facets,
  categories,
  fixed,
  onChange,
}: {
  state: ListingState;
  facets: ProductFacets;
  categories?: CategoryNode[];
  fixed: (keyof ListingState)[];
  onChange: (next: ListingState) => void;
}) {
  // Colour and availability filters are part of the Advanced plan.
  const advanced = useFeature('advancedFilters');
  const update = (patch: Partial<ListingState>) => onChange({ ...state, ...patch });
  const toggleIn = (key: 'size' | 'color', value: string) =>
    update({ [key]: state[key].includes(value) ? state[key].filter((v) => v !== value) : [...state[key], value] });

  // Group sizes (clothing / waist / shoes) and de-duplicate shared EU shoe sizes.
  const sizeGroups = new Map<string, string[]>();
  for (const s of facets.sizes) {
    const label = SIZE_GROUP_LABELS[s.group] ?? s.group;
    const arr = sizeGroups.get(label) ?? [];
    if (!arr.includes(s.label)) arr.push(s.label);
    sizeGroups.set(label, arr);
  }

  return (
    <div className="text-sm">
      {categories && !fixed.includes('category') && (
        <AccordionItem title="Category" defaultOpen badge={state.category && <Dot />}>
          <ul className="space-y-2.5">
            <li>
              <FilterLink active={!state.category} onClick={() => update({ category: undefined })}>
                All products
              </FilterLink>
            </li>
            {categories.map((root) => (
              <li key={root.id}>
                <FilterLink active={state.category === root.slug} onClick={() => update({ category: root.slug })}>
                  {root.name}
                </FilterLink>
                {root.children.length > 0 && (state.category === root.slug || root.children.some((c) => c.slug === state.category)) && (
                  <ul className="mt-2.5 space-y-2 border-l border-stone-200 pl-4">
                    {root.children.map((c) => (
                      <li key={c.id}>
                        <FilterLink active={state.category === c.slug} onClick={() => update({ category: c.slug })}>
                          {c.name}
                        </FilterLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </AccordionItem>
      )}

      {!fixed.includes('gender') && facets.genders.length > 1 && (
        <AccordionItem title="Gender" defaultOpen={!!state.gender} badge={state.gender && <Dot />}>
          <div className="flex flex-wrap gap-2">
            {facets.genders.map((g) => (
              <Chip key={g.value} active={state.gender === g.value} onClick={() => update({ gender: state.gender === g.value ? undefined : (g.value as ListingState['gender']) })}>
                {GENDER_LABELS[g.value] ?? g.value} <span className="text-stone-500">({g.count})</span>
              </Chip>
            ))}
          </div>
        </AccordionItem>
      )}

      {facets.sizes.length > 0 && (
        <AccordionItem title="Size" defaultOpen badge={state.size.length > 0 && <Dot />}>
          <div className="space-y-4">
            {[...sizeGroups].map(([group, labels]) => (
              <div key={group}>
                {sizeGroups.size > 1 && <p className="mb-2 text-xs text-stone-500">{group}</p>}
                <div className="grid grid-cols-4 gap-1.5">
                  {labels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={state.size.includes(label)}
                      onClick={() => toggleIn('size', label)}
                      className={cn(
                        'h-10 border text-xs transition-colors duration-300',
                        state.size.includes(label) ? 'border-ink bg-ink text-bone' : 'border-stone-300 hover:border-ink',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AccordionItem>
      )}

      {advanced && facets.colors.length > 0 && (
        <AccordionItem title="Colour" defaultOpen badge={state.color.length > 0 && <Dot />}>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
            {facets.colors.map((c) => {
              const on = state.color.includes(c.slug);
              return (
                <li key={c.slug}>
                  <button type="button" aria-pressed={on} onClick={() => toggleIn('color', c.slug)} className="group flex w-full items-center gap-3 text-left">
                    <span
                      className={cn('relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-offset-2 transition-all', on ? 'ring-ink' : 'ring-stone-300 group-hover:ring-stone-500')}
                      style={{ backgroundColor: c.hex }}
                    >
                      {on && <Check className={cn('h-3 w-3', isLight(c.hex) ? 'text-ink' : 'text-paper')} strokeWidth={2.5} />}
                    </span>
                    <span className={cn('truncate', on && 'font-medium')}>
                      {c.name} <span className="text-stone-500">({c.count})</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </AccordionItem>
      )}

      <AccordionItem title="Price" defaultOpen={state.minPrice !== undefined || state.maxPrice !== undefined} badge={(state.minPrice !== undefined || state.maxPrice !== undefined) && <Dot />}>
        <PriceFilter
          min={state.minPrice}
          max={state.maxPrice}
          bounds={{ min: Math.floor(facets.price.min / 100), max: Math.ceil(facets.price.max / 100) }}
          onApply={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
        />
      </AccordionItem>

      {advanced && (
        <AccordionItem title="Availability" defaultOpen={state.inStock || state.onSale || state.isNew} badge={(state.inStock || state.onSale || state.isNew) && <Dot />}>
          <div className="space-y-3">
            <Toggle label="In stock only" checked={state.inStock} onChange={(v) => update({ inStock: v })} />
            {!fixed.includes('onSale') && <Toggle label="On sale" checked={state.onSale} onChange={(v) => update({ onSale: v })} />}
            {!fixed.includes('isNew') && <Toggle label="New arrivals" checked={state.isNew} onChange={(v) => update({ isNew: v })} />}
          </div>
        </AccordionItem>
      )}
    </div>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-camel" aria-label="(active)" />;
}

function FilterLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-current={active || undefined} className={cn('link-underline text-left', active ? 'font-medium text-ink' : 'text-stone-600')} data-active={active}>
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('border px-3 py-2 text-xs transition-colors duration-300', active ? 'border-ink bg-ink text-bone' : 'border-stone-300 hover:border-ink')}
    >
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>{label}</span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-5 w-9 rounded-full bg-stone-300 transition-colors duration-300 peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-paper after:transition-transform after:duration-300 peer-checked:after:translate-x-4"
      />
    </label>
  );
}

const PRICE_PRESETS = [
  { label: 'Under $200', min: undefined, max: 200 },
  { label: '$200 – $500', min: 200, max: 500 },
  { label: '$500 – $1,000', min: 500, max: 1000 },
  { label: '$1,000+', min: 1000, max: undefined },
];

function PriceFilter({ min, max, bounds, onApply }: { min?: number; max?: number; bounds: { min: number; max: number }; onApply: (min?: number, max?: number) => void }) {
  const [lo, setLo] = useState(min?.toString() ?? '');
  const [hi, setHi] = useState(max?.toString() ?? '');
  useEffect(() => {
    setLo(min?.toString() ?? '');
    setHi(max?.toString() ?? '');
  }, [min, max]);

  const parse = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? undefined : Math.max(0, Math.floor(Number(v))));
  const apply = () => {
    let a = parse(lo);
    let b = parse(hi);
    if (a !== undefined && b !== undefined && a > b) [a, b] = [b, a];
    onApply(a, b);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRICE_PRESETS.map((p) => {
          const active = p.min === min && p.max === max;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => (active ? onApply(undefined, undefined) : onApply(p.min, p.max))}
              className={cn('border px-3 py-2 text-xs transition-colors duration-300', active ? 'border-ink bg-ink text-bone' : 'border-stone-300 hover:border-ink')}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        {[
          { id: 'min', label: 'Min', value: lo, set: setLo, placeholder: String(bounds.min) },
          { id: 'max', label: 'Max', value: hi, set: setHi, placeholder: String(bounds.max) },
        ].map((f) => (
          <label key={f.id} className="flex-1">
            <span className="mb-1 block text-xs text-stone-500">{f.label} ({STORE_CURRENCY})</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={f.value}
              placeholder={f.placeholder}
              onChange={(e) => f.set(e.target.value)}
              className="h-10 w-full border border-stone-300 bg-transparent px-3 text-sm outline-none focus:border-ink"
            />
          </label>
        ))}
        <button type="submit" className="h-10 border border-ink px-4 text-[0.66rem] tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-bone">
          Apply
        </button>
      </form>
    </div>
  );
}
