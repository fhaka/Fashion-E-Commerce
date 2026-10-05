'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { api, ApiRequestError } from '@/lib/api';

/** Landing page for the one-click unsubscribe link in newsletter emails (email + signed token). */
function Unsubscribe() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');
  const [error, setError] = useState('');

  if (!email || !token) {
    return <FormError message="This unsubscribe link is incomplete. Please use the link from the most recent email you received." />;
  }
  if (state === 'done') {
    return (
      <div className="space-y-6">
        <p className="text-stone-600">
          <strong className="font-medium text-ink">{email}</strong> has been removed from the Maison newsletter. You will still receive emails about any orders you place.
        </p>
        <ButtonLink href="/">Return to the store</ButtonLink>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <p className="text-stone-600">
        Stop sending the Maison newsletter to <strong className="font-medium text-ink">{email}</strong>?
      </p>
      <FormError message={error} />
      <Button
        loading={state === 'working'}
        onClick={async () => {
          setState('working');
          try {
            await api('/newsletter/unsubscribe', { method: 'POST', body: { email, token }, auth: false });
            setState('done');
          } catch (err) {
            setState('idle');
            setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
          }
        }}
      >
        Unsubscribe
      </Button>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <section className="container-site flex min-h-[60vh] items-center py-24">
      <div className="max-w-lg">
        <p className="eyebrow mb-4 text-stone-500">The Maison letter</p>
        <h1 className="mb-8 font-display text-display-sm font-light">Unsubscribe</h1>
        <Suspense>
          <Unsubscribe />
        </Suspense>
      </div>
    </section>
  );
}
