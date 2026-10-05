import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Reveal, SplitText } from '../motion';

export function SectionHeading({
  eyebrow,
  title,
  link,
  className,
  align = 'between',
  tone = 'dark',
  id,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  link?: { label: string; href: string };
  className?: string;
  align?: 'between' | 'center';
  tone?: 'dark' | 'light';
}) {
  return (
    <div className={cn('mb-10 flex flex-col gap-6 lg:mb-14', align === 'between' ? 'sm:flex-row sm:items-end sm:justify-between' : 'items-center text-center', className)}>
      <div>
        <Reveal y={12}>
          <p className={cn('eyebrow mb-4', tone === 'dark' ? 'text-stone-500' : 'text-bone/60')}>{eyebrow}</p>
        </Reveal>
        <SplitText id={id} text={title} className="font-display text-display-sm font-light" />
      </div>
      {link && (
        <Reveal y={12} delay={0.2}>
          <Link href={link.href} className="link-underline shrink-0 text-[0.7rem] tracking-[0.18em] uppercase">
            {link.label}
          </Link>
        </Reveal>
      )}
    </div>
  );
}
