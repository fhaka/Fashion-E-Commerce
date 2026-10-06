'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Maximize2, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn, EASE } from '@/lib/utils';
import { useFeature } from '../layout/SiteProvider';
import { Img } from '../ui/Img';
import { Modal } from '../ui/Modal';

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
}

type Slide = { kind: 'image'; image: GalleryImage } | { kind: 'video'; url: string };

export function ProductGallery({ images, videoUrl, name }: { images: GalleryImage[]; videoUrl?: string | null; name: string }) {
  // Zoom, the full-screen lightbox and product video are part of the Premium plan.
  const media = useFeature('productMedia');
  const slides: Slide[] = [...images.map((image) => ({ kind: 'image' as const, image })), ...(videoUrl && media ? [{ kind: 'video' as const, url: videoUrl }] : [])];
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const key = images.map((i) => i.id).join();

  // New colour → back to the first image.
  useEffect(() => {
    setIndex(0);
    scroller.current?.scrollTo({ left: 0 });
  }, [key]);

  const go = (i: number) => setIndex((i + slides.length) % slides.length);
  const current = slides[Math.min(index, slides.length - 1)];

  return (
    <div className="lg:grid lg:grid-cols-[5.5rem_1fr] lg:gap-5">
      {/* Thumbnails (desktop) */}
      <ul className="no-scrollbar hidden max-h-[calc(100vh-10rem)] flex-col gap-3 overflow-y-auto lg:flex" aria-label="Product media">
        {slides.map((s, i) => (
          <li key={s.kind === 'image' ? s.image.id : 'video'}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={s.kind === 'image' ? `View image ${i + 1}` : 'Play video'}
              aria-current={i === index}
              className={cn('relative block aspect-[3/4] w-full overflow-hidden bg-stone-100 transition-opacity duration-300', i === index ? 'opacity-100 ring-1 ring-ink ring-offset-2' : 'opacity-55 hover:opacity-100')}
            >
              {s.kind === 'image' ? (
                <Img src={s.image.url} alt="" fill sizes="88px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center bg-ink text-bone">
                  <Play className="h-5 w-5" />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Main stage (desktop) */}
      <div className="relative hidden lg:block">
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${key}-${index}`}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              {current?.kind === 'image' ? (
                media ? (
                  <ZoomImage image={current.image} priority={index === 0} onOpen={() => setLightbox(true)} />
                ) : (
                  <Img src={current.image.url} alt={current.image.alt} fill priority={index === 0} sizes="(min-width: 1024px) 50vw, 100vw" quality={85} className="object-cover" />
                )
              ) : current ? (
                <video src={current.url} className="h-full w-full object-cover" autoPlay muted loop playsInline controls />
              ) : null}
            </motion.div>
          </AnimatePresence>
          {slides.length > 1 && (
            <>
              <StageArrow side="left" onClick={() => go(index - 1)} />
              <StageArrow side="right" onClick={() => go(index + 1)} />
            </>
          )}
          <span className="pointer-events-none absolute bottom-4 left-4 bg-paper/80 px-2 py-1 text-[0.65rem] tracking-[0.14em] tabular-nums backdrop-blur-sm">
            {index + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Swipe carousel (mobile / tablet) */}
      <div className="lg:hidden">
        <div
          ref={scroller}
          className="no-scrollbar -mx-(--spacing-gutter) flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-label="Product media"
        >
          {slides.map((s, i) => (
            <div key={s.kind === 'image' ? s.image.id : 'video'} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-stone-100">
              {s.kind === 'image' ? (
                media ? (
                  <button type="button" className="absolute inset-0" onClick={() => setLightbox(true)} aria-label="Open full screen">
                    <Img src={s.image.url} alt={s.image.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
                  </button>
                ) : (
                  <Img src={s.image.url} alt={s.image.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
                )
              ) : (
                <video src={s.url} className="h-full w-full object-cover" muted loop playsInline controls />
              )}
            </div>
          ))}
        </div>
        {slides.length > 1 && (
          <div className="mt-4 flex justify-center gap-2" aria-hidden>
            {slides.map((_, i) => (
              <span key={i} className={cn('h-[3px] rounded-full transition-all duration-500 ease-luxe', i === index ? 'w-6 bg-ink' : 'w-3 bg-stone-300')} />
            ))}
          </div>
        )}
      </div>

      {media && <Lightbox open={lightbox} onClose={() => setLightbox(false)} images={images} start={current?.kind === 'image' ? images.indexOf(current.image) : 0} name={name} />}
    </div>
  );
}

function StageArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      className={cn(
        'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-paper/80 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/stage:opacity-100 hover:bg-paper focus-visible:opacity-100 [div:hover>&]:opacity-100',
        side === 'left' ? 'left-4' : 'right-4',
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.2} />
    </button>
  );
}

/** Hover to magnify; the zoom origin follows the cursor. Click opens the lightbox. */
function ZoomImage({ image, priority, onOpen }: { image: GalleryImage; priority?: boolean; onOpen: () => void }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  return (
    <button
      type="button"
      className="group/zoom absolute inset-0 cursor-zoom-in"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseLeave={() => setZoom(null)}
      onClick={onOpen}
      aria-label={`${image.alt} — open full screen`}
    >
      <Img
        src={image.url}
        alt={image.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 50vw, 100vw"
        quality={85}
        className="object-cover transition-transform duration-300 ease-out"
        style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
      />
      <span className="pointer-events-none absolute top-4 right-4 flex h-9 w-9 items-center justify-center bg-paper/80 opacity-0 backdrop-blur-sm transition-opacity group-hover/zoom:opacity-100">
        <Maximize2 className="h-4 w-4" strokeWidth={1.3} />
      </span>
    </button>
  );
}

function Lightbox({ open, onClose, images, start, name }: { open: boolean; onClose: () => void; images: GalleryImage[]; start: number; name: string }) {
  const [i, setI] = useState(start);
  const touch = useRef<number | null>(null);
  useEffect(() => {
    if (open) setI(Math.max(0, start));
  }, [open, start]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length]);

  const img = images[i];
  return (
    <Modal open={open} onClose={onClose} title={`${name} images`} bare>
      <div
        className="relative h-full w-full"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 50) setI((x) => (x + (dx < 0 ? 1 : -1) + images.length) % images.length);
          touch.current = null;
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {img && (
            <motion.div key={img.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <Img src={img.url} alt={img.alt} fill sizes="100vw" quality={85} className="object-contain" />
            </motion.div>
          )}
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => setI((x) => (x - 1 + images.length) % images.length)} className="absolute top-1/2 left-4 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-paper/80" aria-label="Previous image">
              <ChevronLeft className="h-6 w-6" strokeWidth={1.2} />
            </button>
            <button type="button" onClick={() => setI((x) => (x + 1) % images.length)} className="absolute top-1/2 right-4 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-paper/80" aria-label="Next image">
              <ChevronRight className="h-6 w-6" strokeWidth={1.2} />
            </button>
          </>
        )}
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs tracking-[0.16em] tabular-nums">
          {i + 1} / {images.length}
        </p>
      </div>
    </Modal>
  );
}
