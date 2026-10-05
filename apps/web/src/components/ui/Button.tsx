import Link from 'next/link';
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'link';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium uppercase tracking-[0.16em] transition-colors duration-500 ease-luxe disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-bone hover:text-ink',
  secondary: 'bg-bone text-ink hover:text-bone',
  outline: 'border border-ink text-ink hover:text-bone',
  ghost: 'text-ink hover:bg-stone-100',
  light: 'border border-bone/70 text-bone hover:text-ink',
  link: 'link-underline px-0! py-1! tracking-[0.18em] text-ink',
};

/** The "fill" layer that sweeps up on hover, giving buttons a tailored feel. */
const fills: Partial<Record<Variant, string>> = {
  primary: 'bg-bone',
  secondary: 'bg-ink',
  outline: 'bg-ink',
  light: 'bg-bone',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-5 text-[0.68rem]',
  md: 'h-12 px-7 text-[0.7rem]',
  lg: 'h-14 px-9 text-[0.72rem]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

function Inner({ variant = 'primary', loading, children }: Pick<CommonProps, 'variant' | 'loading' | 'children'>) {
  const fill = fills[variant];
  return (
    <>
      {fill && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-luxe group-hover/btn:scale-y-100',
            fill,
            variant === 'primary' && 'ring-1 ring-inset ring-ink',
          )}
        />
      )}
      <span className={cn('relative z-10 inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
          <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
        </span>
      )}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & ComponentProps<'button'>>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <Inner variant={variant} loading={loading}>
        {children}
      </Inner>
    </button>
  );
});

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      <Inner variant={variant}>{children}</Inner>
    </Link>
  );
}
