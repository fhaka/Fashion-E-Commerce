import Link from 'next/link';
import type { Feature } from '@maison/shared';
import type { CategoryNode, SiteSettings } from '@/lib/types';
import { NewsletterForm } from '../ui/NewsletterForm';

type FooterLink = { label: string; href: string; feature?: Feature };

const help: FooterLink[] = [
  { label: 'Contact us', href: '/contact' },
  { label: 'Track an order', href: '/track-order', feature: 'orderTracking' },
  { label: 'Shipping & returns', href: '/shipping-returns' },
  { label: 'My account', href: '/account' },
];
const house: FooterLink[] = [
  { label: 'Our story', href: '/about' },
  { label: 'Collections', href: '/collections', feature: 'collections' },
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of sale', href: '/terms' },
];
const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  x: 'X',
  youtube: 'YouTube',
};

export function Footer({ categories, settings }: { categories: CategoryNode[]; settings: SiteSettings }) {
  const social = Object.entries(settings.socialLinks)
    .filter((e): e is [string, string] => !!e[1])
    .map(([network, href]) => ({ label: SOCIAL_LABELS[network] ?? network, href }));
  const name = settings.storeName.toUpperCase();
  const inPlan = (links: FooterLink[]) => links.filter((l) => !l.feature || settings.features[l.feature]);
  const shop = [
    { label: 'New arrivals', href: '/shop?isNew=true' },
    ...categories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    { label: 'Sale', href: '/shop?onSale=true' },
  ];

  return (
    <footer className="bg-ink text-bone">
      <div className="container-site pt-20 pb-10 lg:pt-28">
        <div className="grid gap-16 lg:grid-cols-12">
          {settings.features.newsletter ? (
            <div className="lg:col-span-5">
              <p className="font-display text-4xl leading-tight sm:text-5xl">
                Join our
                <br />
                newsletter
              </p>
              <p className="mt-4 max-w-sm text-sm text-bone/60">
                New collections, private sales and the stories behind our pieces. Delivered monthly, never more.
              </p>
              <NewsletterForm source="footer" tone="dark" className="mt-8 max-w-md" />
            </div>
          ) : (
            <div className="lg:col-span-5">
              <p className="font-display text-4xl leading-tight sm:text-5xl">{settings.storeName}</p>
              <p className="mt-4 max-w-sm text-sm text-bone/60">{settings.description}</p>
              <a href={`mailto:${settings.supportEmail}`} className="link-underline mt-6 inline-block text-sm text-bone/85 hover:text-bone">
                {settings.supportEmail}
              </a>
            </div>
          )}

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {[
              { title: 'Shop', links: shop },
              { title: 'Help', links: inPlan(help) },
              { title: 'The house', links: inPlan(house) },
            ].map((col) => (
              <div key={col.title}>
                <p className="eyebrow mb-5 text-bone/50">{col.title}</p>
                <ul className="space-y-3 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="link-underline text-bone/85 hover:text-bone">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Decorative watermark, drawn as SVG so it isn't treated as low-contrast body text. */}
        <svg aria-hidden focusable="false" viewBox={`0 0 ${Math.max(300, name.length * 145)} 190`} className="mt-24 w-full select-none" preserveAspectRatio="xMinYMid meet">
          <text x="0" y="160" className="fill-bone/[0.06] font-display" style={{ fontSize: 205, letterSpacing: '0.06em' }}>
            {name}
          </text>
        </svg>

        <div className="mt-8 flex flex-col gap-6 border-t border-bone/15 pt-8 text-xs text-bone/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.legalName}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-6">
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-underline hover:text-bone">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="tracking-[0.12em] uppercase">Visa · Mastercard · Amex · Apple Pay</p>
        </div>
      </div>
    </footer>
  );
}
