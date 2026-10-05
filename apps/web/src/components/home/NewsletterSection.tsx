import { Reveal, SplitText } from '../motion';
import { Img } from '../ui/Img';
import { NewsletterForm } from '../ui/NewsletterForm';

export function NewsletterSection({ image }: { image?: string }) {
  return (
    <section className="bg-sand" aria-labelledby="newsletter-heading">
      <div className="grid lg:grid-cols-2">
        {image && (
          <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[36rem]">
            <Img src={image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
        <div className="flex items-center px-(--spacing-gutter) py-20 lg:px-20 lg:py-28">
          <div className="max-w-md">
            <Reveal y={12}>
              <p className="eyebrow mb-5 text-stone-600">The Maison letter</p>
            </Reveal>
            <SplitText id="newsletter-heading" text="First access, quietly delivered" className="font-display text-display-sm font-light" />
            <Reveal delay={0.2}>
              <p className="mt-6 text-stone-600">
                Join our list for early access to new collections, private sale invitations and 10% off your first order.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <NewsletterForm source="home" tone="light" className="mt-10" />
              <p className="mt-4 text-xs text-stone-500">We respect your inbox. Unsubscribe at any time.</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
