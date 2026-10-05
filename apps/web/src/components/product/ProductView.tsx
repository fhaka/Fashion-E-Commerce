'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, Ruler, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProductDetail } from '@/lib/types';
import { cn, EASE, formatMoney } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { useRecentlyViewed } from '@/stores/recentlyViewed';
import { AccordionItem } from '../ui/Accordion';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Price } from '../ui/Price';
import { Stars } from '../ui/Stars';
import { ProductGallery } from './ProductGallery';
import { SizeGuide } from './SizeGuide';
import { WishlistButton } from './WishlistButton';

export function ProductView({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const pending = useCart((s) => s.pending);
  const track = useRecentlyViewed((s) => s.track);

  const [colorId, setColorId] = useState(product.colors[0]?.id);
  const [sizeId, setSizeId] = useState<string | null>(() => (product.sizes.length === 1 ? product.sizes[0].id : null));
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);

  useEffect(() => track(product.id), [product.id, track]);

  // Honour a shared ?color= link after mount (keeps the page statically rendered for SEO).
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('color');
    const match = product.colors.find((c) => c.slug === slug);
    if (match) setColorId(match.id);
  }, [product.colors]);

  // Show the sticky mobile bar once the main add-to-bag button scrolls away.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    // Shown only once the button has been scrolled *past* (fully above the viewport). A scroll check is used
    // rather than IntersectionObserver, which never fires when a fast scroll jumps from below the fold to above it.
    let frame = 0;
    const check = () => {
      frame = 0;
      setCtaVisible(el.getBoundingClientRect().bottom > 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const color = product.colors.find((c) => c.id === colorId);
  const images = useMemo(() => {
    const forColor = product.images.filter((i) => i.colorId === colorId);
    return forColor.length ? forColor : product.images;
  }, [product.images, colorId]);
  const variant = product.variants.find((v) => v.colorId === colorId && v.sizeId === sizeId);
  const sizeLabel = product.sizes.find((s) => s.id === sizeId)?.label;
  const colorInStock = product.variants.some((v) => v.colorId === colorId && v.available > 0);
  const maxQty = Math.min(variant?.available ?? 1, 10);

  const selectColor = (id: string) => {
    setColorId(id);
    setQty(1);
    // Keep the size if it's available in the new colour.
    const keep = sizeId && product.variants.find((v) => v.colorId === id && v.sizeId === sizeId && v.available > 0);
    if (!keep) setSizeId(product.sizes.length === 1 ? product.sizes[0].id : null);
    const slug = product.colors.find((c) => c.id === id)?.slug;
    // Shareable URL without a server round-trip.
    const url = new URL(window.location.href);
    if (slug && id !== product.colors[0]?.id) url.searchParams.set('color', slug);
    else url.searchParams.delete('color');
    window.history.replaceState(null, '', url);
  };

  const requireSize = () => {
    if (variant) return true;
    setSizeError(true);
    document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  };

  const addToBag = async () => {
    if (!requireSize() || !variant) return;
    await add(variant.id, qty);
  };

  const buyNow = () => {
    if (!requireSize() || !variant) return;
    setBuying(true);
    router.push(`/checkout?buy=${variant.id}&qty=${qty}`);
  };

  const stock = !variant
    ? null
    : variant.available === 0
      ? { tone: 'text-sale', text: 'Sold out in this size' }
      : variant.lowStock
        ? { tone: 'text-camel-dark', text: `Only ${variant.available} left — order soon` }
        : { tone: 'text-success', text: 'In stock — ready to ship in 1–2 business days' };

  return (
    <>
      <div className="container-site pt-6 pb-(--spacing-section) lg:pt-10">
        <Breadcrumbs items={[...product.breadcrumbs, { name: product.name }]} className="mb-8" />

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-28">
              <ProductGallery images={images} videoUrl={product.videoUrl} name={product.name} />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="flex flex-wrap items-center gap-2">
              {product.isNew && <span className="border border-ink px-2 py-1 text-[0.6rem] tracking-[0.16em] uppercase">New</span>}
              {product.isBestSeller && <span className="bg-bone px-2 py-1 text-[0.6rem] tracking-[0.16em] uppercase">Best seller</span>}
              {product.compareAtPrice && <span className="bg-sale px-2 py-1 text-[0.6rem] tracking-[0.16em] text-paper uppercase">Sale</span>}
            </div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mt-4 font-display text-[clamp(2.25rem,1.6rem+2.2vw,3.5rem)] leading-[1.02] font-light">
              {product.name}
            </motion.h1>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={variant?.price ?? product.price} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
                  <Price price={variant?.price ?? product.price} compareAtPrice={product.compareAtPrice} showDiscount className="text-lg" />
                </motion.div>
              </AnimatePresence>
              {product.ratingCount > 0 && (
                <a href="#reviews" className="flex items-center gap-2 text-xs text-stone-600 hover:text-ink">
                  <Stars rating={product.ratingAvg} />
                  <span className="underline underline-offset-4">
                    {product.ratingAvg.toFixed(1)} ({product.ratingCount})
                  </span>
                </a>
              )}
            </div>

            <p className="mt-6 leading-relaxed text-stone-600">{product.description}</p>

            {/* Colour */}
            {product.colors.length > 0 && (
              <fieldset className="mt-8">
                <legend className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">
                  Colour — <span className="tracking-normal text-stone-600 normal-case">{color?.name}</span>
                  {!colorInStock && <span className="ml-2 tracking-normal text-sale normal-case">(sold out)</span>}
                </legend>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((c) => {
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectColor(c.id)}
                        aria-pressed={c.id === colorId}
                        aria-label={c.name}
                        title={c.name}
                        className={cn('group relative flex flex-col items-center gap-2')}
                      >
                        <span
                          className={cn('block h-9 w-9 rounded-full ring-1 ring-offset-[3px] transition-all duration-300', c.id === colorId ? 'ring-ink' : 'ring-stone-300 group-hover:ring-stone-500')}
                          style={{ backgroundColor: c.hex }}
                        />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Size */}
            {!(product.sizes.length === 1 && product.sizes[0].label === 'One Size') && (
              <fieldset id="size-picker" className="mt-8 scroll-mt-40">
                <div className="mb-3 flex items-center justify-between">
                  <legend className="text-[0.7rem] tracking-[0.16em] uppercase">
                    Size{sizeLabel && <span className="tracking-normal text-stone-600 normal-case"> — {sizeLabel}</span>}
                  </legend>
                  <button type="button" onClick={() => setGuideOpen(true)} className="flex items-center gap-1.5 text-xs text-stone-600 underline-offset-4 hover:underline">
                    <Ruler className="h-3.5 w-3.5" strokeWidth={1.3} /> Size guide
                  </button>
                </div>
                <div className={cn('grid grid-cols-5 gap-2 rounded-sm transition-shadow', sizeError && 'ring-1 ring-sale ring-offset-4')}>
                  {product.sizes.map((s) => {
                    const v = product.variants.find((x) => x.colorId === colorId && x.sizeId === s.id);
                    const soldOut = !v || v.available === 0;
                    const selected = s.id === sizeId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={soldOut}
                        aria-pressed={selected}
                        aria-label={`${s.label}${soldOut ? ', sold out' : v?.lowStock ? ', low stock' : ''}`}
                        onClick={() => {
                          setSizeId(s.id);
                          setSizeError(false);
                          setQty(1);
                        }}
                        className={cn(
                          'relative h-12 border text-sm transition-colors duration-300',
                          selected ? 'border-ink bg-ink text-bone' : soldOut ? 'cursor-not-allowed border-stone-200 text-stone-300' : 'border-stone-300 hover:border-ink',
                        )}
                      >
                        {s.label}
                        {soldOut && <span aria-hidden className="absolute inset-0 m-auto h-px w-[70%] -rotate-[20deg] bg-stone-300" />}
                        {!soldOut && v?.lowStock && !selected && <span aria-hidden className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-camel" />}
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {sizeError && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 text-xs text-sale" role="alert">
                      Please select a size.
                    </motion.p>
                  )}
                </AnimatePresence>
              </fieldset>
            )}

            {/* Stock indicator */}
            <div className="mt-5 h-5" aria-live="polite">
              <AnimatePresence mode="wait">
                {stock && (
                  <motion.p key={stock.text} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className={cn('flex items-center gap-2 text-xs', stock.tone)}>
                    <span className="relative flex h-2 w-2">
                      {variant?.lowStock && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />}
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                    </span>
                    {stock.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div ref={ctaRef} className="mt-6 space-y-3">
              <div className="flex gap-3">
                <div className="flex h-14 items-center border border-stone-300" role="group" aria-label="Quantity">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="flex h-full w-11 items-center justify-center disabled:opacity-30" aria-label="Decrease quantity">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                    {qty}
                  </span>
                  <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={!variant || qty >= maxQty} className="flex h-full w-11 items-center justify-center disabled:opacity-30" aria-label="Increase quantity">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button size="lg" className="flex-1" onClick={addToBag} disabled={!colorInStock || variant?.available === 0} loading={variant ? pending.has(variant.id) : false}>
                  {!colorInStock ? 'Sold out' : 'Add to bag'}
                </Button>
                <WishlistButton productId={product.id} name={product.name} size="lg" className="h-14 w-14" />
              </div>
              <Button size="lg" variant="outline" className="w-full" onClick={buyNow} disabled={!colorInStock || variant?.available === 0} loading={buying}>
                Buy now
              </Button>
            </div>

            <ul className="mt-8 grid gap-3 border-y border-stone-200 py-6 text-xs text-stone-600">
              <li className="flex items-center gap-3">
                <Truck className="h-4 w-4 shrink-0" strokeWidth={1.3} /> Complimentary shipping on orders over {formatMoney(25000)}
              </li>
              <li className="flex items-center gap-3">
                <RotateCcw className="h-4 w-4 shrink-0" strokeWidth={1.3} /> Free returns and exchanges within 30 days
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.3} /> Secure checkout · Lifetime repairs on outerwear
              </li>
            </ul>

            <div className="mt-2">
              <AccordionItem level={2} title="Details" defaultOpen>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-600 marker:text-stone-500">
                  {product.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                {variant && <p className="mt-4 text-xs text-stone-500">Ref. {variant.sku}</p>}
              </AccordionItem>
              {(product.materials || product.care) && (
                <AccordionItem level={2} title="Materials & care">
                  {product.materials && <p className="text-sm text-stone-600">{product.materials}</p>}
                  {product.care && <p className="mt-3 text-sm text-stone-600">{product.care}</p>}
                </AccordionItem>
              )}
              <AccordionItem level={2} title="Shipping & returns">
                <div className="space-y-3 text-sm text-stone-600">
                  <p>Standard delivery (3–5 business days): {formatMoney(1200)}, complimentary on orders over {formatMoney(25000)}.</p>
                  <p>Express delivery (1–2 business days): {formatMoney(2500)}.</p>
                  <p>
                    Returns are free within 30 days of delivery. Items must be unworn with tags attached.{' '}
                    <Link href="/shipping-returns" className="underline underline-offset-4">
                      Full policy
                    </Link>
                  </p>
                </div>
              </AccordionItem>
              {product.collections.length > 0 && (
                <AccordionItem level={2} title="Part of">
                  <ul className="flex flex-wrap gap-2">
                    {product.collections.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/collections/${c.slug}`} className="block border border-stone-300 px-3 py-1.5 text-xs hover:border-ink">
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky add-to-bag bar (mobile) */}
      <AnimatePresence>
        {!ctaVisible && colorInStock && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-paper/95 px-4 py-3 backdrop-blur-md lg:hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{product.name}</p>
                <p className="text-xs text-stone-500">
                  {color?.name}
                  {sizeLabel ? ` · ${sizeLabel}` : ''} · {formatMoney(variant?.price ?? product.price)}
                </p>
              </div>
              <Button size="md" onClick={addToBag} loading={variant ? pending.has(variant.id) : false}>
                {variant ? 'Add to bag' : 'Select size'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Size guide">
        <SizeGuide sizes={product.sizes.map((s) => s.label)} />
      </Modal>
    </>
  );
}
