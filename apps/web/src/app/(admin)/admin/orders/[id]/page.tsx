'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmDialog, PageHeader, Panel, Pill, TextArea } from '@/components/admin/ui';
import { useSite } from '@/components/layout/SiteProvider';
import { AddressBlock, OrderItems, OrderTimeline, OrderTotals, STATUS_LABEL, StatusBadge } from '@/components/order/OrderParts';
import { Button } from '@/components/ui/Button';
import { Checkbox, FormError, Input } from '@/components/ui/Field';
import { formatDate, useAdminQuery } from '@/lib/admin';
import { api, ApiRequestError } from '@/lib/api';
import type { OrderDetail, OrderStatus } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { toast } from '@/stores/toast';

type AdminOrder = OrderDetail & {
  notes: string | null;
  customer: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  payments: { id: string; provider: string; providerRef: string | null; amount: number; status: string; createdAt: string }[];
  allowedTransitions: OrderStatus[];
};

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PROCESSING: 'Mark as processing',
  SHIPPED: 'Mark as shipped',
  DELIVERED: 'Mark as delivered',
  CANCELLED: 'Cancel order',
  REFUNDED: 'Refund order',
};

export default function AdminOrderPage() {
  const { features } = useSite();
  const { id } = useParams<{ id: string }>();
  const { data: order, setData, error } = useAdminQuery<AdminOrder>(`/admin/orders/${id}`);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const [restock, setRestock] = useState(true);

  useEffect(() => {
    if (!order) return;
    setCarrier(order.carrier ?? '');
    setTracking(order.trackingNumber ?? '');
  }, [order]);

  const run = async (label: string, fn: () => Promise<AdminOrder>, success: string) => {
    setBusy(label);
    setFormError('');
    try {
      setData(await fn());
      toast.success(success);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? Object.values(err.fieldErrors)[0] ?? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const changeStatus = (status: OrderStatus) =>
    run(
      status,
      () =>
        status === 'REFUNDED'
          ? api<AdminOrder>(`/admin/orders/${id}/refund`, { method: 'POST', body: { restock, note: note || undefined } })
          : api<AdminOrder>(`/admin/orders/${id}/status`, {
              method: 'PATCH',
              body: { status, note: note || null, trackingNumber: tracking || null, carrier: carrier || null },
            }),
      `Order ${STATUS_LABEL[status].toLowerCase()}`,
    );

  if (error) return <p className="text-sale">{error}</p>;
  if (!order) return <div className="skeleton h-96" />;
  const destructive = (s: OrderStatus) => s === 'CANCELLED' || s === 'REFUNDED';

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Orders
      </Link>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDate(order.createdAt, true)} · ${order.email}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Fulfilment">
            {order.allowedTransitions.length === 0 ? (
              <p className="text-sm text-stone-500">This order is {STATUS_LABEL[order.status].toLowerCase()} — no further actions.</p>
            ) : (
              <div className="space-y-5">
                {order.allowedTransitions.includes('SHIPPED') && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="UPS, DHL Express…" />
                    <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                  </div>
                )}
                <TextArea label="Note for the timeline (optional)" value={note} onChange={setNote} rows={2} hint="Shown to the customer in their order history." />
                <FormError message={formError} />
                <div className="flex flex-wrap gap-2">
                  {order.allowedTransitions.filter((s) => s !== 'REFUNDED' || features.refunds).map((s) =>
                    destructive(s) ? (
                      <Button key={s} variant="outline" onClick={() => setConfirm(s)} disabled={!!busy}>
                        {ACTION_LABEL[s]}
                      </Button>
                    ) : (
                      <Button key={s} onClick={() => changeStatus(s)} loading={busy === s} disabled={!!busy && busy !== s}>
                        {ACTION_LABEL[s]}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )}
            {order.status === 'SHIPPED' && (
              <form
                className="mt-6 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run('meta', () => api<AdminOrder>(`/admin/orders/${id}`, { method: 'PATCH', body: { carrier: carrier || null, trackingNumber: tracking || null } }), 'Tracking updated');
                }}
              >
                <Input label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                <Button type="submit" variant="outline" loading={busy === 'meta'} className="h-12">
                  Update
                </Button>
              </form>
            )}
          </Panel>

          <Panel title="Progress">
            <OrderTimeline order={order} />
          </Panel>

          <Panel title={`Items (${order.items.reduce((s, i) => s + i.quantity, 0)})`}>
            <OrderItems order={order} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Summary">
            <OrderTotals order={order} />
          </Panel>
          <Panel title="Customer">
            {order.customer ? (
              <Link href={`/admin/customers/${order.customer.id}`} className="block text-sm hover:underline">
                {order.customer.firstName} {order.customer.lastName}
              </Link>
            ) : (
              <p className="text-sm">
                Guest <Pill>No account</Pill>
              </p>
            )}
            <p className="mt-1 text-sm text-stone-600">{order.email}</p>
            {order.customer?.phone && <p className="text-sm text-stone-600">{order.customer.phone}</p>}
          </Panel>
          <Panel title="Shipping address">
            <AddressBlock address={order.shippingAddress} />
            {order.shippingAddress.phone && <p className="mt-1 text-sm text-stone-600">{order.shippingAddress.phone}</p>}
            <p className="mt-3 text-xs text-stone-500 capitalize">{order.shippingMethod} delivery</p>
          </Panel>
          <Panel title="Payments">
            <ul className="space-y-3 text-sm">
              {order.payments.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block capitalize">{p.provider === 'mock' ? 'Demo payment' : p.provider}</span>
                    <span className="block max-w-[12rem] truncate text-xs text-stone-500">{p.providerRef}</span>
                  </span>
                  <span className="text-right">
                    <span className="block tabular-nums">{formatMoney(p.amount)}</span>
                    <Pill tone={p.status === 'SUCCEEDED' ? 'good' : p.status === 'REFUNDED' ? 'warn' : 'neutral'}>{p.status.toLowerCase()}</Pill>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          {order.notes && (
            <Panel title="Customer note">
              <p className="text-sm text-stone-700">{order.notes}</p>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'REFUNDED' ? 'Refund this order?' : 'Cancel this order?'}
        body={
          confirm === 'REFUNDED'
            ? `${formatMoney(order.total)} will be returned to the customer's original payment method.`
            : order.status === 'PENDING'
              ? 'The reserved stock will be released.'
              : `The customer will be refunded ${formatMoney(order.total)} and the items restocked.`
        }
        confirmLabel={confirm === 'REFUNDED' ? 'Refund' : 'Cancel order'}
        danger
        loading={!!busy}
        onConfirm={() => confirm && changeStatus(confirm)}
        onClose={() => setConfirm(null)}
      >
        {confirm === 'REFUNDED' && <Checkbox className="mt-5" label="Return items to stock" checked={restock} onChange={(e) => setRestock(e.target.checked)} />}
      </ConfirmDialog>
    </>
  );
}
