import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Banner, CategoryNode, Collection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ImageReveal, Parallax, Reveal, SplitText, Stagger, StaggerItem } from '../motion';
import { ButtonLink } from '../ui/Button';
import { Img } from '../ui/Img';
import { SectionHeading } from './SectionHeading';

/* ───────────────────────── 2. Featured collections ───────────────────────── */

export function FeaturedCollections({ collections }: { collections: Collection[] }) {
  const [lead, ...rest] = collections.filter((c) => c.heroImage).slice(0, 3);
  if (!lead) return null;
  return (
    <section className="container-site py-(--spacing-section)" aria-labelledby="collections-heading">
      <SectionHeading id="collections-heading" eyebrow="The collections" title="Stories in cloth" link={{ label: 'All collections', href: '/collections' }} />
      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        <CollectionTile collection={lead} className="lg:col-span-7" aspect="aspect-[4/5] lg:aspect-[7/8]" sizes="(min-width:1024px) 58vw, 100vw" />
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-6">
          {rest.map((c, i) => (
            <CollectionTile key={c.id} collection={c} delay={0.15 * (i + 1)} aspect="aspect-[4/5] lg:aspect-[16/11]" sizes="(min-width:1024px) 40vw, 50vw" />
          ))}
        </div>
      </div>
    </section>
  );
}

function CollectionTile({ collection, className, aspect, sizes, delay = 0 }: { collection: Collection; className?: string; aspect: string; sizes: string; delay?: number }) {
  return (
    <Link href={`/collections/${collection.slug}`} className={cn('group relative block overflow-hidden', className)}>
      <ImageReveal className={cn('bg-stone-200', aspect)} delay={delay}>
        <Img src={collection.heroImage!} alt={collection.name} fill sizes={sizes} className="object-cover transition-transform duration-[1.8s] ease-luxe group-hover:scale-[1.05]" />
      </ImageReveal>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-bone lg:p-8">
        <div>
          {collection.productCount !== undefined && <p className="eyebrow mb-2 text-bone/70">{collection.productCount} pieces</p>}
          <h3 className="font-display text-3xl font-light lg:text-4xl">{collection.name}</h3>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bone/50 transition-all duration-500 ease-luxe group-hover:rotate-45 group-hover:bg-bone group-hover:text-ink">
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.3} />
        </span>
      </div>
    </Link>
  );
}

/* ───────────────────────── 5. Shop by category ───────────────────────── */

