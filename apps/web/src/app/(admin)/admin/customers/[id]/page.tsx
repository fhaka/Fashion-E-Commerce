'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog, PageHeader, Panel, Pill, StatTile } from '@/components/admin/ui';
import { useSite } from '@/components/layout/SiteProvider';
import { AddressBlock, StatusBadge } from '@/components/order/OrderParts';
import { Button } from '@/components/ui/Button';
import { Stars } from '@/components/ui/Stars';
import { formatDate, useAdminQuery } from '@/lib/admin';
import { api, ApiRequestError } from '@/lib/api';
import type { Address, OrderStatus } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { toast } from '@/stores/toast';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  newsletter: boolean;
  addresses: Address[];
  orders: { id: string; orderNumber: string; status: OrderStatus; total: number; createdAt: string }[];
  reviews: { id: string; rating: number; title: string; status: string; createdAt: string; product: { name: string; slug: string } }[];
  stats: { orderCount: number; totalSpent: number; averageOrderValue: number };
}

export default function CustomerPage() {
  const { features } = useSite();
  const { id } = useParams<{ id: string }>();
  const me = useAuth((s) => s.user);
  const { data: c, setData, error } = useAdminQuery<Customer>(`/admin/customers/${id}`);
  const [confirm, setConfirm] = useState<null | { label: string; patch: { isActive?: boolean; role?: 'CUSTOMER' | 'ADMIN' }; body: string }>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <p className="text-sale">{error}</p>;
  if (!c) return <div className="skeleton h-96" />;
  const isSelf = me?.id === c.id;

  const apply = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await api<{ isActive: boolean; role: Customer['role'] }>(`/admin/customers/${c.id}`, { method: 'PATCH', body: confirm.patch });
      setData({ ...c, ...res });
      toast.success('Account updated');
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not update');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Customers
      </Link>
      <PageHeader
        title={`${c.firstName} ${c.lastName}`}
        description={`${c.email} · joined ${formatDate(c.createdAt)}${c.lastLoginAt ? ` · last sign-in ${formatDate(c.lastLoginAt)}` : ''}`}
        actions={
          <span className="flex gap-1">
            {c.role === 'ADMIN' && <Pill tone="dark">Admin</Pill>}
            {!c.isActive && <Pill tone="bad">Disabled</Pill>}
            {c.newsletter && <Pill>Newsletter</Pill>}
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatTile label="Orders" value={String(c.stats.orderCount)} />
        <StatTile label="Lifetime value" value={formatMoney(c.stats.totalSpent)} />
        <StatTile label="Average order" value={formatMoney(c.stats.averageOrderValue)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={`Orders (${c.orders.length})`} bodyClassName="p-0">
            <ul className="divide-y divide-stone-200">
              {c.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-stone-100/60">
                    <span className="w-28 font-medium tabular-nums">{o.orderNumber}</span>
                    <span className="flex-1 text-stone-500">{formatDate(o.createdAt)}</span>
                    <StatusBadge status={o.status} />
                    <span className="w-24 text-right tabular-nums">{formatMoney(o.total)}</span>
                  </Link>
                </li>
              ))}
              {c.orders.length === 0 && <li className="px-5 py-8 text-center text-sm text-stone-500">No orders yet.</li>}
            </ul>
          </Panel>
          {features.reviews && c.reviews.length > 0 && (
            <Panel title="Reviews" bodyClassName="p-0">
              <ul className="divide-y divide-stone-200">
                {c.reviews.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <Stars rating={r.rating} />
                    <span className="min-w-0 flex-1 truncate">
                      {r.title} <span className="text-stone-500">· {r.product.name}</span>
                    </span>
                    <Pill tone={r.status === 'APPROVED' ? 'good' : r.status === 'REJECTED' ? 'bad' : 'warn'}>{r.status.toLowerCase()}</Pill>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Contact">
            <p className="text-sm">{c.email}</p>
            <p className="text-sm text-stone-600">{c.phone ?? 'No phone'}</p>
          </Panel>
          <Panel title="Addresses">
            <div className="space-y-4">
              {c.addresses.map((a) => (
                <div key={a.id}>
                  <p className="mb-1 text-xs text-stone-500">
                    {a.label || 'Address'} {a.isDefault && '· default'}
                  </p>
                  <AddressBlock address={a} />
                </div>
              ))}
              {c.addresses.length === 0 && <p className="text-sm text-stone-500">None saved.</p>}
            </div>
          </Panel>
          <Panel title="Access">
            {isSelf ? (
              <p className="text-sm text-stone-500">This is your own account — you cannot change your own access.</p>
            ) : (
              <div className="flex flex-col items-start gap-3">
                {c.isActive ? (
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ label: 'Disable account', patch: { isActive: false }, body: 'They will be signed out everywhere and cannot sign in until re-enabled. Their orders are unaffected.' })}>
                    Disable account
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setConfirm({ label: 'Enable account', patch: { isActive: true }, body: 'They will be able to sign in again.' })}>
                    Enable account
                  </Button>
                )}
                {c.role === 'CUSTOMER' ? (
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ label: 'Make admin', patch: { role: 'ADMIN' }, body: 'Admins can see all orders and customers and change products, prices and stock.' })}>
                    Make admin
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ label: 'Remove admin access', patch: { role: 'CUSTOMER' }, body: 'Their admin access ends immediately.' })}>
                    Remove admin access
                  </Button>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
      <ConfirmDialog open={!!confirm} title={`${confirm?.label}?`} body={confirm?.body} confirmLabel={confirm?.label} danger={confirm?.patch.isActive === false} loading={busy} onConfirm={apply} onClose={() => setConfirm(null)} />
    </>
  );
}
