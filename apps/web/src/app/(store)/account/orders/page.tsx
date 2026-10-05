'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OrderRow } from '@/components/account/OrderRow';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import type { OrderSummary, Paginated } from '@/lib/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const load = async (page: number) => {
    setLoading(true);
    try {
      const res = await apiFetch<Paginated<OrderSummary>>('/account/orders', { query: { page, limit: 10 }, cache: 'no-store' });
      setOrders((prev) => (page === 1 ? res.data : [...(prev ?? []), ...res.data]));
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load(1);
  }, []);

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="mb-6 font-display text-3xl font-light">
        Order history
      </h2>
      {!orders ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="border-y border-stone-200 py-16 text-center">
          <p className="font-display text-2xl">No orders yet</p>
          <Link href="/shop" className="link-underline mt-4 inline-block text-sm">
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
          <p className="mt-6 text-xs text-stone-500">
            Showing {orders.length} of {meta.total}
          </p>
          {meta.page < meta.pages && (
            <Button variant="outline" className="mt-4" onClick={() => load(meta.page + 1)} loading={loading}>
              Load more
            </Button>
          )}
        </>
      )}
    </section>
  );
}
