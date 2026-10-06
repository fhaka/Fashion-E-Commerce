import { ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ImageReveal, Reveal } from '@/components/motion';
import { Img } from '@/components/ui/Img';
import { PageIntro } from '@/components/ui/PageIntro';
import { getCollections } from '@/lib/catalog';
import { requireFeature } from '@/lib/site';
import { cn } from '@/lib/utils';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Explore our collections — seasonal stories and wardrobe essentials.',
  alternates: { canonical: '/collections' },
};

export default async function CollectionsPage() {
  await requireFeature('collections');
  const collections = await getCollections();
  return (
    <>
      <PageIntro eyebrow="The house" title="Collections" description="Each collection is a chapter: a mood, a palette and a set of pieces designed to be worn together." breadcrumbs={[{ name: 'Collections' }]} />
      <section className="container-site pb-(--spacing-section)">
        <ul className="grid gap-x-6 gap-y-16 md:grid-cols-2">
          {collections.map((c, i) => (
            <li key={c.id} className={cn(i % 2 === 1 && 'md:mt-24')}>
              <Link href={`/collections/${c.slug}`} className="group block">
                <ImageReveal className="aspect-[4/5] bg-stone-100" delay={(i % 2) * 0.1}>
                  {c.heroImage && (
                    <Img src={c.heroImage} alt={c.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-[1.8s] ease-luxe group-hover:scale-[1.05]" />
                  )}
                </ImageReveal>
                <Reveal className="mt-6 flex items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow mb-2 text-stone-500">{c.productCount} pieces</p>
                    <h2 className="font-display text-4xl font-light">{c.name}</h2>
                    {c.description && <p className="mt-3 max-w-md text-sm text-stone-600">{c.description}</p>}
                  </div>
                  <span className="mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-300 transition-all duration-500 ease-luxe group-hover:rotate-45 group-hover:border-ink group-hover:bg-ink group-hover:text-bone">
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.3} />
                  </span>
                </Reveal>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
