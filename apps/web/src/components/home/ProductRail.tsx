'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ProductCard as Card } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Stagger, StaggerItem } from '../motion';
import { ProductCard } from '../product/ProductCard';

/** Horizontally scrolling, snap-aligned product carousel with arrow controls. */
export function ProductRail({ products, label }: { products: Card[]; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <Stagger stagger={0.07}>
        <ul
          ref={ref}
          onScroll={update}
          aria-label={label}
          className="no-scrollbar -mx-(--spacing-gutter) flex snap-x snap-mandatory scroll-px-(--spacing-gutter) gap-4 overflow-x-auto px-(--spacing-gutter) sm:gap-6"
        >
          {products.map((p, i) => (
            <StaggerItem as="li" key={p.id} className="w-[72vw] shrink-0 snap-start sm:w-[42vw] md:w-[31vw] lg:w-[23vw] xl:w-[21rem]">
              <ProductCard product={p} sizes="(min-width: 1024px) 23vw, 72vw" priority={i < 2} />
            </StaggerItem>
          ))}
        </ul>
      </Stagger>
      <div className="mt-8 flex justify-end gap-2">
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => scroll(dir)}
            disabled={dir === -1 ? edges.start : edges.end}
            aria-label={dir === -1 ? 'Previous products' : 'Next products'}
            className={cn('flex h-11 w-11 items-center justify-center border border-ink transition-colors duration-300 hover:bg-ink hover:text-bone disabled:border-stone-200 disabled:text-stone-300 disabled:hover:bg-transparent')}
          >
            {dir === -1 ? <ArrowLeft className="h-4 w-4" strokeWidth={1.3} /> : <ArrowRight className="h-4 w-4" strokeWidth={1.3} />}
          </button>
        ))}
      </div>
    </div>
  );
}
