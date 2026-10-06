'use client';

import { motion, useInView, useReducedMotion, useScroll, useTransform, type Variants } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { cn, EASE } from '@/lib/utils';
import { useFeature } from '../layout/SiteProvider';

/**
 * Decorative motion (reveals, split headlines, parallax, page transitions) is part of the
 * Premium plan. Without it, or when the visitor prefers reduced motion, everything renders
 * in its final state.
 */
export function useStaticMotion() {
  const reduce = useReducedMotion();
  const motionDesign = useFeature('motion');
  return !!reduce || !motionDesign;
}

/* ───────────────────────── Reveal ───────────────────────── */

/** Fades and lifts content into view once, when it scrolls into the viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  duration = 0.9,
  as = 'div',
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  as?: 'div' | 'section' | 'li' | 'span' | 'p' | 'h2';
  amount?: number;
}) {
  const reduce = useStaticMotion();
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </Comp>
  );
}

/* ───────────────────────── Stagger ───────────────────────── */

const staggerParent = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

export function Stagger({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: 'div' | 'ul';
}) {
  const reduce = useStaticMotion();
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      variants={staggerParent(stagger, delay)}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' }) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp className={className} variants={staggerChild}>
      {children}
    </Comp>
  );
}

/* ───────────────────────── Split text ───────────────────────── */

/**
 * Editorial headline animation: each word rises from behind a mask.
 * Screen readers get the plain sentence via aria-label.
 */
export function SplitText({
  text,
  className,
  delay = 0,
  stagger = 0.06,
  as = 'h2',
  inView = true,
  id,
}: {
  id?: string;
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  /** When false the animation plays on mount (e.g. hero) instead of on scroll. */
  inView?: boolean;
}) {
  const reduce = useStaticMotion();
  const Comp = motion[as] as typeof motion.h2;
  const words = text.split(' ');
  const trigger = inView ? { whileInView: 'show', viewport: { once: true, amount: 0.5 } } : { animate: 'show' };
  return (
    <Comp id={id} className={className} aria-label={text} initial={reduce ? false : 'hidden'} {...trigger} variants={staggerParent(stagger, delay)}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block will-change-transform"
            variants={{ hidden: { y: '110%' }, show: { y: '0%', transition: { duration: 1.1, ease: EASE } } }}
          >
            {word}
            {i < words.length - 1 && ' '}
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}

/* ───────────────────────── Parallax ───────────────────────── */

/** Moves its child vertically relative to scroll for a subtle depth effect. */
export function Parallax({ children, className, offset = 80 }: { children: ReactNode; className?: string; offset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useStaticMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-offset, offset]);
  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <motion.div style={{ y }} className="absolute inset-[-10%_0] will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Image reveal ───────────────────────── */

/** A curtain that wipes away to reveal an image as it enters the viewport. */
export function ImageReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useStaticMotion();
  // Observe the unclipped wrapper: an element clipped to nothing never reports as intersecting.
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shown = reduce || inView;
  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
        animate={shown ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}
        transition={{ duration: 1.3, delay, ease: EASE }}
      >
        <motion.div
          className="relative h-full w-full"
          initial={reduce ? false : { scale: 1.18 }}
          animate={shown ? { scale: 1 } : undefined}
          transition={{ duration: 1.8, delay, ease: EASE }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Marquee ───────────────────────── */

export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (
    <div className="flex shrink-0 items-center gap-12 pr-12">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-12 whitespace-nowrap">
          {item}
          <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-current opacity-50" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn('flex overflow-hidden', className)} role="marquee" aria-label={items.join(', ')}>
      <div className="flex animate-marquee hover:[animation-play-state:paused]" aria-hidden>
        {row}
        {row}
      </div>
    </div>
  );
}
