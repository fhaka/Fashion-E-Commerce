import type { ReactNode } from 'react';
import { Reveal, SplitText } from '../motion';
import { Breadcrumbs } from './Breadcrumbs';

export function PageIntro({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  breadcrumbs?: { name: string; href?: string }[];
  children?: ReactNode;
}) {
  return (
    <header className="container-site pt-10 pb-10 lg:pt-14 lg:pb-14">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-10" />}
      {eyebrow && (
        <Reveal y={10}>
          <p className="eyebrow mb-4 text-stone-500">{eyebrow}</p>
        </Reveal>
      )}
      <SplitText as="h1" inView={false} text={title} className="font-display text-display font-light" />
      {description && (
        <Reveal delay={0.2}>
          <p className="mt-6 max-w-2xl text-stone-600 lg:text-lg">{description}</p>
        </Reveal>
      )}
      {children}
    </header>
  );
}
