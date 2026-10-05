import Link from 'next/link';
import type { ReactNode } from 'react';
import { fillPlaceholders, parseMarkdown, type Block, type Inline } from '@/lib/markdown';
import type { SiteSettings } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { InfoTable, P, ProseLayout, UL } from '../ui/Prose';

/** Values for {{placeholders}} in page text, from Admin → Settings. */
export function placeholderValues(s: SiteSettings): Record<string, string> {
  const rate = `${(s.taxRate / 100).toLocaleString(s.locale, { maximumFractionDigits: 2 })}%`;
  return {
    store_name: s.storeName,
    legal_name: s.legalName,
    support_email: s.supportEmail,
    phone: s.phone ?? '',
    address: (s.address ?? '').replace(/\n/g, ', '),
    return_days: String(s.returnDays),
    free_shipping_threshold: s.freeShippingThreshold === null ? '' : formatMoney(s.freeShippingThreshold),
    currency: new Intl.DisplayNames([s.locale], { type: 'currency' }).of(s.currency) ?? s.currency,
    reservation_minutes: String(s.reservationMinutes),
    tax_rate: rate,
    tax_note:
      s.taxRate === 0
        ? ''
        : s.pricesIncludeTax
          ? `All prices include ${rate} tax.`
          : 'Applicable taxes are calculated at checkout and shown before you pay.',
  };
}

export function InlineText({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((c, i) => {
        if (c.type === 'strong') return <strong key={i} className="font-medium text-ink">{c.text}</strong>;
        if (c.type === 'em') return <em key={i}>{c.text}</em>;
        if (c.type === 'link') {
          const cls = 'underline underline-offset-4 hover:text-ink';
          return c.href.startsWith('/') ? (
            <Link key={i} href={c.href} className={cls}>
              {c.text}
            </Link>
          ) : (
            <a key={i} href={c.href} className={cls} {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {c.text}
            </a>
          );
        }
        return <span key={i}>{c.text}</span>;
      })}
    </>
  );
}

function ShippingRates({ settings: s }: { settings: SiteSettings }) {
  return (
    <InfoTable
      head={['Service', 'Delivery time', 'Cost']}
      rows={s.shippingMethods.map((m) => [
        m.label,
        m.eta,
        m.price === 0 ? 'Free' : m.freeOver !== null ? `${formatMoney(m.price)} · free over ${formatMoney(m.freeOver)}` : formatMoney(m.price),
      ])}
    />
  );
}

export function Blocks({ blocks, settings }: { blocks: Block[]; settings: SiteSettings }) {
  return (
    <>
      {blocks.map((b, i): ReactNode => {
        switch (b.type) {
          case 'p':
            return (
              <P key={i}>
                <InlineText content={b.content} />
              </P>
            );
          case 'h3':
            return (
              <h3 key={i} className="mt-8 mb-3 font-display text-xl">
                {b.text}
              </h3>
            );
          case 'ul':
            return <UL key={i} items={b.items.map((item, j) => <InlineText key={j} content={item} />)} />;
          case 'shipping-rates':
            return <ShippingRates key={i} settings={settings} />;
        }
      })}
    </>
  );
}

/** Parses page Markdown after filling placeholders from settings. */
export function renderableMarkdown(body: string, settings: SiteSettings) {
  return parseMarkdown(fillPlaceholders(body, placeholderValues(settings)));
}

/** Policy-style page: contents list + sections (Shipping & returns, Privacy, Terms). */
export function PolicyContent({ body, settings, updated }: { body: string; settings: SiteSettings; updated?: string }) {
  const { lead, sections } = renderableMarkdown(body, settings);
  return (
    <>
      {lead.length > 0 && (
        <div className="container-site -mt-4 mb-12 max-w-2xl">
          <Blocks blocks={lead} settings={settings} />
        </div>
      )}
      <ProseLayout updated={updated} sections={sections.map((s) => ({ id: s.id, title: s.title, body: <Blocks blocks={s.blocks} settings={settings} /> }))} />
    </>
  );
}

/** Fills {{placeholders}} in a short text (page intros, titles). */
export const fillText = (text: string, settings: SiteSettings) => fillPlaceholders(text, placeholderValues(settings));
