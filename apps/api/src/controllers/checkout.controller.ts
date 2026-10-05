import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../db/prisma';
import { getPaymentProvider, StripePaymentProvider } from '../providers/payment';
import { describeCoupon, validateCoupon } from '../services/pricing.service';
import { getSettings, shippingOptions } from '../services/settings.service';
import * as orders from '../services/order.service';
import { ApiError } from '../utils/ApiError';
import { getCartSession } from '../utils/cookies';

const owner = (req: Request) => (req.user ? { userId: req.user.id } : { sessionId: getCartSession(req) });

export async function config(_req: Request, res: Response) {
  res.json({
    data: {
      paymentProvider: getPaymentProvider().name,
      reservationMinutes: env.ORDER_RESERVATION_MINUTES,
      currency: env.STORE_CURRENCY,
      shippingMethods: shippingOptions(await getSettings()),
    },
  });
}

export async function quote(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store');
  res.json({ data: await orders.quote(owner(req), req.valid.body, req.valid.body.email) });
}

export async function validateCouponCode(req: Request, res: Response) {
  const { code, subtotal, email } = req.valid.body;
  const coupon = await validateCoupon(code, subtotal, { userId: req.user?.id, email });
  res.json({ data: describeCoupon(coupon) });
}

export async function placeOrder(req: Request, res: Response) {
  res.status(201).json({ data: await orders.createOrder(owner(req), req.valid.body) });
}

export async function confirmMock(req: Request, res: Response) {
  const { clientSecret, outcome } = req.valid.body;
  res.json({ data: await orders.confirmMockPayment((req.params.orderNumber as string).toUpperCase(), clientSecret, outcome) });
}

export async function abandon(req: Request, res: Response) {
  res.json({ data: await orders.abandonPendingOrder((req.params.orderNumber as string).toUpperCase(), req.valid.body.clientSecret) });
}

export async function confirmation(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store');
  const data = await orders.getConfirmation((req.params.orderNumber as string).toUpperCase(), {
    key: typeof req.query.key === 'string' ? req.query.key : undefined,
    userId: req.user?.id,
  });
  res.json({ data });
}

/** Stripe webhook — requires the raw body for signature verification. */
export async function stripeWebhook(req: Request, res: Response) {
  const provider = getPaymentProvider();
  if (!(provider instanceof StripePaymentProvider) || !env.STRIPE_WEBHOOK_SECRET) throw ApiError.notFound();

  let event: Stripe.Event;
  try {
    event = provider.constructWebhookEvent(req.body as Buffer, req.get('stripe-signature') ?? '', env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw ApiError.badRequest('Invalid webhook signature');
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const payment = await prisma.payment.findUnique({ where: { providerRef: intent.id } });
      if (payment) await orders.markOrderPaid(payment.orderId, intent.id);
      break;
    }
    case 'payment_intent.payment_failed':
      await orders.recordPaymentFailure(intent.id, intent.last_payment_error?.message ?? 'payment_failed');
      break;
    default:
      logger.debug({ type: event.type }, 'Unhandled Stripe event');
  }
  res.json({ received: true });
}
