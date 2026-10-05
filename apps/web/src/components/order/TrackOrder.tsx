'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { trackOrderSchema } from '@maison/shared';
import { apiFetch, ApiRequestError } from '@/lib/api';
import type { OrderDetail } from '@/lib/types';
import { EASE } from '@/lib/utils';
import { Button } from '../ui/Button';
import { FormError, Input, zodFieldErrors } from '../ui/Field';
import { OrderDetailView, StatusBadge } from './OrderParts';

export function TrackOrder() {
  const params = useSearchParams();
  const [values, setValues] = useState({ orderNumber: params.get('orderNumber') ?? '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = trackOrderSchema.safeParse(values);
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setErrors({});
    setFormError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: OrderDetail }>('/orders/track', { query: parsed.data, auth: false, cache: 'no-store' });
      setOrder(res.data);
    } catch (err) {
      setOrder(null);
      setFormError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-14">
      <form onSubmit={submit} noValidate className="grid max-w-3xl gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input label="Order number" placeholder="MS-XXXXXXXX" value={values.orderNumber} onChange={(e) => setValues({ ...values, orderNumber: e.target.value })} error={errors.orderNumber} />
        <Input label="Email" type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} error={errors.email} />
        <Button type="submit" loading={loading} className="h-12">
          Track
        </Button>
        <div className="sm:col-span-3">
          <FormError message={formError} />
        </div>
      </form>

      <AnimatePresence mode="wait">
        {order && (
          <motion.section key={order.orderNumber} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} aria-live="polite">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-t border-stone-200 pt-10">
              <div>
                <p className="eyebrow mb-2 text-stone-500">Order</p>
                <h2 className="font-display text-3xl font-light tabular-nums">{order.orderNumber}</h2>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <OrderDetailView order={order} />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
