'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OrderRow } from '@/components/account/OrderRow';
import { useFeature } from '@/components/layout/SiteProvider';
import { AddressBlock } from '@/components/order/OrderParts';
import { apiFetch, api } from '@/lib/api';
import type { Address, OrderSummary, Paginated } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useWishlist } from '@/stores/wishlist';

export default function AccountOverviewPage() {
  const user = useAuth((s) => s.user);
  const wishCount = useWishlist((s) => s.ids.length);
  const wishlist = useFeature('wishlist');
  const [orders, setOrders] = useState<Paginated<OrderSummary> | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);

  useEffect(() => {
    apiFetch<Paginated<OrderSummary>>('/account/orders', { query: { limit: 3 }, cache: 'no-store' }).then(setOrders).catch(() => setOrders(null));
    api<Address[]>('/account/addresses', { cache: 'no-store' }).then(setAddresses).catch(() => setAddresses([]));
  }, []);

  const defaultAddress = addresses?.find((a) => a.isDefault);

  return (
    <div className="space-y-12">
      <ul className={cn('grid border-y border-stone-200', wishlist ? 'grid-cols-3' : 'grid-cols-2')} aria-label="Account summary">
        {[
          { label: 'Orders', value: orders?.meta.total ?? '—', href: '/account/orders' },
          ...(wishlist ? [{ label: 'Saved', value: wishCount, href: '/wishlist' }] : []),
          { label: 'Addresses', value: addresses?.length ?? '—', href: '/account/addresses' },
        ].map((s) => (
          <li key={s.label} className="border-r border-stone-200 last:border-r-0 [&:not(:first-child)]:pl-4 sm:[&:not(:first-child)]:pl-8">
            <Link href={s.href} className="group block py-6 pr-4 sm:py-8">
              <span className="block font-display text-4xl font-light sm:text-5xl">{s.value}</span>
              <span className="mt-1 flex items-center gap-2 text-xs text-stone-500 group-hover:text-ink">
                {s.label} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="recent-orders">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="recent-orders" className="font-display text-3xl font-light">
            Recent orders
          </h2>
          <Link href="/account/orders" className="link-underline text-[0.7rem] tracking-[0.16em] uppercase">
            View all
          </Link>
        </div>
        {!orders ? (
          <div className="space-y-3">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
        ) : orders.data.length === 0 ? (
          <p className="text-stone-500">
            You have not placed an order yet.{' '}
            <Link href="/shop?isNew=true" className="underline underline-offset-4">
              Discover new arrivals
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {orders.data.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-8 sm:grid-cols-2" aria-label="Details">
        <div className="bg-bone p-6">
          <h2 className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">Profile</h2>
          <p className="text-sm">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-sm text-stone-600">{user?.email}</p>
          <Link href="/account/profile" className="link-underline mt-4 inline-block text-xs">
            Edit profile
          </Link>
        </div>
        <div className="bg-bone p-6">
          <h2 className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">Default address</h2>
          {defaultAddress ? <AddressBlock address={defaultAddress} /> : <p className="text-sm text-stone-500">{addresses ? 'No saved address yet.' : '…'}</p>}
          <Link href="/account/addresses" className="link-underline mt-4 inline-block text-xs">
            Manage addresses
          </Link>
        </div>
      </section>
    </div>
  );
}
