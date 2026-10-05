'use client';

import { motion } from 'motion/react';
import { Check, Package, Truck, Home, CreditCard, X } from 'lucide-react';
import Link from 'next/link';
import type { OrderDetail, OrderStatus } from '@/lib/types';
import { cn, EASE, formatMoney } from '@/lib/utils';
import { Img } from '../ui/Img';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Confirmed',
  PROCESSING: 'Being prepared',
  SHIPPED: 'On its way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const tone =
    status === 'DELIVERED'
      ? 'bg-success/10 text-success'
      : status === 'CANCELLED' || status === 'REFUNDED'
        ? 'bg-stone-200 text-stone-600'
        : status === 'SHIPPED'
          ? 'bg-camel/15 text-camel-dark'
          : 'bg-ink/5 text-ink';
  return <span className={cn('inline-block px-2.5 py-1 text-[0.62rem] font-medium tracking-[0.14em] uppercase', tone, className)}>{STATUS_LABEL[status]}</span>;
}

const STEPS: { status: OrderStatus; label: string; icon: typeof Check }[] = [
  { status: 'PAID', label: 'Confirmed', icon: CreditCard },
  { status: 'PROCESSING', label: 'Prepared', icon: Package },
  { status: 'SHIPPED', label: 'Shipped', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: Home },
];
const ORDER: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

/** Progress tracker + dated event history. */
export function OrderTimeline({ order }: { order: OrderDetail }) {
  const ended = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const reachedIdx = ended ? ORDER.indexOf(order.timeline.filter((e) => ORDER.includes(e.status)).at(-1)?.status ?? 'PENDING') : ORDER.indexOf(order.status);

  return (
    <div>
      {ended ? (
        <div className="flex items-center gap-3 bg-stone-100 px-5 py-4 text-sm">
          <X className="h-4 w-4" /> This order was {order.status === 'CANCELLED' ? 'cancelled' : 'refunded'}.
        </div>
      ) : (
        <ol className="relative grid grid-cols-4" aria-label="Order progress">
          <span className="absolute top-5 right-[12.5%] left-[12.5%] h-px bg-stone-200" aria-hidden />
          <motion.span
            className="absolute top-5 left-[12.5%] h-px origin-left bg-ink"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(0, reachedIdx - 1) / 3 }}
            style={{ width: '75%' }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
            aria-hidden
          />
          {STEPS.map((s, i) => {
            const done = reachedIdx >= ORDER.indexOf(s.status);
            const current = order.status === s.status;
            const Icon = done && !current ? Check : s.icon;
            return (
              <li key={s.status} className="relative flex flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: EASE }}
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                    done ? 'border-ink bg-ink text-bone' : 'border-stone-300 bg-paper text-stone-400',
                    current && 'ring-4 ring-ink/10',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </motion.span>
                <span className={cn('mt-3 text-[0.65rem] tracking-[0.12em] uppercase', done ? 'text-ink' : 'text-stone-400')}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && (
        <p className="mt-8 text-sm text-stone-600">
          {order.carrier} tracking number: <span className="font-medium text-ink tabular-nums">{order.trackingNumber}</span>
        </p>
      )}

      <ul className="mt-8 space-y-4 border-l border-stone-200 pl-6">
        {[...order.timeline].reverse().map((e, i) => (
          <li key={`${e.status}-${e.at}`} className="relative">
            <span className={cn('absolute top-1.5 -left-[1.6rem] h-2 w-2 rounded-full', i === 0 ? 'bg-ink' : 'bg-stone-300')} />
            <p className="text-sm">{e.note ?? STATUS_LABEL[e.status]}</p>
            <time className="text-xs text-stone-500" dateTime={e.at}>
              {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderItems({ order }: { order: OrderDetail }) {
  return (
    <ul className="divide-y divide-stone-200">
      {order.items.map((i) => (
        <li key={i.id} className="flex gap-4 py-5">
          <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-stone-100">
            {i.image && <Img src={i.image} alt={i.productName} fill sizes="80px" className="object-cover" />}
          </div>
          <div className="flex min-w-0 flex-1 justify-between gap-4">
            <div>
              {i.productSlug ? (
                <Link href={`/product/${i.productSlug}`} className="hover:underline">
                  {i.productName}
                </Link>
              ) : (
                <p>{i.productName}</p>
              )}
              <p className="mt-1 text-xs text-stone-500">
                {i.variantLabel} · Qty {i.quantity}
              </p>
            </div>
            <p className="shrink-0 text-sm tabular-nums">{formatMoney(i.lineTotal)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }: { order: Pick<OrderDetail, 'subtotal' | 'discountTotal' | 'shippingTotal' | 'taxTotal' | 'total' | 'couponCode'> }) {
  return (
    <dl className="space-y-2.5 text-sm">
      <Row label="Subtotal" value={formatMoney(order.subtotal)} />
      {order.discountTotal > 0 && <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`−${formatMoney(order.discountTotal)}`} accent />}
      <Row label="Shipping" value={order.shippingTotal === 0 ? 'Complimentary' : formatMoney(order.shippingTotal)} />
      <Row label="Tax" value={formatMoney(order.taxTotal)} />
      <div className="flex items-baseline justify-between border-t border-stone-300 pt-4">
        <dt>Total</dt>
        <dd className="font-display text-2xl tabular-nums">{formatMoney(order.total)}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-stone-600">{label}</dt>
      <dd className={cn('tabular-nums', accent && 'text-success')}>{value}</dd>
    </div>
  );
}

export function AddressBlock({ address }: { address: OrderDetail['shippingAddress'] }) {
  return (
    <address className="text-sm leading-relaxed text-stone-700 not-italic">
      {address.fullName && (
        <>
          {address.fullName}
          <br />
        </>
      )}
      {address.line1 && (
        <>
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}
          <br />
        </>
      )}
      {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
      <br />
      {address.country}
    </address>
  );
}

/** Complete order view: progress, items, totals and addresses. */
export function OrderDetailView({ order }: { order: OrderDetail }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <section aria-label="Tracking" className="mb-12">
          <OrderTimeline order={order} />
        </section>
        <section aria-label="Items">
          <h2 className="mb-2 text-[0.7rem] tracking-[0.16em] uppercase">Items</h2>
          <OrderItems order={order} />
        </section>
      </div>
      <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
        <div className="bg-bone p-6">
          <OrderTotals order={order} />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <h2 className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">Shipping to</h2>
            <AddressBlock address={order.shippingAddress} />
            <p className="mt-2 text-xs text-stone-500 capitalize">{order.shippingMethod} delivery</p>
          </div>
          {order.payment && (
            <div>
              <h2 className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">Payment</h2>
              <p className="text-sm text-stone-700">
                {order.payment.provider === 'mock' ? 'Test card (demo mode)' : 'Card'} · <span className="capitalize">{order.payment.status.toLowerCase()}</span>
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
