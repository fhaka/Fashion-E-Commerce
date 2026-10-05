'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { emailSchema } from '@maison/shared';
import { api, ApiRequestError } from '@/lib/api';
import { cn, EASE } from '@/lib/utils';

export function NewsletterForm({ source = 'footer', tone = 'dark', className }: { source?: string; tone?: 'dark' | 'light'; className?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const dark = tone === 'dark';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setState('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    setState('loading');
    try {
      const res = await api<{ message: string }>('/newsletter/subscribe', { method: 'POST', body: { email: parsed.data, source }, auth: false });
      setState('done');
      setMessage(res.message);
    } catch (err) {
      setState('error');
      setMessage(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {state === 'done' ? (
          <motion.p
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-3 py-3 text-sm"
            role="status"
          >
            <Check className="h-4 w-4" /> {message}
          </motion.p>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} noValidate exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <div className={cn('group flex items-center border-b transition-colors', dark ? 'border-bone/40 focus-within:border-bone' : 'border-ink/30 focus-within:border-ink')}>
              <label htmlFor={`newsletter-${source}`} className="sr-only">
                Email address
              </label>
              <input
                id={`newsletter-${source}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === 'error') setState('idle');
                }}
                placeholder="Your email address"
                aria-invalid={state === 'error'}
                aria-describedby={state === 'error' ? `newsletter-${source}-error` : undefined}
                className={cn('min-w-0 flex-1 bg-transparent py-3 text-sm outline-none', dark ? 'placeholder:text-bone/50' : 'placeholder:text-stone-500')}
              />
              <button type="submit" disabled={state === 'loading'} aria-label="Subscribe" className="flex items-center gap-2 py-3 pl-4 text-[0.7rem] tracking-[0.18em] uppercase">
                {state === 'loading' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
                ) : (
                  <>
                    Subscribe <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-luxe group-focus-within:translate-x-1" />
                  </>
                )}
              </button>
            </div>
            {state === 'error' && (
              <p id={`newsletter-${source}-error`} className={cn('mt-2 text-xs', dark ? 'text-[#e8a39b]' : 'text-sale')} role="alert">
                {message}
              </p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
