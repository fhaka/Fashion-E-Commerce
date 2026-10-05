import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/ui/PageIntro';
import { P, ProseLayout, UL } from '@/components/ui/Prose';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How Maison collects, uses and protects your personal information.',
  alternates: { canonical: '/privacy' },
};

/*
 * TEMPLATE POLICY — written to match how this platform actually handles data, but it must be
 * reviewed by legal counsel for each client and jurisdiction (GDPR, CCPA, etc.) before launch.
 */
export default function PrivacyPage() {
  const sections = [
    {
      id: 'collect',
      title: 'Information we collect',
      body: (
        <UL
          items={[
            'Account details: your name, email address, phone number (optional) and an encrypted password.',
            'Order details: delivery and billing addresses, the items you buy and your order history.',
            'Payment details are entered directly with our payment provider. Maison never sees or stores your full card number.',
            'Shopping preferences you choose to save, such as your wishlist and saved addresses.',
            'Technical information needed to keep the site secure, such as session cookies.',
          ]}
        />
      ),
    },
    {
      id: 'use',
      title: 'How we use it',
      body: (
        <UL
          items={[
            'To process, deliver and support your orders, returns and repairs.',
            'To keep your account secure and prevent fraud.',
            'To send service emails about your orders (these cannot be switched off while an order is active).',
            'To send our newsletter — only if you have opted in. Every email includes a one-click unsubscribe link.',
          ]}
        />
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies',
      body: (
        <P>
          We use a small number of strictly necessary cookies: one keeps you signed in securely, one remembers your shopping bag, and one indicates that a session exists.
          Your wishlist and recently viewed items are stored in your own browser. We do not use advertising or cross-site tracking cookies.
        </P>
      ),
    },
    {
      id: 'sharing',
      title: 'Who we share it with',
      body: <P>We share only what is necessary with the providers who help us operate: our payment processor, delivery carriers, email delivery and hosting providers. We never sell your personal information.</P>,
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      body: <P>Order records are kept for as long as required for accounting and tax purposes. You may close your account at any time, after which we delete or anonymise data we are not legally required to keep.</P>,
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: (
        <P>
          You can access, correct or delete your personal information, object to its use, or request a copy. Most details can be updated in{' '}
          <Link href="/account/profile" className="underline underline-offset-4">My account</Link>; for anything else, <Link href="/contact" className="underline underline-offset-4">contact us</Link>.
        </P>
      ),
    },
  ];

  return (
    <>
      <PageIntro eyebrow="Legal" title="Privacy policy" breadcrumbs={[{ name: 'Privacy policy' }]} />
      <ProseLayout sections={sections} updated="October 2026" />
    </>
  );
}
