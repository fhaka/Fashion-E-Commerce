'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { OrderSummary } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { StatusBadge } from '../order/OrderParts';
import { Img } from '../ui/Img';

export function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <li>
      <Link href={`/account/orders/${order.orderNumber}`} className="group flex flex-wrap items-center gap-x-6 gap-y-3 py-5">
        <div className="flex -space-x-3">
          {order.previewImages.slice(0, 3).map((img, i) => (
            <div key={i} className="relative h-16 w-12 overflow-hidden border-2 border-paper bg-stone-100">
              {img.url && <Img src={img.url} alt={img.alt} fill sizes="48px" className="object-cover" />}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium tabular-nums">{order.orderNumber}</p>
          <p className="text-xs text-stone-500">
            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
          </p>
        </div>
        <StatusBadge status={order.status} />
        <p className="w-24 text-right text-sm tabular-nums">{formatMoney(order.total)}</p>
        <ArrowRight className="h-4 w-4 text-stone-500 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
      </Link>
    </li>
  );
}
