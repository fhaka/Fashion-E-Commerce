'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ProductCard as Card, ProductDetail } from '@/lib/types';
import { cn, EASE } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { Img } from '../ui/Img';
import { Price } from '../ui/Price';
import { WishlistButton } from './WishlistButton';

export function ProductCard({
  product,
  priority = false,
  sizes = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw',
  className,
}: {
  product: Card;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);
  const swatchImage = hoverColor ? product.colors.find((c) => c.slug === hoverColor)?.image : null;
  const href = `/product/${product.slug}${hoverColor ? `?color=${hoverColor}` : ''}`;
  const badge = !product.inStock ? 'Sold out' : product.compareAtPrice ? 'Sale' : product.isNew ? 'New' : product.isBestSeller ? 'Best seller' : null;

  return (
    <article className={cn('group/card relative', className)}>
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
        <Link href={href} className="absolute inset-0" aria-label={product.name}>
          {product.image && (
            <Img
              src={swatchImage ?? product.image.url}
              alt={product.image.alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover transition-transform duration-[1.6s] ease-luxe group-hover/card:scale-[1.04]"
            />
          )}
          {product.hoverImage && !swatchImage && (
            <Img
              src={product.hoverImage.url}
              alt=""
              fill
              sizes={sizes}
              fadeIn={false}
              className="object-cover opacity-0 transition-opacity duration-700 ease-luxe group-hover/card:opacity-100 max-md:hidden"
            />
          )}
        </Link>

        {badge && (
          <span
            className={cn(
              'pointer-events-none absolute top-3 left-3 px-2 py-1 text-[0.6rem] tracking-[0.16em] uppercase',
              badge === 'Sale' ? 'bg-sale text-paper' : badge === 'Sold out' ? 'bg-stone-500 text-paper' : 'bg-paper text-ink',
            )}
          >
            {badge}
          </span>
        )}
        <WishlistButton productId={product.id} name={product.name} className="absolute top-2 right-2 rounded-full bg-paper/70 backdrop-blur-sm transition-colors hover:bg-paper" />

        {product.inStock && (
          <>
            <button
              type="button"
              onClick={() => setQuickAdd(true)}
              className="absolute right-3 bottom-3 left-3 flex h-10 translate-y-3 items-center justify-center gap-2 bg-paper/90 text-[0.66rem] tracking-[0.16em] uppercase opacity-0 backdrop-blur-sm transition-all duration-500 ease-luxe group-hover/card:translate-y-0 group-hover/card:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 max-md:hidden"
            >
              <Plus className="h-3.5 w-3.5" /> Quick add
            </button>
            <button
              type="button"
              onClick={() => setQuickAdd(true)}
              aria-label={`Quick add ${product.name}`}
              className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-paper/85 md:hidden"
            >
              <Plus className="h-4 w-4" />
            </button>
          </>
        )}

        <AnimatePresence>{quickAdd && <QuickAdd product={product} colorSlug={hoverColor} onClose={() => setQuickAdd(false)} />}</AnimatePresence>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[0.92rem]">
            <Link href={href} className="hover:underline hover:underline-offset-4">
              {product.name}
            </Link>
          </h3>
          <Price price={product.price} compareAtPrice={product.compareAtPrice} className="mt-1 text-sm text-stone-600" />
        </div>
        {product.colors.length > 1 && (
          <ul className="flex shrink-0 items-center gap-1.5 sm:mt-1" aria-label="Available colours">
            {product.colors.slice(0, 4).map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onMouseEnter={() => setHoverColor(c.slug)}
                  onMouseLeave={() => setHoverColor(null)}
                  onFocus={() => setHoverColor(c.slug)}
                  onBlur={() => setHoverColor(null)}
                  aria-label={c.name}
                  className={cn('block h-3 w-3 rounded-full ring-1 ring-stone-300 ring-offset-2 transition-shadow', hoverColor === c.slug && 'ring-ink')}
                  style={{ backgroundColor: c.hex }}
                />
              </li>
            ))}
            {product.colors.length > 4 && <li className="text-[0.65rem] text-stone-500">+{product.colors.length - 4}</li>}
          </ul>
        )}
      </div>
    </article>
  );
}

/** Size picker that slides up over the card image. Loads variant data on demand. */
function QuickAdd({ product, colorSlug, onClose }: { product: Card; colorSlug: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [error, setError] = useState(false);
  const add = useCart((s) => s.add);
  const pending = useCart((s) => s.pending);

  useEffect(() => {
    let cancelled = false;
    api<ProductDetail>(`/products/${product.slug}`, { auth: false })
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [product.slug]);

  const color = detail?.colors.find((c) => c.slug === colorSlug) ?? detail?.colors[0];

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-10 bg-paper/95 p-4 backdrop-blur-md"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.5, ease: EASE }}
      role="dialog"
      aria-label={`Choose a size for ${product.name}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[0.66rem] tracking-[0.16em] uppercase">
          Select size{color && detail && detail.colors.length > 1 ? ` · ${color.name}` : ''}
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="-m-1 p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-sale">Could not load sizes. Please try again.</p>
      ) : !detail || !color ? (
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-9 flex-1" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {detail.sizes.map((s) => {
            const v = detail.variants.find((x) => x.colorId === color.id && x.sizeId === s.id);
            const disabled = !v || v.available === 0;
            const busy = v ? pending.has(v.id) : false;
            return (
              <button
                key={s.id}
                type="button"
                disabled={disabled || busy}
                onClick={async () => {
                  if (v && (await add(v.id, 1))) onClose();
                }}
                className={cn(
                  'h-9 min-w-10 flex-1 border px-2 text-xs transition-colors',
                  disabled ? 'border-stone-200 text-stone-300 line-through' : 'border-stone-300 hover:border-ink hover:bg-ink hover:text-bone',
                )}
                aria-label={`${s.label}${disabled ? ' — sold out' : ''}`}
              >
                {busy ? '…' : s.label}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
