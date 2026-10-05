import type { ContentPageSlug } from '@maison/shared';

export { DEFAULT_SETTINGS } from '@maison/shared';

/*
 * Page templates. Placeholders such as {{store_name}} are filled in from store settings when the
 * page is displayed, so the text stays correct when settings change.
 *
 * LEGAL TEMPLATES: they describe how this platform actually handles orders and data, but must be
 * reviewed by legal counsel for each client and jurisdiction (GDPR, CCPA, consumer law) before launch.
 */
export const DEFAULT_PAGES: Record<ContentPageSlug, { title: string; intro: string | null; body: string; imageUrl: string | null }> = {
  about: {
    title: 'Our story',
    intro: 'Tell your customers who you are, what you make and why it matters.',
    imageUrl: null,
    body: `## What we believe

- **Quality first** — Describe how your products are made and the materials you choose.
- **Made to last** — Explain what makes your pieces worth keeping.
- **People we know** — Introduce the makers and partners behind your collection.

## Our approach

Write a few paragraphs about your brand: where it started, how you design, and what customers can expect from {{store_name}}.`,
  },

  'shipping-returns': {
    title: 'Shipping & returns',
    intro: 'Delivery options, costs and our {{return_days}}-day return policy.',
    imageUrl: null,
    body: `## Delivery

Orders are prepared within one business day. You will receive a tracking link by email as soon as your order ships.

{{shipping_rates}}

## Tracking your order

Signed-in customers can follow every order from [My account](/account/orders). If you checked out as a guest, use [Track an order](/track-order) with your order number and email.

## Returns

If something is not right, you may return it within {{return_days}} days of delivery.

- Items must be unworn, unwashed and with all original tags attached.
- Refunds are issued to your original payment method once the return has been inspected.

To start a return, [contact us](/contact) with your order number.

## Exchanges

Need a different size? [Contact us](/contact) and we will arrange an exchange.`,
  },

  privacy: {
    title: 'Privacy policy',
    intro: null,
    imageUrl: null,
    body: `## Who we are

This website is operated by {{legal_name}}. Questions about your data: {{support_email}}.

## Information we collect

- Account details: your name, email address, phone number (optional) and an encrypted password.
- Order details: delivery and billing addresses, the items you buy and your order history.
- Payment details are entered directly with our payment provider. {{store_name}} never sees or stores your full card number.
- Shopping preferences you choose to save, such as your wishlist and saved addresses.
- Technical information needed to keep the site secure, such as session cookies.

## How we use it

- To process, deliver and support your orders and returns.
- To keep your account secure and prevent fraud.
- To send service emails about your orders.
- To send our newsletter — only if you have opted in. Every email includes a one-click unsubscribe link.

## Cookies

We use a small number of strictly necessary cookies: one keeps you signed in securely, one remembers your shopping bag, and one indicates that a session exists. Your wishlist and recently viewed items are stored in your own browser. We do not use advertising or cross-site tracking cookies.

## Who we share it with

We share only what is necessary with the providers who help us operate: our payment processor, delivery carriers, email delivery and hosting providers. We never sell your personal information.

## How long we keep it

Order records are kept for as long as required for accounting and tax purposes. You may close your account at any time, after which we delete or anonymise data we are not legally required to keep.

## Your rights

You can access, correct or delete your personal information, object to its use, or request a copy. Most details can be updated in [My account](/account/profile); for anything else, [contact us](/contact).`,
  },

  terms: {
    title: 'Terms of sale',
    intro: null,
    imageUrl: null,
    body: `## Seller

These terms apply to purchases from {{legal_name}} through this website. Contact: {{support_email}}.

## Orders

Your order is accepted once payment is confirmed and you receive an order confirmation email. Items in your bag are not reserved until you begin checkout; during checkout, stock is held for {{reservation_minutes}} minutes.

We may cancel an order if an item becomes unavailable or a pricing error occurs, in which case any payment is refunded in full.

## Pricing & payment

- Prices are shown in {{currency}}. {{tax_note}}
- Payment is taken when you place your order. Card details are processed securely by our payment provider.
- Discount codes are subject to their stated conditions (minimum spend, dates, usage limits) and cannot be exchanged for cash.

## Delivery & returns

Delivery options, timings and our return policy are described on our [Shipping & returns](/shipping-returns) page, which forms part of these terms.

## Reviews

Reviews must reflect your genuine experience of the product. We moderate every review before publishing and may decline content that is offensive, off-topic or contains personal information. Reviews from customers who bought the item are marked “Verified purchase”.

## Liability

Nothing in these terms limits your statutory rights as a consumer. Our liability for any order is limited to the price paid for that order, except where the law does not allow such a limitation.`,
  },
};
