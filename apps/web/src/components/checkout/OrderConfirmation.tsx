'use client';

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { OrderDetail } from '@/lib/types';
import { EASE } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';
import { AddressBlock, OrderItems, OrderTotals } from '../order/OrderParts';
import { ButtonLink } from '../ui/Button';

/**
 * Confirmation page. Readable by the order owner, or by whoever holds the payment key
 * returned at checkout (guests). Polls briefly while a Stripe webhook confirms payment.
 */
export function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const params = useSearchParams();
  const key = params.get('key') ?? params.get('payment_intent_client_secret') ?? undefined;
  const { status, user } = useAuth();
  const refetchCart = useCart((s) => s.fetch);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const o = await api<OrderDetail>(`/checkout/${encodeURIComponent(orderNumber)}/confirmation`, { query: { key }, cache: 'no-store' });
        setOrder(o);
        if (o.status === 'PENDING' && tries++ < 10) timer = setTimeout(load, 2000);
        else void refetchCart();
      } catch {
        setFailed(true);
      }
    };
    void load();
    return () => clearTimeout(timer);
  }, [orderNumber, key, status, refetchCart]);

  if (failed) {
    return (
      <div className="container-site flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-4xl font-light">We could not find this order</p>
        <p className="mt-4 max-w-md text-stone-500">If you placed an order, a confirmation email is on its way. You can also track it with your order number and email.</p>
        <ButtonLink href="/track-order" className="mt-10">
          Track an order
        </ButtonLink>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="container-site py-24">
        <div className="skeleton mx-auto h-64 max-w-3xl" />
      </div>
    );
  }

  const confirmed = order.status !== 'PENDING';
  return (
    <div className="container-site py-14 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-ink text-bone"
        >
          <Check className="h-7 w-7" strokeWidth={1.5} />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: EASE }} className="eyebrow mb-4 text-stone-500">
          Order {order.orderNumber}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: EASE }} className="font-display text-display-sm font-light">
          {confirmed ? `Thank you${user ? `, ${user.firstName}` : ''}` : 'Confirming your payment…'}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="mx-auto mt-5 max-w-lg text-stone-600">
          {confirmed
            ? `Your order is confirmed. A confirmation has been sent to ${order.email}. We will let you know as soon as it ships.`
            : 'This usually takes a few seconds. You can safely stay on this page.'}
        </motion.p>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8, ease: EASE }} className="mx-auto mt-16 grid max-w-5xl gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="mb-2 text-[0.7rem] tracking-[0.16em] uppercase">Items</h2>
          <OrderItems order={order} />
        </div>
        <div className="space-y-8 lg:col-span-5">
          <div className="bg-bone p-6">
            <OrderTotals order={order} />
          </div>
          <div>
            <h2 className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">Shipping to</h2>
            <AddressBlock address={order.shippingAddress} />
            <p className="mt-2 text-xs text-stone-500 capitalize">{order.shippingMethod} delivery</p>
          </div>
        </div>
      </motion.div>

      <div className="mt-16 flex flex-wrap justify-center gap-3">
        {user ? (
          <ButtonLink href={`/account/orders/${order.orderNumber}`}>View order</ButtonLink>
        ) : (
          <ButtonLink href={`/track-order?orderNumber=${order.orderNumber}`}>Track this order</ButtonLink>
        )}
        <ButtonLink href="/shop" variant="outline">
          Continue shopping
        </ButtonLink>
      </div>
    </div>
  );
}
