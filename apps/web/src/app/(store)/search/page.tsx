import type { Metadata } from 'next';
import { ProductListing } from '@/components/product/ProductListing';
import { SearchBox } from '@/components/product/SearchBox';
import { PageIntro } from '@/components/ui/PageIntro';
import { getCategoryTree, getProducts } from '@/lib/catalog';
import { parseListing, toApiQuery, type SearchParams } from '@/lib/listing';
import { pluralize } from '@/lib/utils';

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseListing(await searchParams);
  // Search result pages should not be indexed.
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const state = parseListing(await searchParams);
  const [initial, categories] = await Promise.all([
    state.q ? getProducts(toApiQuery(state), 0) : Promise.resolve(null),
    getCategoryTree(),
  ]);

  return (
    <>
      <PageIntro
        eyebrow={state.q && initial ? `${pluralize(initial.meta.total, 'result')}` : 'Search'}
        title={state.q ? `“${state.q}”` : 'What are you looking for?'}
        breadcrumbs={[{ name: 'Search' }]}
      >
        <SearchBox key={state.q} defaultValue={state.q} className="mt-10 max-w-2xl" />
      </PageIntro>
      {initial && (
        <ProductListing basePath="/search"
          state={state}
          initial={initial}
          categories={categories}
          emptyMessage="Try a broader term — for example “coat”, “cashmere” or “leather”."
        />
      )}
    </>
  );
}