export function ShopByCategory({ categories }: { categories: CategoryNode[] }) {
  return (
    <section className="bg-bone py-(--spacing-section)" aria-labelledby="category-heading">
      <div className="container-site">
        <SectionHeading id="category-heading" eyebrow="Shop by category" title="Find your next piece" align="center" />
        <Stagger className="grid gap-5 md:grid-cols-3 md:gap-6">
          {categories.map((c) => (
            <StaggerItem key={c.id}>
              <Link href={`/category/${c.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-stone-200">
                  {c.image && (
                    <Img src={c.image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[1.8s] ease-luxe group-hover:scale-[1.06]" />
                  )}
                  <div className="absolute inset-0 bg-ink/30 transition-colors duration-700 group-hover:bg-ink/45" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h3 className="font-display text-5xl font-light text-bone [text-shadow:0_1px_24px_rgb(0_0_0/0.35)] lg:text-6xl">{c.name}</h3>
                  </div>
                </div>
              </Link>
              <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[0.8rem] text-stone-600">
                {c.children.slice(0, 5).map((child) => (
                  <li key={child.id}>
                    <Link href={`/category/${child.slug}`} className="link-underline hover:text-ink">
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────────────────────── 6. Campaign banner ───────────────────────── */

export function CampaignBanner({ banner }: { banner?: Banner }) {
  if (!banner) return null;
  return (
    <section className="relative h-[88svh] min-h-[34rem] overflow-hidden bg-ink text-bone" aria-label={banner.title}>
      <Parallax className="absolute! inset-0" offset={120}>
        <Img src={banner.image} alt="" fill sizes="100vw" className={cn('object-cover', banner.mobileImage && 'max-md:hidden')} />
        {banner.mobileImage && <Img src={banner.mobileImage} alt="" fill sizes="100vw" className="object-cover md:hidden" />}
      </Parallax>
      <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent" />
      <div className="relative z-10 flex h-full items-center">
        <div className="container-site">
          <div className="max-w-xl">
            {banner.eyebrow && (
              <Reveal y={12}>
                <p className="eyebrow mb-6 text-bone/80">{banner.eyebrow}</p>
              </Reveal>
            )}
            <SplitText text={banner.title} className="font-display text-display font-light" />
            {banner.subtitle && (
              <Reveal delay={0.3}>
                <p className="mt-6 max-w-md text-bone/85">{banner.subtitle}</p>
              </Reveal>
            )}
            {banner.ctaHref && banner.ctaLabel && (
              <Reveal delay={0.45} className="mt-10">
                <ButtonLink href={banner.ctaHref} variant="light" size="lg">
                  {banner.ctaLabel}
                </ButtonLink>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 8. Brand story ───────────────────────── */

const STATS = [
  { value: '2009', label: 'Founded in Paris' },
  { value: '14', label: 'Family-run mills' },
  { value: '100%', label: 'Natural fibres' },
];

export function BrandStory({ story }: { story?: Banner }) {
  if (!story) return null;
  return (
    <section className="bg-ink py-(--spacing-section) text-bone" aria-labelledby="story-heading">
      <div className="container-site grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="relative lg:col-span-6">
          <Parallax className="aspect-[4/5] w-[82%] bg-ink-soft" offset={50}>
            <Img src={story.image} alt="Inside the Maison atelier" fill sizes="(min-width: 1024px) 42vw, 82vw" className="object-cover" />
          </Parallax>
          {story.mobileImage && (
            <Reveal delay={0.2} className="absolute right-0 -bottom-12 w-[46%] border-[6px] border-ink sm:-bottom-16">
              <div className="relative aspect-[3/4]">
                <Img src={story.mobileImage} alt="Pattern cutting by hand" fill sizes="(min-width: 1024px) 24vw, 46vw" className="object-cover" />
              </div>
            </Reveal>
          )}
        </div>
        <div className="pt-12 lg:col-span-5 lg:col-start-8 lg:pt-0">
          {story.eyebrow && (
            <Reveal y={12}>
              <p className="eyebrow mb-6 text-camel">{story.eyebrow}</p>
            </Reveal>
          )}
          <SplitText id="story-heading" text={story.title} className="font-display text-display-sm font-light" />
          {story.subtitle && (
            <Reveal delay={0.2}>
              <p className="mt-8 leading-relaxed text-bone/75">{story.subtitle}</p>
            </Reveal>
          )}
          <Stagger className="mt-12 grid grid-cols-3 gap-6 border-t border-bone/15 pt-10" delay={0.2}>
            {STATS.map((s) => (
              <StaggerItem key={s.label}>
                <p className="font-display text-4xl font-light lg:text-5xl">{s.value}</p>
                <p className="mt-2 text-xs text-bone/60">{s.label}</p>
              </StaggerItem>
            ))}
          </Stagger>
          {story.ctaHref && story.ctaLabel && (
            <Reveal delay={0.3} className="mt-12">
              <ButtonLink href={story.ctaHref} variant="light">
                {story.ctaLabel}
              </ButtonLink>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 9. Lookbook ───────────────────────── */

export function Lookbook({ looks }: { looks: Banner[] }) {
  if (!looks.length) return null;
  // Asymmetric editorial rhythm: tall / short alternating across three columns.
  const shapes = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[2/3]', 'aspect-[4/5]', 'aspect-[3/4]', 'aspect-[2/3]'];
  return (
    <section className="container-site py-(--spacing-section)" aria-labelledby="lookbook-heading">
      <SectionHeading id="lookbook-heading" eyebrow="Lookbook · Autumn / Winter 26" title="The season, styled" link={{ label: 'Shop the collection', href: '/collections/autumn-winter-26' }} />
      <div className="columns-2 gap-4 sm:gap-6 lg:columns-3">
        {looks.map((look, i) => (
          <Reveal key={look.id} delay={(i % 3) * 0.12} className="mb-4 break-inside-avoid sm:mb-6">
            <Link href={look.ctaHref ?? '/shop'} className="group block">
              <div className={cn('relative overflow-hidden bg-stone-100', shapes[i % shapes.length])}>
                <Img src={look.image} alt={look.title} fill sizes="(min-width: 1024px) 31vw, 48vw" className="object-cover transition-transform duration-[1.8s] ease-luxe group-hover:scale-[1.05]" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/60 via-transparent to-transparent p-5 opacity-0 transition-opacity duration-700 group-hover:opacity-100 max-md:opacity-100 max-md:from-ink/40">
                  <span className="text-[0.66rem] tracking-[0.18em] text-bone uppercase">{look.ctaLabel ?? 'Discover'}</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl">{look.title}</h3>
                {look.eyebrow && <span className="text-[0.62rem] tracking-[0.18em] text-stone-500 uppercase">{look.eyebrow}</span>}
              </div>
              {look.subtitle && <p className="mt-1 text-sm text-stone-500">{look.subtitle}</p>}
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
