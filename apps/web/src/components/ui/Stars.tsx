import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stars({ rating, className, size = 'sm' }: { rating: number; className?: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5';
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span key={i} className={cn('relative', s)} aria-hidden>
            <Star className={cn('absolute inset-0 text-stone-300', s)} strokeWidth={1.2} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn('fill-ink text-ink', s)} strokeWidth={1.2} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
