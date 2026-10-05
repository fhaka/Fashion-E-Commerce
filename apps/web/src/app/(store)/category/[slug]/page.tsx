import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductListing } from '@/components/product/ProductListing';
import { PageIntro } from '@/components/ui/PageIntro';
import { ApiRequestError, api } from '@/lib/api';
import { getProducts } from '@/lib/catalog';
import { parseListing, toApiQuery, type SearchParams } from '@/lib/listing';
import { cn } from '@/lib/utils';

interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parent: { name: string; slug: string } | null;
  children: { id: string; name: string; slug: string }[];
  siblings: { id: string; name: string; slug: string }[];
  breadcrumbs: { name: string; href: string }[];
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

async function loadCategory(slug: string) {
  try {
    return await api<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`, { revalidate: 300, tags: ['categories'] });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await loadCategory((await params).slug);
  const title = category.parent ? `${category.name} · ${category.parent.name}` : category.name;
  return {
    title,
    description: category.description ?? `Shop ${title.toLowerCase()}.`,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: { title, description: category.description ?? undefined, images: category.image ? [{ url: category.image }] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [category, sp] = await Promise.all([loadCategory(slug), searchParams]);
  const state = parseListing(sp, { category: slug });
  const initial = await getProducts(toApiQuery(state), 30);
  // Sub-navigation: a root category lists its children; a child lists its siblings.
  const nav = category.children.length ? category.children : category.siblings;
  const rootSlug = category.parent?.slug ?? category.slug;

  return (
    <>
      <PageIntro
        eyebrow={category.parent?.name ?? 'Collection'}
        title={category.name}
        description={category.description}
        breadcrumbs={category.breadcrumbs.map((b, i, all) => (i === all.length - 1 ? { name: b.name } : b))}
      >
        {nav.length > 0 && (
          <nav aria-label={`${category.parent?.name ?? category.name} categories`} className="no-scrollbar -mx-(--spacing-gutter) mt-10 overflow-x-auto px-(--spacing-gutter)">
            <ul className="flex gap-2">
              <li>
                <Link
                  href={`/category/${rootSlug}`}
                  className={cn('block border px-4 py-2 text-xs whitespace-nowrap transition-colors', slug === rootSlug ? 'border-ink bg-ink text-bone' : 'border-stone-300 hover:border-ink')}
                >
                  All {(category.parent?.name ?? category.name).toLowerCase()}
                </Link>
              </li>
              {nav.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    aria-current={c.slug === slug ? 'page' : undefined}
                    className={cn('block border px-4 py-2 text-xs whitespace-nowrap transition-colors', c.slug === slug ? 'border-ink bg-ink text-bone' : 'border-stone-300 hover:border-ink')}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </PageIntro>
      <ProductListing basePath={`/category/${slug}`} state={state} fixed={['category']} initial={initial} />
    </>
  );
}
