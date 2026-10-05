'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { cn, EASE } from '@/lib/utils';
import { useToast } from '@/stores/toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.25 } }}
            transition={{ duration: 0.5, ease: EASE }}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-4 px-5 py-4 text-sm shadow-xl',
              t.tone === 'error' ? 'bg-sale text-paper' : 'bg-ink text-bone',
            )}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <Link href={t.action.href} onClick={() => dismiss(t.id)} className="text-[0.7rem] tracking-[0.16em] underline underline-offset-4 uppercase">
                {t.action.label}
              </Link>
            )}
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
