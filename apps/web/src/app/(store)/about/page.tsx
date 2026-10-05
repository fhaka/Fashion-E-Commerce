import type { Metadata } from 'next';
import { Blocks, fillText, renderableMarkdown } from '@/components/content/Markdown';
import { ImageReveal, Reveal, SplitText, Stagger, StaggerItem } from '@/components/motion';
import { ButtonLink } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Img } from '@/components/ui/Img';
import { getCollections } from '@/lib/catalog';
import { asPillars } from '@/lib/markdown';
import { getContentPage, getSiteSettings } from '@/lib/site';
import { cn } from '@/lib/utils';

/*
 * Edited in Admin → Pages → About. Layout rules:
 *  - title, intro and image make the hero;
 *  - a "## Section" written as a list of "**Title** — text" items becomes the numbered pillars band;
 *  - any other "## Section" is a text section.
 */

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getContentPage('about'), getSiteSettings()]);
  return {
    title: 'Our story',
    description: page.intro ? fillText(page.intro, settings).slice(0, 160) : `The story behind ${settings.storeName}.`,
    alternates: { canonical: '/about' },
  };
}

export default async function AboutPage() {
  const [page, settings, collections] = await Promise.all([getContentPage('about'), getSiteSettings(), getCollections().catch(() => [])]);
  const { lead, sections } = renderableMarkdown(page.body, settings);
  const featured = collections.slice(0, 2);

  return (
    <>
      <div className="container-site pt-10">
        <Breadcrumbs items={[{ name: 'Our story' }]} />
      </div>
      <section className={cn('container-site grid items-end gap-12 py-16 lg:py-24', page.imageUrl && 'lg:grid-cols-12')}>
        <div className={page.imageUrl ? 'lg:col-span-6' : 'max-w-3xl'}>
          <Reveal y={10}>
            <p className="eyebrow mb-6 text-camel-dark">Our story</p>
          </Reveal>
          <SplitText as="h1" inView={false} text={fillText(page.title, settings)} className="font-display text-display font-light" />
          {page.intro && (
            <Reveal delay={0.3}>
              <p className="mt-8 max-w-lg text-lg leading-relaxed text-stone-600">{fillText(page.intro, settings)}</p>
            </Reveal>
          )}
          {lead.length > 0 && (
            <Reveal delay={0.4} className="mt-6 max-w-lg">
              <Blocks blocks={lead} settings={settings} />
            </Reveal>
          )}
        </div>
        {page.imageUrl && (
          <ImageReveal className="aspect-[4/5] bg-stone-200 lg:col-span-5 lg:col-start-8">
            <Img src={page.imageUrl} alt="" fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </ImageReveal>
        )}
      </section>

      {sections.map((section) => {
        const pillars = asPillars(section);
        return pillars ? (
          <section key={section.id} className="bg-ink py-(--spacing-section) text-bone" aria-labelledby={section.id}>
            <div className="container-site">
              <Reveal>
                <h2 id={section.id} className="eyebrow mb-12 text-bone/60">
                  {section.title}
                </h2>
              </Reveal>
              <Stagger className={cn('grid gap-12 sm:grid-cols-2', pillars.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                {pillars.map((p, i) => (
                  <StaggerItem key={p.title}>
                    <p className="mb-4 font-display text-5xl font-light text-camel" aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mb-3 font-display text-2xl">{p.title}</h3>
                    <p className="text-sm leading-relaxed text-bone/70">{p.body}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        ) : (
          <section key={section.id} className="container-site grid gap-10 py-(--spacing-section) lg:grid-cols-12" aria-labelledby={section.id}>
            <div className="lg:col-span-4">
              <SplitText id={section.id} text={section.title} className="font-display text-display-sm font-light" />
            </div>
            <Reveal delay={0.15} className="max-w-2xl lg:col-span-7 lg:col-start-6">
              <Blocks blocks={section.blocks} settings={settings} />
            </Reveal>
          </section>
        );
      })}

      {featured.length > 0 && (
        <section className="bg-sand py-(--spacing-section)">
          <div className="container-site text-center">
            <SplitText text="Discover the collection" className="font-display text-display-sm font-light" />
            <Reveal delay={0.2} className="mt-10 flex flex-wrap justify-center gap-3">
              {featured.map((c, i) => (
                <ButtonLink key={c.id} href={`/collections/${c.slug}`} variant={i === 0 ? 'primary' : 'outline'}>
                  {c.name}
                </ButtonLink>
              ))}
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
