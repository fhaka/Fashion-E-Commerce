export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number; // cents
  currency: string;
  email: string;
}

export interface CreatedPayment {
  providerRef: string;
  clientSecret: string;
}

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe';
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  /** Cancels an unpaid payment so it can no longer succeed (used when a reservation expires). */
  cancelPayment(providerRef: string): Promise<void>;
  refund(providerRef: string, amount?: number): Promise<{ refundRef: string }>;
}
