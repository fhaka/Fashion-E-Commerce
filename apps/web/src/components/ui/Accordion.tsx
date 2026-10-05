'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn, EASE } from '@/lib/utils';

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  className,
  badge,
  level = 3,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  badge?: ReactNode;
  /** Heading level of the trigger, so it fits the page's outline. */
  level?: 2 | 3 | 4;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const Heading = `h${level}` as const;
  return (
    <div className={cn('border-b border-stone-200', className)}>
      <Heading>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 py-5 text-left text-[0.72rem] tracking-[0.16em] uppercase"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="flex items-center gap-2">
            {title}
            {badge}
          </span>
          <Plus className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-500 ease-luxe', open && 'rotate-45')} strokeWidth={1.5} />
        </button>
      </Heading>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
