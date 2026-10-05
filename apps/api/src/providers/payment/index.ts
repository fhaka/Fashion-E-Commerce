import { env } from '../../config/env';
import { MockPaymentProvider } from './mock.provider';
import { StripePaymentProvider } from './stripe.provider';
import type { PaymentProvider } from './types';

export type { PaymentProvider } from './types';
export { StripePaymentProvider } from './stripe.provider';

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  provider ??= env.STRIPE_SECRET_KEY ? new StripePaymentProvider(env.STRIPE_SECRET_KEY) : new MockPaymentProvider();
  return provider;
}
