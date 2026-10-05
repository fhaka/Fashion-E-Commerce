'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-site flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow mb-6 text-stone-500">Something went wrong</p>
      <h1 className="font-display text-display-sm font-light">We could not load this page</h1>
      <p className="mt-6 max-w-md text-stone-600">Our atelier is briefly unavailable. Please try again in a moment.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">
          Return home
        </ButtonLink>
      </div>
      {error.digest && <p className="mt-8 text-xs text-stone-500">Reference: {error.digest}</p>}
    </section>
  );
}
