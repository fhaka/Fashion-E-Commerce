import Link from 'next/link';
import { SITE_URL } from '@/lib/utils';
import { JsonLd } from './JsonLd';

/** Visible breadcrumbs plus matching BreadcrumbList structured data for search engines. */
export function Breadcrumbs({ items, className }: { items: { name: string; href?: string }[]; className?: string }) {
  const all = [{ name: 'Home', href: '/' }, ...items];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-[0.68rem] tracking-[0.14em] text-stone-500 uppercase">
        {all.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {item.href && i < all.length - 1 ? (
              <Link href={item.href} className="link-underline hover:text-ink">
                {item.name}
              </Link>
            ) : (
              <span aria-current={i === all.length - 1 ? 'page' : undefined} className="text-ink">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={jsonLd} />
    </nav>
  );
}
