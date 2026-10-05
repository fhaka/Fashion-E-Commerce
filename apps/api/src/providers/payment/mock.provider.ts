import { randomToken } from '../../utils/helpers';
import type { CreatePaymentInput, CreatedPayment, PaymentProvider } from './types';

/**
 * DEMO / TEST-MODE PAYMENT PROVIDER — NO REAL MONEY MOVES.
 *
 * Active whenever STRIPE_SECRET_KEY is not set. It mirrors the Stripe flow
 * (create intent → client confirms → server marks paid) so the full checkout,
 * stock and order pipeline can be exercised without a payment account. The
 * storefront confirms via POST /checkout/:orderNumber/confirm-mock.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  async createPayment(_input: CreatePaymentInput): Promise<CreatedPayment> {
    const ref = `mock_pi_${randomToken(12)}`;
    return { providerRef: ref, clientSecret: `${ref}_secret_${randomToken(16)}` };
  }

  async cancelPayment(): Promise<void> {
    /* nothing to cancel */
  }

  async refund(providerRef: string): Promise<{ refundRef: string }> {
    return { refundRef: `mock_re_${providerRef.slice(-8)}_${randomToken(6)}` };
  }
}
