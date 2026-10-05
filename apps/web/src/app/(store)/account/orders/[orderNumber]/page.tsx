'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OrderDetailView, StatusBadge } from '@/components/order/OrderParts';
import { api, ApiRequestError } from '@/lib/api';
import type { OrderDetail } from '@/lib/types';

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<OrderDetail>(`/account/orders/${encodeURIComponent(orderNumber)}`, { cache: 'no-store' })
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiRequestError && err.status === 404 ? 'We could not find this order in your account.' : 'Could not load this order.'));
  }, [orderNumber]);

  return (
    <div>
      <Link href="/account/orders" className="mb-8 inline-flex items-center gap-2 text-xs text-stone-600 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All orders
      </Link>
      {error ? (
        <p className="text-stone-600">{error}</p>
      ) : !order ? (
        <div className="space-y-4">
          <div className="skeleton h-10 w-64" />
          <div className="skeleton h-64" />
        </div>
      ) : (
        <>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-light tabular-nums">{order.orderNumber}</h2>
              <p className="mt-1 text-sm text-stone-500">
                Placed {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <OrderDetailView order={order} />
        </>
      )}
    </div>
  );
}
