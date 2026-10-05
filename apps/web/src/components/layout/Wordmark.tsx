'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn, EASE } from '@/lib/utils';
import { useSite } from './SiteProvider';

/**
 * The store's logo (Admin → Settings → Logo) or, without one, its name set in the display
 * typeface. `className` sizes the text version; `logoClassName` sizes the image.
 */
export function Wordmark({ className, logoClassName = 'h-8' }: { className?: string; logoClassName?: string }) {
  const { storeName, logoUrl } = useSite();
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={storeName} className={cn('block w-auto object-contain', logoClassName)} />;
  }
  return <span className={cn('font-display leading-none uppercase', className)}>{storeName}</span>;
}

/** Header announcement bar: the messages from Admin → Settings, rotating every few seconds. */
export function Announcements({ className }: { className?: string }) {
  const messages = useSite().announcements;
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(id);
  }, [messages.length]);
  if (!messages.length) return null;
  const current = messages[index % messages.length];
  return (
    <p className={cn('relative flex h-9 items-center justify-center overflow-hidden px-4 text-center text-[0.68rem] tracking-[0.18em] uppercase', className)} aria-live="off">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={reduce ? false : { y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="block truncate"
        >
          {current}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}
