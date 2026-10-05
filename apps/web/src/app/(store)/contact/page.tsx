import type { Metadata } from 'next';
import { ContactForm } from '@/components/ui/ContactForm';
import { PageIntro } from '@/components/ui/PageIntro';
import { getSiteSettings } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: 'Contact us',
    description: `Contact ${s.storeName} for sizing advice, orders and returns.`,
    alternates: { canonical: '/contact' },
  };
}

export default async function ContactPage() {
  const s = await getSiteSettings();
  // Contact details come from Admin → Settings; empty fields are simply not shown.
  const details = [
    { title: 'Email', lines: [s.supportEmail], href: `mailto:${s.supportEmail}` },
    ...(s.phone ? [{ title: 'Telephone', lines: [s.phone, ...(s.openingHours ? [s.openingHours] : [])], href: `tel:${s.phone.replace(/[^+\d]/g, '')}` }] : []),
    ...(s.address ? [{ title: 'Address', lines: s.address.split('\n').filter(Boolean), href: undefined }] : []),
  ];
  return (
    <>
      <PageIntro eyebrow="We are here to help" title="Contact us" description="Sizing advice, order questions and returns — we are happy to help." breadcrumbs={[{ name: 'Contact' }]} />
      <div className="container-site grid gap-16 pb-(--spacing-section) lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <aside className="space-y-10 lg:col-span-4 lg:col-start-9">
          {details.map((d) => (
            <div key={d.title}>
              <h2 className="eyebrow mb-3 text-stone-500">{d.title}</h2>
              {d.lines.map((l, i) =>
                i === 0 && d.href ? (
                  <a key={l} href={d.href} className="link-underline text-lg">
                    {l}
                  </a>
                ) : (
                  <p key={l} className={i === 0 ? 'text-lg' : 'text-sm text-stone-600'}>
                    {l}
                  </p>
                ),
              )}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
