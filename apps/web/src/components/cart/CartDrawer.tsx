'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import type { CartItem } from '@/lib/types';
import { cn, EASE, formatMoney } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';
import { useSite } from '../layout/SiteProvider';
import { ButtonLink } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Img } from '../ui/Img';

export function CartDrawer() {
  const { cartOpen, closeCart } = useUi();
  const { cart, loaded } = useCart();
  const threshold = useSite().freeShippingThreshold;
  const remaining = threshold === null ? 0 : Math.max(0, threshold - cart.subtotal);
  const progress = threshold ? Math.min(1, cart.subtotal / threshold) : 1;

  return (
    <Drawer
      open={cartOpen}
      onClose={closeCart}
      title={
        <span>
          Your bag <span className="text-stone-500">({cart.itemCount})</span>
        </span>
      }
      footer={
        cart.items.length > 0 && (
          <div className="space-y-4 px-6 py-6">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.72rem] tracking-[0.16em] uppercase">Subtotal</span>
              <span className="font-display text-2xl tabular-nums">{formatMoney(cart.subtotal)}</span>
            </div>
            <p className="text-xs text-stone-500">Shipping and taxes calculated at checkout.</p>
            {cart.hasIssues && (
              <p className="bg-sale/5 px-3 py-2 text-xs text-sale" role="alert">
                Some items have changed availability. Please review your bag.
              </p>
            )}
            <div className="grid gap-2">
              <ButtonLink href="/checkout" onClick={closeCart} size="lg" className="w-full" aria-disabled={cart.hasIssues}>
                Checkout
              </ButtonLink>
              <ButtonLink href="/cart" onClick={closeCart} variant="outline" className="w-full">
                View bag
              </ButtonLink>
            </div>
          </div>
        )
      }
    >
      {cart.items.length > 0 && threshold !== null && (
        <div className="border-b border-stone-200 px-6 py-5">
          <p className="mb-3 text-xs text-stone-600">
            {remaining > 0 ? (
              <>
                You are <strong className="font-medium text-ink">{formatMoney(remaining)}</strong> away from complimentary shipping
              </>
            ) : (
              <>You have unlocked complimentary shipping</>
            )}
          </p>
          <div className="h-[2px] w-full overflow-hidden bg-stone-200" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full bg-ink" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.9, ease: EASE }} />
          </div>
        </div>
      )}

      {!loaded ? (
        <div className="space-y-6 p-6">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="skeleton h-32 w-24" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : cart.items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
          <p className="font-display text-3xl">Your bag is empty</p>
          <p className="mt-3 max-w-xs text-sm text-stone-500">Discover pieces made to be worn for years — and loved for longer.</p>
          <div className="mt-8 grid w-full max-w-xs gap-2">
            <ButtonLink href="/shop?isNew=true" onClick={closeCart}>
              Shop new arrivals
            </ButtonLink>
            <ButtonLink href="/shop?bestSeller=true" onClick={closeCart} variant="outline">
              Best sellers
            </ButtonLink>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 px-6">
          <AnimatePresence initial={false}>
            {cart.items.map((item) => (
              <CartLine key={item.id} item={item} onNavigate={closeCart} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Drawer>
  );
}

export function CartLine({ item, onNavigate, large = false }: { item: CartItem; onNavigate?: () => void; large?: boolean }) {
  const { update, remove } = useCart();
  const max = Math.max(item.maxQuantity, item.quantity);
  const issueText =
    item.issue === 'OUT_OF_STOCK' ? 'Sold out — please remove' : item.issue === 'UNAVAILABLE' ? 'No longer available' : item.issue === 'INSUFFICIENT_STOCK' ? `Only ${item.available} left` : null;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="overflow-hidden"
    >
      <div className={cn('flex gap-4 py-6', large && 'gap-6 sm:py-8')}>
        <Link href={`/product/${item.product.slug}`} onClick={onNavigate} className={cn('relative shrink-0 overflow-hidden bg-stone-100', large ? 'h-40 w-32 sm:h-48 sm:w-36' : 'h-32 w-24')}>
          {item.product.image && <Img src={item.product.image} alt={item.product.name} fill sizes="144px" className="object-cover" />}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/product/${item.product.slug}`} onClick={onNavigate} className={cn('leading-snug hover:underline', large ? 'font-display text-2xl' : 'text-sm')}>
              {item.product.name}
            </Link>
            <span className="shrink-0 text-sm tabular-nums">{formatMoney(item.lineTotal)}</span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs text-stone-500">
            <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-stone-300" style={{ backgroundColor: item.color.hex }} aria-hidden />
            {item.color.name} · {item.size}
          </p>
          {issueText && (
            <p className="mt-2 text-xs text-sale" role="status">
              {issueText}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="flex h-9 items-center border border-stone-300" role="group" aria-label={`Quantity for ${item.product.name}`}>
              <button
                type="button"
                className="flex h-full w-9 items-center justify-center disabled:opacity-30"
                onClick={() => (item.quantity <= 1 ? remove(item.id) : update(item.id, item.quantity - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">
                {item.quantity}
              </span>
              <button
                type="button"
                className="flex h-full w-9 items-center justify-center disabled:opacity-30"
                onClick={() => update(item.id, item.quantity + 1)}
                disabled={item.quantity >= max || !!item.issue}
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button type="button" onClick={() => remove(item.id)} className="link-underline text-xs text-stone-500">
              Remove
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  );
}
