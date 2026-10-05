'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { hasHero } from '@/lib/routes';
import { cn } from '@/lib/utils';

/** Offsets content below the fixed header, except on hero routes where the hero sits underneath it. */
export function Main({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <main id="main" className={cn('min-h-[60vh]', !hasHero(pathname) && 'pt-[6.25rem] lg:pt-[6.75rem]')}>
      {children}
    </main>
  );
}
