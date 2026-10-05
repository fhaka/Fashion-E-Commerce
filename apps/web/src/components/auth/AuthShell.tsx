import type { ReactNode } from 'react';
import { Reveal, SplitText } from '../motion';
import { Img } from '../ui/Img';

const IMAGE = 'https://images.unsplash.com/photo-1759229874914-c1ffdb3ebd0c?auto=format&fit=crop&w=1600&q=80';

/** Split-screen editorial layout used by sign-in, registration and password pages. */
export function AuthShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100svh-6.75rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-stone-200 lg:block">
        <Img src={IMAGE} alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
        <p className="absolute bottom-10 left-10 max-w-sm font-display text-3xl leading-tight font-light text-bone">
          “Made slowly, worn for years.”
        </p>
      </div>
      <div className="flex items-center justify-center px-(--spacing-gutter) py-16">
        <div className="w-full max-w-md">
          <Reveal y={10}>
            <p className="eyebrow mb-4 text-stone-500">{eyebrow}</p>
          </Reveal>
          <SplitText as="h1" inView={false} text={title} className="font-display text-display-sm font-light" />
          {intro && (
            <Reveal delay={0.15}>
              <p className="mt-4 text-stone-600">{intro}</p>
            </Reveal>
          )}
          <Reveal delay={0.25} className="mt-10">
            {children}
          </Reveal>
        </div>
      </div>
    </div>
  );
}
