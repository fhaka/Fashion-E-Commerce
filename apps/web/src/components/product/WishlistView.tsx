'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ProductCard as Card } from '@/lib/types';
import { EASE } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useWishlist } from '@/stores/wishlist';
import { ButtonLink } from '../ui/Button';
import { PageIntro } from '../ui/PageIntro';
import { ProductCard } from './ProductCard';

export function WishlistView({ embedded = false }: { embedded?: boolean }) {
  const ids = useWishlist((s) => s.ids);
  const { user, status } = useAuth();
  const [products, setProducts] = useState<Card[] | null>(null);
  const key = ids.join();

  useEffect(() => {
    if (status === 'loading') return;
    if (!ids.length) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    api<Card[]>('/products/batch', { method: 'POST', body: { ids: ids.slice(0, 24) }, auth: false })
      .then((p) => !cancelled && setProducts(p))
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, status]);

  const visible = (products ?? []).filter((p) => ids.includes(p.id));

  const body = (
    <div className={embedded ? '' : 'container-site pb-(--spacing-section)'}>
      {!user && status !== 'loading' && ids.length > 0 && (
        <p className="mb-10 bg-bone px-5 py-4 text-sm text-stone-600">
          Your wishlist is saved on this device.{' '}
          <Link href="/login?next=/wishlist" className="underline underline-offset-4">
            Sign in
          </Link>{' '}
          to keep it across devices.
        </p>
      )}
      {products === null ? (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="skeleton aspect-[3/4]" />
              <div className="skeleton mt-4 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center border-y border-stone-200 py-24 text-center">
          <p className="font-display text-4xl font-light">Nothing saved yet</p>
          <p className="mt-4 max-w-md text-stone-500">Tap the heart on any piece to keep it here for later.</p>
          <ButtonLink href="/shop" className="mt-10">
            Explore the collection
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
          <AnimatePresence initial={false}>
            {visible.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.6, ease: EASE } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.35 } }}
              >
                <ProductCard product={p} sizes="(min-width: 1024px) 25vw, 50vw" />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );

  if (embedded) return body;
  return (
    <>
      <PageIntro eyebrow={`${ids.length} saved`} title="Wishlist" breadcrumbs={[{ name: 'Wishlist' }]} />
      {body}
    </>
  );
}
