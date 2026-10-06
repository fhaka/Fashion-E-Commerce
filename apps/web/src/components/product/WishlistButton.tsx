'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/stores/wishlist';
import { useFeature } from '../layout/SiteProvider';

function WishlistButtonInner({ productId, name, className, size = 'md' }: { productId: string; name: string; className?: string; size?: 'md' | 'lg' }) {
  const saved = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(productId, name);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cn('relative flex items-center justify-center', size === 'lg' ? 'h-12 w-12 border border-stone-300 hover:border-ink' : 'h-9 w-9', className)}
    >
      <motion.span key={saved ? 'on' : 'off'} initial={{ scale: saved ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
        <Heart className={cn(size === 'lg' ? 'h-5 w-5' : 'h-[1.05rem] w-[1.05rem]', saved && 'fill-current')} strokeWidth={1.3} />
      </motion.span>
      {/* Burst ring when saving */}
      <AnimatePresence>
        {saved && (
          <motion.span
            key="burst"
            className="pointer-events-none absolute inset-0 m-auto h-6 w-6 rounded-full border border-current"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </button>
  );
}

/** Rendered only when the store plan includes "wishlist". */
export function WishlistButton(props: { productId: string; name: string; className?: string; size?: 'md' | 'lg' }) {
  return useFeature('wishlist') ? <WishlistButtonInner {...props} /> : null;
}
