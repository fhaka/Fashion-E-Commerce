'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ProductDetail } from '@/lib/types';
import { cn, EASE } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { Reveal, SplitText } from '../motion';
import { WishlistButton } from '../product/WishlistButton';
import { Button } from '../ui/Button';
import { Img } from '../ui/Img';
import { Price } from '../ui/Price';

export function FeaturedProduct({ product }: { product: ProductDetail }) {
  const [colorId, setColorId] = useState(product.colors[0]?.id);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const add = useCart((s) => s.add);
  const pending = useCart((s) => s.pending);

  const gallery = useMemo(() => {
    const forColor = product.images.filter((i) => i.colorId === colorId);
    return forColor.length ? forColor : product.images;
  }, [product.images, colorId]);
  const image = gallery[Math.min(imageIdx, gallery.length - 1)];
  const variant = product.variants.find((v) => v.colorId === colorId && v.sizeId === sizeId);
  const color = product.colors.find((c) => c.id === colorId);

  return (
    <section className="container-site py-(--spacing-section)" aria-labelledby="featured-product-heading">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <div className="grid grid-cols-[4.5rem_1fr] gap-4 sm:grid-cols-[5.5rem_1fr]">
            <ul className="flex flex-col gap-3" aria-label="Product images">
              {gallery.map((img, i) => (
                <li key={img.id}>
                  <button
                    type="button"
                    onClick={() => setImageIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-current={i === imageIdx}
                    className={cn('relative block aspect-[3/4] w-full overflow-hidden bg-stone-100 transition-opacity', i === imageIdx ? 'opacity-100 ring-1 ring-ink' : 'opacity-60 hover:opacity-100')}
                  >
                    <Img src={img.url} alt="" fill sizes="88px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={image?.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  {image && <Img src={image.url} alt={image.alt} fill sizes="(min-width: 1024px) 50vw, 85vw" className="object-cover" />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <Reveal y={12}>
            <p className="eyebrow mb-5 text-stone-500">The signature piece</p>
          </Reveal>
          <SplitText id="featured-product-heading" text={product.name} className="font-display text-display-sm font-light" />
          <Reveal delay={0.15}>
            <Price price={variant?.price ?? product.price} compareAtPrice={product.compareAtPrice} showDiscount className="mt-5 text-lg" />
            <p className="mt-6 leading-relaxed text-stone-600">{product.description}</p>
          </Reveal>

          <Reveal delay={0.25} className="mt-8 space-y-7">
            {product.colors.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">
                  Colour <span className="text-stone-500 normal-case tracking-normal">— {color?.name}</span>
                </legend>
                <div className="flex gap-3">
                  {product.colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setColorId(c.id);
                        setImageIdx(0);
                        setSizeId(null);
                      }}
                      aria-label={c.name}
                      aria-pressed={c.id === colorId}
                      className={cn('h-8 w-8 rounded-full ring-1 ring-offset-[3px] transition-all duration-300', c.id === colorId ? 'ring-ink' : 'ring-stone-300 hover:ring-stone-500')}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className="mb-3 text-[0.7rem] tracking-[0.16em] uppercase">Size</legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const v = product.variants.find((x) => x.colorId === colorId && x.sizeId === s.id);
                  const soldOut = !v || v.available === 0;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => setSizeId(s.id)}
                      aria-pressed={sizeId === s.id}
                      aria-label={`${s.label}${soldOut ? ' — sold out' : ''}`}
                      className={cn(
                        'h-11 min-w-12 border px-3 text-sm transition-colors duration-300',
                        sizeId === s.id ? 'border-ink bg-ink text-bone' : soldOut ? 'border-stone-200 text-stone-300 line-through' : 'border-stone-300 hover:border-ink',
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 h-4 text-xs text-stone-500" aria-live="polite">
                {variant ? (variant.lowStock ? <span className="text-camel-dark">Only {variant.available} left in this size</span> : 'In stock — ships in 1–2 days') : ''}
              </p>
            </fieldset>

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                disabled={!variant}
                loading={variant ? pending.has(variant.id) : false}
                onClick={() => variant && add(variant.id, 1)}
              >
                {variant ? 'Add to bag' : 'Select a size'}
              </Button>
              <WishlistButton productId={product.id} name={product.name} size="lg" />
            </div>
            <Link href={`/product/${product.slug}`} className="link-underline inline-block text-[0.7rem] tracking-[0.18em] uppercase">
              View full details
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
