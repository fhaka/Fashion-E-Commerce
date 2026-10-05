'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { formatMoney } from '@/lib/utils';
import { Button } from '../ui/Button';
import { FormError } from '../ui/Field';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => (stripePromise ??= loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''));

/**
 * Real Stripe Payment Element. Used automatically when the API has STRIPE_SECRET_KEY set
 * and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is configured. The order is marked paid by the
 * signed Stripe webhook, never by the browser.
 */
export function StripePayment({ clientSecret, total, returnUrl }: { clientSecret: string; total: number; returnUrl: string }) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <FormError message="Stripe is enabled on the server but NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing in the storefront environment." />;
  }
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: 'flat',
          variables: { colorPrimary: '#0e0e0e', colorText: '#0e0e0e', borderRadius: '0px', fontFamily: 'Inter, system-ui, sans-serif' },
        },
      }}
    >
      <StripeForm total={total} returnUrl={returnUrl} />
    </Elements>
  );
}

function StripeForm({ total, returnUrl }: { total: number; returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setBusy(true);
        setError('');
        const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });
        // Only reached if confirmation failed (success redirects to return_url).
        setError(result.error?.message ?? 'Payment could not be completed.');
        setBusy(false);
      }}
    >
      <PaymentElement options={{ layout: 'tabs' }} />
      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!stripe}>
        Pay {formatMoney(total)}
      </Button>
    </form>
  );
}
