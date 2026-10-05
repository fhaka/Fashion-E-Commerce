'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const control =
  'peer h-12 w-full border bg-transparent px-4 text-sm outline-none transition-colors duration-300 placeholder:text-stone-400 focus:border-ink disabled:bg-stone-100 disabled:text-stone-500';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(function Input(
  { label, error, hint, optional, className, type, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 flex items-baseline justify-between text-[0.68rem] tracking-[0.14em] uppercase">
        <span>{label}</span>
        {optional && <span className="tracking-normal text-stone-400 normal-case">Optional</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(control, error ? 'border-sale' : 'border-stone-300', isPassword && 'pr-12')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-stone-500 hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" strokeWidth={1.4} /> : <Eye className="h-4 w-4" strokeWidth={1.4} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-sale" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function Select({
  label,
  error,
  className,
  children,
  id,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-2 block text-[0.68rem] tracking-[0.14em] uppercase">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={!!error}
        className={cn(control, 'appearance-none bg-[length:10px] bg-[right_1rem_center] bg-no-repeat pr-10', error ? 'border-sale' : 'border-stone-300')}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%230e0e0e' stroke-width='1.2'/%3E%3C/svg%3E\")" }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1.5 text-xs text-sale" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: { label: ReactNode; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="mt-0.5 flex h-[1.05rem] w-[1.05rem] shrink-0 items-center justify-center border border-stone-400 transition-colors peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2 after:hidden after:h-2 after:w-1 after:translate-y-[-1px] after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-bone peer-checked:after:block"
      />
      <span className="text-stone-700">{label}</span>
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="border-l-2 border-sale bg-sale/5 px-4 py-3 text-sm text-sale" role="alert">
      {message}
    </div>
  );
}

/** Maps zod issues → { field: message } (first message per field). */
export function zodFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.join('.')] ??= i.message;
  return out;
}
