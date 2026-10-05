import { cn, discountPercent, formatMoney } from '@/lib/utils';

export function Price({
  price,
  compareAtPrice,
  className,
  showDiscount = false,
}: {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
  showDiscount?: boolean;
}) {
  const pct = discountPercent(price, compareAtPrice);
  return (
    <span className={cn('inline-flex items-baseline gap-2 tabular-nums', className)}>
      <span className={cn(pct && 'text-sale')}>
        <span className="sr-only">{pct ? 'Sale price' : 'Price'}: </span>
        {formatMoney(price)}
      </span>
      {pct && (
        <>
          <s className="text-stone-500">
            <span className="sr-only">Original price: </span>
            {formatMoney(compareAtPrice!)}
          </s>
          {showDiscount && <span className="text-[0.7rem] tracking-wider text-sale uppercase">−{pct}%</span>}
        </>
      )}
    </span>
  );
}
