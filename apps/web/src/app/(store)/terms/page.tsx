import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/ui/PageIntro';
import { P, ProseLayout, UL } from '@/components/ui/Prose';

export const metadata: Metadata = {
  title: 'Terms of sale',
  description: 'The terms that apply when you shop with Maison.',
  alternates: { canonical: '/terms' },
};

/*
 * TEMPLATE TERMS — they reflect how this platform works (pricing, stock holds, discount codes,
 * reviews), but must be reviewed by legal counsel for each client and jurisdiction before launch.
 */
export default function TermsPage() {
  const sections = [
    {
      id: 'orders',
      title: 'Orders',
      body: (
        <>
          <P>Your order is accepted once payment is confirmed and you receive an order confirmation email. Items in your bag are not reserved until you begin checkout; during checkout, stock is held for 30 minutes.</P>
          <P>We may cancel an order if an item becomes unavailable or a pricing error occurs, in which case any payment is refunded in full.</P>
        </>
      ),
    },
    {
      id: 'pricing',
      title: 'Pricing & payment',
      body: (
        <UL
          items={[
            'Prices are shown in US dollars. Applicable taxes are calculated at checkout and shown before you pay.',
            'Payment is taken when you place your order. Card details are processed securely by our payment provider.',
            'Discount codes are subject to their stated conditions (minimum spend, dates, usage limits) and cannot be exchanged for cash.',
          ]}
        />
      ),
    },
    {
      id: 'delivery',
      title: 'Delivery & returns',
      body: (
        <P>
          Delivery options, timings and our return policy are described on our <Link href="/shipping-returns" className="underline underline-offset-4">Shipping & returns</Link> page, which forms part of these terms.
        </P>
      ),
    },
    {
      id: 'reviews',
      title: 'Reviews',
      body: <P>Reviews must reflect your genuine experience of the product. We moderate every review before publishing and may decline content that is offensive, off-topic or contains personal information. Reviews from customers who bought the item are marked “Verified purchase”.</P>,
    },
    {
      id: 'liability',
      title: 'Liability',
      body: <P>Nothing in these terms limits your statutory rights as a consumer. Our liability for any order is limited to the price paid for that order, except where the law does not allow such a limitation.</P>,
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <P>
          Questions about these terms? <Link href="/contact" className="underline underline-offset-4">Contact client services</Link>.
        </P>
      ),
    },
  ];

  return (
    <>
      <PageIntro eyebrow="Legal" title="Terms of sale" breadcrumbs={[{ name: 'Terms of sale' }]} />
      <ProseLayout sections={sections} updated="October 2026" />
    </>
  );
}
