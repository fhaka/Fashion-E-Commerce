import type { Metadata } from 'next';
import { ImageReveal, Reveal, SplitText, Stagger, StaggerItem } from '@/components/motion';
import { ButtonLink } from '@/components/ui/Button';
import { Img } from '@/components/ui/Img';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Our story',
  description: 'Maison was founded in Paris in 2009 to make fewer, better clothes — cut by hand, made by family-run mills, and built to be worn for decades.',
  alternates: { canonical: '/about' },
};

const img = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const PRINCIPLES = [
  { title: 'Fewer, better pieces', body: 'Two collections a year, never more. Each piece is developed over months of fittings until the proportion is right.' },
  { title: 'Natural fibres only', body: 'Wool, cashmere, silk, linen, cotton and vegetable-tanned leather. Materials that breathe, age well and can be repaired.' },
  { title: 'Made by people we know', body: 'Fourteen family-run mills and workshops in Italy, Scotland, Portugal and France — most of them partners for over a decade.' },
  { title: 'Built to last', body: 'Hand-finished seams, half-canvassed tailoring and Goodyear-welted shoes. Every outerwear piece comes with lifetime repairs.' },
];

export default function AboutPage() {
  return (
    <>
      <div className="container-site pt-10">
        <Breadcrumbs items={[{ name: 'Our story' }]} />
      </div>
      <section className="container-site grid items-end gap-12 py-16 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-6">
          <Reveal y={10}>
            <p className="eyebrow mb-6 text-camel-dark">The house · Est. 2009</p>
          </Reveal>
          <SplitText as="h1" inView={false} text="Made slowly, worn for years" className="font-display text-display font-light" />
          <Reveal delay={0.3}>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-stone-600">
              Maison began in a small Paris atelier with a simple conviction: that the most luxurious thing a garment can be is lasting. We design fewer pieces, make them with
              more care, and stand behind them for as long as you wear them.
            </p>
          </Reveal>
        </div>
        <ImageReveal className="aspect-[4/5] bg-stone-200 lg:col-span-5 lg:col-start-8">
          <Img src={img('photo-1787505136296-1e8f0750e5ff')} alt="Adjusting a dress on a mannequin in the Maison atelier" fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
        </ImageReveal>
      </section>

      <section className="bg-ink py-(--spacing-section) text-bone">
        <div className="container-site">
          <Reveal>
            <p className="eyebrow mb-12 text-bone/50">What we believe</p>
          </Reveal>
          <Stagger className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p, i) => (
              <StaggerItem key={p.title}>
                <p className="mb-4 font-display text-5xl font-light text-camel">0{i + 1}</p>
                <h2 className="mb-3 font-display text-2xl">{p.title}</h2>
                <p className="text-sm leading-relaxed text-bone/70">{p.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="container-site grid items-center gap-12 py-(--spacing-section) lg:grid-cols-12">
        <ImageReveal className="aspect-[4/3] bg-stone-200 lg:col-span-6">
          <Img src={img('photo-1770910195240-ddec777b77f6')} alt="Mannequins and sewing supplies in a clothing workshop" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </ImageReveal>
        <div className="lg:col-span-5 lg:col-start-8">
          <SplitText text="From pattern to piece" className="font-display text-display-sm font-light" />
          <Reveal delay={0.2}>
            <p className="mt-6 leading-relaxed text-stone-600">
              Every pattern is drafted by hand in our atelier on Rue de Turenne. Prototypes are cut, fitted and re-cut — often a dozen times — before a piece enters production.
              Our mills weave cloth to our specification, and our workshops finish each garment by hand: buttonholes, seams and edges you will notice every time you wear it.
            </p>
            <p className="mt-4 leading-relaxed text-stone-600">
              When something needs care, send it back to us. We repair outerwear for life and offer resoling on all our footwear.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-sand py-(--spacing-section)">
        <div className="container-site text-center">
          <SplitText text="Discover the collection" className="font-display text-display-sm font-light" />
          <Reveal delay={0.2} className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/collections/autumn-winter-26">Autumn / Winter 26</ButtonLink>
            <ButtonLink href="/collections/the-essentials" variant="outline">
              The Essentials
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
