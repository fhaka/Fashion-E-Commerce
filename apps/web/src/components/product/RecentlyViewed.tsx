'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ProductCard as Card } from '@/lib/types';
import { useRecentlyViewed } from '@/stores/recentlyViewed';
import { ProductRail } from '../home/ProductRail';
import { Reveal } from '../motion';

/** "Recently viewed" rail, backed by localStorage ids and the batch endpoint. */
export function RecentlyViewed({ excludeId, title = 'Recently viewed' }: { excludeId?: string; title?: string }) {
  const { ids, hydrate } = useRecentlyViewed();
  const [products, setProducts] = useState<Card[]>([]);

  useEffect(() => hydrate(), [hydrate]);

  const wanted = ids.filter((id) => id !== excludeId).slice(0, 10);
  const key = wanted.join();
  useEffect(() => {
    if (!wanted.length) {
      setProducts([]);
      return;
    }
    api<Card[]>('/products/batch', { method: 'POST', body: { ids: wanted }, auth: false })
      .then(setProducts)
      .catch(() => setProducts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (products.length === 0) return null;
  return (
    <section className="container-site py-(--spacing-section)" aria-labelledby="recent-heading">
      <Reveal>
        <p className="eyebrow mb-4 text-stone-500">Your selection</p>
        <h2 id="recent-heading" className="mb-10 font-display text-display-sm font-light">
          {title}
        </h2>
      </Reveal>
      <ProductRail products={products} label={title} />
    </section>
  );
}
