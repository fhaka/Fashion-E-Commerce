import type { Metadata } from 'next';
import { ContactForm } from '@/components/ui/ContactForm';
import { PageIntro } from '@/components/ui/PageIntro';

export const metadata: Metadata = {
  title: 'Client services',
  description: 'Contact Maison client services for sizing advice, orders, returns and repairs. We reply within one business day.',
  alternates: { canonical: '/contact' },
};

const DETAILS = [
  { title: 'Email', lines: ['clientservices@maison.example', 'Replies within one business day'] },
  { title: 'Telephone', lines: ['+33 1 00 00 00 00', 'Monday – Saturday, 9am – 7pm CET'] },
  { title: 'Atelier', lines: ['12 Rue de Turenne', '75004 Paris, France', 'Appointments only'] },
];

export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="We are here to help" title="Client services" description="Sizing advice, order questions, returns and repairs — our advisors are happy to help." breadcrumbs={[{ name: 'Contact' }]} />
      <div className="container-site grid gap-16 pb-(--spacing-section) lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <aside className="space-y-10 lg:col-span-4 lg:col-start-9">
          {DETAILS.map((d) => (
            <div key={d.title}>
              <h2 className="eyebrow mb-3 text-stone-500">{d.title}</h2>
              {d.lines.map((l, i) => (
                <p key={l} className={i === 0 ? 'text-lg' : 'text-sm text-stone-600'}>
                  {l}
                </p>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
