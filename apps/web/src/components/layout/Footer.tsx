import Link from 'next/link';
import type { CategoryNode } from '@/lib/types';
import { NewsletterForm } from '../ui/NewsletterForm';

const help = [
  { label: 'Client services', href: '/contact' },
  { label: 'Track an order', href: '/track-order' },
  { label: 'Shipping & returns', href: '/shipping-returns' },
  { label: 'My account', href: '/account' },
];
const house = [
  { label: 'Our story', href: '/about' },
  { label: 'Collections', href: '/collections' },
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of sale', href: '/terms' },
];
const social = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'Pinterest', href: 'https://pinterest.com' },
  { label: 'TikTok', href: 'https://tiktok.com' },
];

export function Footer({ categories }: { categories: CategoryNode[] }) {
  const shop = [
    { label: 'New arrivals', href: '/shop?isNew=true' },
    ...categories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    { label: 'Sale', href: '/shop?onSale=true' },
  ];

  return (
    <footer className="bg-ink text-bone">
      <div className="container-site pt-20 pb-10 lg:pt-28">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-display text-4xl leading-tight sm:text-5xl">
              Letters from
              <br />
              the atelier
            </p>
            <p className="mt-4 max-w-sm text-sm text-bone/60">
              New collections, private sales and the stories behind our pieces. Delivered monthly, never more.
            </p>
            <NewsletterForm source="footer" tone="dark" className="mt-8 max-w-md" />
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {[
              { title: 'Shop', links: shop },
              { title: 'Help', links: help },
              { title: 'The house', links: house },
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
        <svg aria-hidden focusable="false" viewBox="0 0 870 190" className="mt-24 w-full select-none" preserveAspectRatio="xMinYMid meet">
          <text x="0" y="160" className="fill-bone/[0.06] font-display" style={{ fontSize: 205, letterSpacing: '0.06em' }}>
            MAISON
          </text>
        </svg>

        <div className="mt-8 flex flex-col gap-6 border-t border-bone/15 pt-8 text-xs text-bone/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Maison Atelier. All rights reserved.</p>
          <ul className="flex gap-6">
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
