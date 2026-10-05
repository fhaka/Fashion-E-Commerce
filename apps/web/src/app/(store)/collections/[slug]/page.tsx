import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Reveal, SplitText } from '@/components/motion';
import { ProductListing } from '@/components/product/ProductListing';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Img } from '@/components/ui/Img';
import { ApiRequestError, api } from '@/lib/api';
import { getProducts } from '@/lib/catalog';
import { parseListing, toApiQuery, type SearchParams } from '@/lib/listing';
import type { Collection } from '@/lib/types';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

async function loadCollection(slug: string) {
  try {
    return await api<Collection>(`/collections/${encodeURIComponent(slug)}`, { revalidate: 300, tags: ['collections'] });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await loadCollection((await params).slug);
  return {
    title: c.name,
    description: c.description ?? `Discover the ${c.name} collection.`,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.name, description: c.description ?? undefined, images: c.heroImage ? [{ url: c.heroImage, width: 2400 }] : undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [collection, sp] = await Promise.all([loadCollection(slug), searchParams]);
  const state = parseListing(sp, { collection: slug });
  const initial = await getProducts(toApiQuery(state), 30);

  return (
    <>
      <section className="relative flex h-[78svh] min-h-[32rem] items-end overflow-hidden bg-ink text-bone">
        {collection.heroImage && <Img src={collection.heroImage} alt="" fill priority sizes="100vw" fadeIn={false} className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/40" />
        <div className="container-site relative z-10 pb-16 lg:pb-20">
          <Reveal y={10}>
            <p className="eyebrow mb-5 text-bone/75">The collection · {initial.meta.total} pieces</p>
          </Reveal>
          <SplitText as="h1" inView={false} delay={0.15} text={collection.name} className="font-display text-display-lg font-light" />
          {collection.description && (
            <Reveal delay={0.4}>
              <p className="mt-6 max-w-xl text-bone/85 lg:text-lg">{collection.description}</p>
            </Reveal>
          )}
        </div>
      </section>
      <div className="container-site py-8">
        <Breadcrumbs items={[{ name: 'Collections', href: '/collections' }, { name: collection.name }]} />
      </div>
      <ProductListing basePath={`/collections/${slug}`} state={state} fixed={['collection']} initial={initial} />
    </>
  );
}
