import { BrandStory, CampaignBanner, FeaturedCollections, Lookbook, ShopByCategory } from '@/components/home/EditorialSections';
import { FeaturedProduct } from '@/components/home/FeaturedProduct';
import { Hero } from '@/components/home/Hero';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { ProductRail } from '@/components/home/ProductRail';
import { SectionHeading } from '@/components/home/SectionHeading';
import { Marquee, Stagger, StaggerItem } from '@/components/motion';
import { ProductCard } from '@/components/product/ProductCard';
import { getBanners, getCategoryTree, getCollections, getProduct, getProducts } from '@/lib/catalog';
import { getSiteSettings } from '@/lib/site';
import { SITE_URL } from '@/lib/utils';

export const revalidate = 60;

export default async function HomePage() {
  const [heroes, promos, looks, stories, collections, categories, newIn, best, featured] = await Promise.all([
    getBanners('HERO'),
    getBanners('PROMO'),
    getBanners('EDITORIAL'),
    getBanners('STORY'),
    getCollections(),
    getCategoryTree(),
    getProducts({ sort: 'newest', limit: 10 }),
    getProducts({ bestSeller: true, sort: 'bestselling', limit: 8 }),
    getProducts({ featured: true, sort: 'bestselling', limit: 1 }),
  ]);
  const settings = await getSiteSettings();
  const spotlight = featured.data[0] ? await getProduct(featured.data[0].slug).catch(() => null) : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.storeName,
    url: SITE_URL,
    logo: settings.logoUrl ?? `${SITE_URL}/icon.svg`,
    email: settings.supportEmail,
    sameAs: Object.values(settings.socialLinks).filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* 1. Hero */}
      <Hero slides={heroes} />

      <div id="home-content" className="border-b border-stone-200 py-5 text-[0.7rem] tracking-[0.2em] text-stone-600 uppercase">
        {settings.highlights.length > 0 && <Marquee items={settings.highlights} />}
      </div>

      {/* 2. Featured collections */}
      <FeaturedCollections collections={collections.filter((c) => c.isFeatured)} />

      {/* 3. New arrivals */}
      <section className="container-site pb-(--spacing-section)" aria-labelledby="new-heading">
        <SectionHeading id="new-heading" eyebrow="Just landed" title="New arrivals" link={{ label: 'Shop new in', href: '/shop?isNew=true' }} />
        <ProductRail products={newIn.data} label="New arrivals" />
      </section>

      {/* 6. Campaign banner */}
      <CampaignBanner banner={promos[0]} />

      {/* 4. Best sellers */}
      <section className="container-site py-(--spacing-section)" aria-labelledby="best-heading">
        <SectionHeading id="best-heading" eyebrow="Most loved" title="Best sellers" link={{ label: 'View all', href: '/shop?bestSeller=true' }} />
        <Stagger as="ul" className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
          {best.data.map((p) => (
            <StaggerItem as="li" key={p.id}>
              <ProductCard product={p} sizes="(min-width: 1024px) 25vw, 50vw" />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* 5. Shop by category */}
      <ShopByCategory categories={categories} />

      {/* 7. Featured product showcase */}
      {spotlight && <FeaturedProduct product={spotlight} />}

      {/* 8. Brand story */}
      <BrandStory story={stories[0]} stats={settings.storyStats} />

      {/* 9. Lookbook */}
      <Lookbook looks={looks} />

      {/* 10. Newsletter (11. footer is in the root layout) */}
      <NewsletterSection image={looks[0]?.image} />
    </>
  );
}
