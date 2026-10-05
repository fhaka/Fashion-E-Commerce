import type { Metadata } from 'next';
import { ProductListing } from '@/components/product/ProductListing';
import { PageIntro } from '@/components/ui/PageIntro';
import { getCategoryTree, getProducts } from '@/lib/catalog';
import { parseListing, toApiQuery, type ListingState, type SearchParams } from '@/lib/listing';

type Props = { searchParams: Promise<SearchParams> };

function heading(s: ListingState) {
  if (s.onSale) return { eyebrow: 'Selected pieces, reduced', title: 'The Sale', description: 'Past-season favourites at reduced prices. Limited quantities — when they are gone, they are gone.' };
  if (s.isNew) return { eyebrow: 'Just landed', title: 'New Arrivals', description: 'The latest pieces from our atelier, arriving weekly through the season.' };
  if (s.bestSeller) return { eyebrow: 'Most loved', title: 'Best Sellers', description: 'The pieces our clients return to, season after season.' };
  return { eyebrow: 'The full wardrobe', title: 'Shop All', description: 'Outerwear, tailoring, knitwear and leather goods — considered pieces made from the finest natural fibres.' };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseListing(await searchParams);
  const h = heading(state);
  return {
    title: h.title,
    description: h.description,
    // Filtered variants of the shop canonicalise to the clean URL to avoid duplicate content.
    alternates: { canonical: `/shop${state.onSale ? '?onSale=true' : state.isNew ? '?isNew=true' : state.bestSeller ? '?bestSeller=true' : ''}` },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const state = parseListing(await searchParams);
  const [initial, categories] = await Promise.all([getProducts(toApiQuery(state), 30), getCategoryTree()]);
  const h = heading(state);

  return (
    <>
      <PageIntro {...h} breadcrumbs={[{ name: h.title }]} />
      <ProductListing basePath="/shop" state={state} initial={initial} categories={categories} />
    </>
  );
}
