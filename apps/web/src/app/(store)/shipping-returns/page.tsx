import type { Metadata } from 'next';
import Link from 'next/link';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from '@maison/shared';
import { PageIntro } from '@/components/ui/PageIntro';
import { InfoTable, P, ProseLayout, UL } from '@/components/ui/Prose';
import { formatMoney } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Shipping & returns',
  description: `Complimentary standard shipping over ${formatMoney(FREE_SHIPPING_THRESHOLD)}, express delivery, and free returns within 30 days.`,
  alternates: { canonical: '/shipping-returns' },
};

export default function ShippingReturnsPage() {
  const sections = [
    {
      id: 'delivery',
      title: 'Delivery',
      body: (
        <>
          <P>Orders placed before 2pm (CET) on a business day are prepared in our atelier the same day. You will receive a tracking link by email as soon as your order ships.</P>
          <InfoTable
            head={['Service', 'Delivery time', 'Cost']}
            rows={[
              [SHIPPING_METHODS.standard.label, SHIPPING_METHODS.standard.description, `${formatMoney(SHIPPING_METHODS.standard.price)} · complimentary over ${formatMoney(FREE_SHIPPING_THRESHOLD)}`],
              [SHIPPING_METHODS.express.label, SHIPPING_METHODS.express.description, formatMoney(SHIPPING_METHODS.express.price)],
            ]}
          />
          <P>Every order arrives in our signature recyclable packaging. Items over {formatMoney(50000)} are shipped with signature on delivery.</P>
        </>
      ),
    },
    {
      id: 'tracking',
      title: 'Tracking your order',
      body: (
        <P>
          Signed-in clients can follow every order from <Link href="/account/orders" className="underline underline-offset-4">My account</Link>. If you checked out as a guest, use{' '}
          <Link href="/track-order" className="underline underline-offset-4">Track an order</Link> with your order number and email.
        </P>
      ),
    },
    {
      id: 'returns',
      title: 'Returns',
      body: (
        <>
          <P>We want you to love every piece. If something is not right, you may return it free of charge within 30 days of delivery.</P>
          <UL
            items={[
              'Items must be unworn, unwashed and with all original tags attached.',
              'Footwear must be returned in its original box and tried on indoors only.',
              'Pieces from the Archive Sale can be exchanged but not refunded.',
              'Refunds are issued to your original payment method within 5–10 business days of the return arriving at our atelier.',
            ]}
          />
          <P>
            To start a return, contact <Link href="/contact" className="underline underline-offset-4">client services</Link> with your order number and we will send a prepaid
            label.
          </P>
        </>
      ),
    },
    {
      id: 'exchanges',
      title: 'Exchanges',
      body: <P>Need a different size? We will reserve the new size for you and ship it as soon as your return is scanned by the carrier — no need to wait for it to arrive.</P>,
    },
    {
      id: 'repairs',
      title: 'Repairs & aftercare',
      body: <P>All Maison outerwear comes with complimentary lifetime repairs, and our Goodyear-welted footwear can be resoled. Contact us to arrange collection.</P>,
    },
  ];

  return (
    <>
      <PageIntro eyebrow="Client services" title="Shipping & returns" description="Complimentary shipping, free 30-day returns and lifetime repairs on outerwear." breadcrumbs={[{ name: 'Shipping & returns' }]} />
      <ProseLayout sections={sections} />
    </>
  );
}
