import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductRail } from '@/components/home/ProductRail';
import { Reveal } from '@/components/motion';
import { ProductView } from '@/components/product/ProductView';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';
import { Reviews } from '@/components/product/Reviews';
import { JsonLd } from '@/components/ui/JsonLd';
import { ApiRequestError, api } from '@/lib/api';
import { getProduct } from '@/lib/catalog';
import { getSiteSettings } from '@/lib/site';
import type { ProductCard } from '@/lib/types';
import { SITE_URL, STORE_CURRENCY } from '@/lib/utils';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

/** Enables ISR: each product page is rendered on first request, cached, then revalidated every 60s. */
export async function generateStaticParams() {
  return [];
}

async function load(slug: string) {
  try {
    return await getProduct(slug);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [p, settings] = await Promise.all([load((await params).slug), getSiteSettings()]);
  const image = p.images[0];
  return {
    title: p.name,
    description: p.seoDescription,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: 'website',
      title: `${p.name} | ${settings.storeName}`,
      description: p.seoDescription,
      url: `/product/${p.slug}`,
      images: image ? [{ url: image.url.replace(/w=\d+/, 'w=1200'), width: 1200, alt: image.alt }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: p.name, description: p.seoDescription, images: image ? [image.url] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await load(slug);
  const settings = await getSiteSettings();
  const related = settings.features.recommendations ? await api<ProductCard[]>(`/products/${slug}/related`, { revalidate: 300 }).catch(() => [] as ProductCard[]) : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.slice(0, 6).map((i) => i.url),
    sku: product.variants[0]?.sku,
    brand: { '@type': 'Brand', name: settings.storeName },
    category: product.category.name,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: STORE_CURRENCY,
      lowPrice: (Math.min(...product.variants.map((v) => v.price)) / 100).toFixed(2),
      highPrice: (Math.max(...product.variants.map((v) => v.price)) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/product/${product.slug}`,
    },
    ...(product.ratingCount > 0 && settings.features.reviews
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } }
      : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductView product={product} />
      <Reviews product={product} />
      {related.length > 0 && (
        <section className="container-site py-(--spacing-section)" aria-labelledby="related-heading">
          <Reveal>
            <p className="eyebrow mb-4 text-stone-500">Complete the look</p>
            <h2 id="related-heading" className="mb-10 font-display text-display-sm font-light">
              You may also like
            </h2>
          </Reveal>
          <ProductRail products={related} label="Related products" />
        </section>
      )}
      <RecentlyViewed excludeId={product.id} />
    </>
  );
}
