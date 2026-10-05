'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Lock, RotateCcw, Truck } from 'lucide-react';
import { cn, EASE, formatMoney } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { useSite } from '../layout/SiteProvider';
import { RecentlyViewed } from '../product/RecentlyViewed';
import { ButtonLink } from '../ui/Button';
import { PageIntro } from '../ui/PageIntro';
import { CartLine } from './CartDrawer';

export function CartPageView() {
  const { cart, loaded } = useCart();
  const site = useSite();
  const threshold = site.freeShippingThreshold;
  const remaining = threshold === null ? Infinity : Math.max(0, threshold - cart.subtotal);
  const shipping = remaining === 0 ? 0 : site.shippingStandardPrice;
  // Estimate only: the exact amount (after discounts) is calculated at checkout.
  const rate = site.taxRate / 10_000;
  const estTax = site.pricesIncludeTax ? Math.round(cart.subtotal - cart.subtotal / (1 + rate)) : Math.round(cart.subtotal * rate);
  const estTotal = cart.subtotal + shipping + (site.pricesIncludeTax ? 0 : estTax);

  return (
    <>
      <PageIntro eyebrow={loaded ? `${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}` : 'Your selection'} title="Your bag" breadcrumbs={[{ name: 'Bag' }]} />
      <div className="container-site pb-(--spacing-section)">
        {!loaded ? (
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-7">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-6">
                  <div className="skeleton h-48 w-36" />
                  <div className="flex-1 space-y-3">
                    <div className="skeleton h-6 w-2/3" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
            <div className="skeleton h-72 lg:col-span-4 lg:col-start-9" />
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-col items-center border-y border-stone-200 py-24 text-center">
            <p className="font-display text-4xl font-light">Your bag is empty</p>
            <p className="mt-4 max-w-md text-stone-500">Pieces you add will appear here. They are not reserved until you check out.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/shop?isNew=true">Shop new arrivals</ButtonLink>
              <ButtonLink href="/wishlist" variant="outline">
                View wishlist
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-12">
            <ul className="divide-y divide-stone-200 border-y border-stone-200 lg:col-span-7">
              <AnimatePresence initial={false}>
                {cart.items.map((item) => (
                  <CartLine key={item.id} item={item} large />
                ))}
              </AnimatePresence>
            </ul>

            <aside className="lg:col-span-4 lg:col-start-9" aria-label="Order summary">
              <div className="lg:sticky lg:top-32">
                <div className="bg-bone p-6 sm:p-8">
                  <h2 className="font-display text-3xl font-light">Summary</h2>
                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-stone-600">Subtotal</dt>
                      <dd className="tabular-nums">{formatMoney(cart.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-stone-600">Standard shipping</dt>
                      <dd className="tabular-nums">{shipping === 0 ? 'Complimentary' : formatMoney(shipping)}</dd>
                    </div>
                    {site.taxRate > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-stone-600">{site.pricesIncludeTax ? 'Includes tax' : 'Estimated tax'}</dt>
                        <dd className="tabular-nums">{formatMoney(estTax)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-stone-300 pt-4 text-base">
                      <dt>Estimated total</dt>
                      <dd className="font-display text-2xl tabular-nums">{formatMoney(estTotal)}</dd>
                    </div>
                  </dl>

                  {threshold !== null && (
                    <div className="mt-6">
                      <p className="mb-2 text-xs text-stone-600">
                        {remaining > 0 ? `Add ${formatMoney(remaining)} for complimentary shipping` : 'Complimentary shipping unlocked'}
                      </p>
                      <div className="h-[2px] bg-stone-300">
                        <motion.div className="h-full bg-ink" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (cart.subtotal / Math.max(threshold, 1)) * 100)}%` }} transition={{ duration: 0.9, ease: EASE }} />
                      </div>
                    </div>
                  )}

                  {cart.hasIssues && (
                    <p className="mt-6 bg-sale/10 px-3 py-2 text-xs text-sale" role="alert">
                      Please remove or adjust unavailable items before checking out.
                    </p>
                  )}
                  <ButtonLink
                    href="/checkout"
                    size="lg"
                    className={cn('mt-6 w-full', cart.hasIssues && 'pointer-events-none opacity-50')}
                    aria-disabled={cart.hasIssues}
                    tabIndex={cart.hasIssues ? -1 : undefined}
                  >
                    <Lock className="h-3.5 w-3.5" /> Secure checkout
                  </ButtonLink>
                  <p className="mt-4 text-center text-xs text-stone-500">Discount codes can be applied at checkout.</p>
                </div>
                <ul className="mt-6 space-y-3 text-xs text-stone-600">
                  <li className="flex items-center gap-3">
                    <Truck className="h-4 w-4" strokeWidth={1.3} /> Standard delivery in {site.shippingStandardEta}
                  </li>
                  {site.returnDays > 0 && (
                    <li className="flex items-center gap-3">
                      <RotateCcw className="h-4 w-4" strokeWidth={1.3} /> Returns within {site.returnDays} days
                    </li>
                  )}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
      <RecentlyViewed />
    </>
  );
}
