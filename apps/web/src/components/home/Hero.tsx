'use client';

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Banner } from '@/lib/types';
import { cn, EASE } from '@/lib/utils';
import { useUi } from '@/stores/ui';
import { SplitText } from '../motion';
import { ButtonLink } from '../ui/Button';
import { Img } from '../ui/Img';

const SLIDE_MS = 7000;

export function Hero({ slides }: { slides: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '35%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.12]);

  const setHeroTone = useUi((s) => s.setHeroTone);
  // LIGHT slides get dark type — on tablet/desktop only, since mobile crops use their own image.
  const light = slides[index]?.theme === 'LIGHT';
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setHeroTone(light && mq.matches ? 'light' : 'dark');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [light, setHeroTone]);
  useEffect(() => () => setHeroTone('dark'), [setHeroTone]);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused || reduce) return;
    const t = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, next, slides.length, reduce]);

  if (!slides.length) return null;
  const slide = slides[index];

  return (
    <section
      ref={ref}
      className="relative h-[100svh] min-h-[38rem] overflow-hidden bg-ink"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div className="absolute inset-0" style={{ scale: imageScale }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.2, ease: EASE }, scale: { duration: SLIDE_MS / 1000 + 1.5, ease: 'linear' } }}
          >
            <Img src={slide.image} alt="" fill priority={index === 0} sizes="100vw" fadeIn={index !== 0} className={cn('object-cover', slide.mobileImage && 'max-md:hidden')} />
            {slide.mobileImage && (
              <Img src={slide.mobileImage} alt="" fill priority={index === 0} sizes="100vw" fadeIn={index !== 0} className="object-cover md:hidden" />
            )}
          </motion.div>
        </AnimatePresence>
        {/* Legibility gradient */}
        <div
          className={cn(
            'absolute inset-0',
            'bg-gradient-to-t from-ink/75 via-ink/25 to-ink/35 transition-opacity duration-1000',
            light && 'md:opacity-0',
          )}
        />
        {/* Light veil for LIGHT slides keeps dark type legible over pale imagery */}
        <div
          className={cn(
            'absolute inset-0 hidden bg-gradient-to-r from-bone/80 via-bone/30 to-transparent transition-opacity duration-1000 md:block',
            light ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-x-0 top-0 hidden h-[32%] bg-gradient-to-b from-bone/90 via-bone/50 to-transparent transition-opacity duration-1000 md:block',
            light ? 'opacity-100' : 'opacity-0',
          )}
        />
      </motion.div>

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative z-10 flex h-full items-end">
        <div className={cn('container-site pb-28 text-bone transition-colors duration-700 lg:pb-32', light && 'md:text-ink')}>
          <AnimatePresence mode="wait">
            <motion.div key={slide.id} exit={{ opacity: 0, y: -20, transition: { duration: 0.5, ease: EASE } }} className="max-w-4xl">
              {slide.eyebrow && (
                <motion.p
                  className="eyebrow mb-6"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
                >
                  {slide.eyebrow}
                </motion.p>
              )}
              <SplitText as={index === 0 ? 'h1' : 'h2'} text={slide.title} inView={false} delay={0.3} stagger={0.08} className="font-display text-display-lg font-light" />
              {slide.subtitle && (
                <motion.p
                  className={cn('mt-6 max-w-lg text-base opacity-85 lg:text-lg')}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
                >
                  {slide.subtitle}
                </motion.p>
              )}
              {slide.ctaHref && slide.ctaLabel && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.95, ease: EASE }} className="mt-10">
                  <ButtonLink href={slide.ctaHref} variant="light" size="lg" className={cn(light && 'md:hidden')}>
                    {slide.ctaLabel}
                  </ButtonLink>
                  {light && (
                    <ButtonLink href={slide.ctaHref} variant="outline" size="lg" className="max-md:hidden">
                      {slide.ctaLabel}
                    </ButtonLink>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Slide controls with progress */}
      {slides.length > 1 && (
        <div className="absolute right-0 bottom-8 left-0 z-10">
          <div className={cn('container-site flex items-center justify-between text-bone transition-colors duration-700', light && 'md:text-ink')}>
            <div className="flex items-center gap-3" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${s.title}`}
                  onClick={() => setIndex(i)}
                  className="group py-3"
                >
                  <span className="relative block h-px w-10 overflow-hidden bg-current/30 sm:w-16">
                    {i === index && (
                      <motion.span
                        key={`${s.id}-${paused}`}
                        className="absolute inset-y-0 left-0 bg-current"
                        initial={{ width: reduce ? '100%' : '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: paused || reduce ? 0 : SLIDE_MS / 1000, ease: 'linear' }}
                      />
                    )}
                  </span>
                </button>
              ))}
              <span className="ml-2 text-[0.68rem] tracking-[0.18em] tabular-nums">
                {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>
            <motion.a
              href="#home-content"
              className="hidden items-center gap-3 text-[0.68rem] tracking-[0.18em] uppercase sm:flex"
              animate={reduce ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              Scroll <ArrowDown className="h-3.5 w-3.5" />
            </motion.a>
          </div>
        </div>
      )}
    </section>
  );
}
