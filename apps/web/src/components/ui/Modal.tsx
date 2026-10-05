'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn, EASE } from '@/lib/utils';
import { useScrollLock } from './Drawer';

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  bare = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** Full-screen, chrome-less (used by the image lightbox). */
  bare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => ref.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className={cn('absolute inset-0', bare ? 'bg-paper' : 'bg-ink/50 backdrop-blur-[2px]')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={ref}
            tabIndex={-1}
            className={cn('relative outline-none', bare ? 'h-full w-full' : 'max-h-[88vh] w-full max-w-2xl overflow-y-auto bg-paper p-8 shadow-2xl sm:p-10', className)}
            initial={{ opacity: 0, y: bare ? 0 : 24, scale: bare ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: bare ? 0 : 12 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 transition-transform duration-500 ease-luxe hover:rotate-90"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.3} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
