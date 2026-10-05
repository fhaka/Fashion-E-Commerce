import Stripe from 'stripe';
import type { CreatePaymentInput, CreatedPayment, PaymentProvider } from './types';

/** Real Stripe integration (PaymentIntents + webhooks). Enabled by setting STRIPE_SECRET_KEY. */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  readonly stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { maxNetworkRetries: 2, appInfo: { name: 'Maison' } });
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: input.amount,
        currency: input.currency.toLowerCase(),
        receipt_email: input.email,
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      },
      // Retrying order creation never creates a second charge.
      { idempotencyKey: `order_${input.orderId}` },
    );
    if (!intent.client_secret) throw new Error('Stripe did not return a client secret');
    return { providerRef: intent.id, clientSecret: intent.client_secret };
  }

  async cancelPayment(providerRef: string): Promise<void> {
    const intent = await this.stripe.paymentIntents.retrieve(providerRef);
    if (!['succeeded', 'canceled'].includes(intent.status)) {
      await this.stripe.paymentIntents.cancel(providerRef);
    }
  }

  async refund(providerRef: string, amount?: number): Promise<{ refundRef: string }> {
    const refund = await this.stripe.refunds.create({ payment_intent: providerRef, ...(amount ? { amount } : {}) });
    return { refundRef: refund.id };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
