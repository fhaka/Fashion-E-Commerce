# New client setup

How to turn this codebase into a client's own shop. No code changes are needed: everything
below is configuration, admin settings and content. Budget about half a day, plus the client's
time to add products.

---

## 1. Before you start: collect from the client

| Item | Used for |
|---|---|
| Their package: Basic, Advanced or Premium ([PLANS.md](PLANS.md)) | `PLAN` setting |
| Store name, legal/company name, tagline (5–8 words), one-sentence description | Header, page titles, emails, legal pages, Google and social previews |
| Logo (transparent PNG, at least 400 px wide) or "use the name as wordmark" | Header, checkout, emails |
| Three brand colours: dark (text), light (background), accent | The whole site and emails |
| Domain name (and access to its DNS) | Hosting and HTTPS |
| Currency and country/language format (e.g. EUR + fr-FR) | Prices and number formats, **fixed after launch** |
| Customer-service email, phone, address, opening hours, social links | Contact page, footer, emails |
| Shipping prices and delivery times, free-shipping threshold, return window | Checkout and the Shipping & returns page |
| Tax rate, and whether their prices include it (EU VAT: yes) | Totals at checkout |
| About-page text and a hero photo | About page |
| Lawyer-approved privacy policy and terms (or approval of the templates) | Legal pages |
| Stripe account (or plan to create one) and an email-sending service (Resend, Postmark…) | Payments and emails |

---

## 2. Deploy

Follow [DEPLOYMENT.md](DEPLOYMENT.md) (Docker on one server, or managed platforms). Client-specific
values in `.env.production`:

```bash
PLAN=advanced             # basic | advanced | premium — the package they bought
DOMAIN=shop.clientdomain.com
STORE_CURRENCY=EUR        # ISO code with 2 decimals: USD, EUR, GBP, CHF, ALL…
STORE_LOCALE=fr-FR        # number/date format: en-US, en-GB, fr-FR, de-DE, it-IT, sq-AL…
SMTP_HOST=… SMTP_USER=… SMTP_PASSWORD=…
EMAIL_FROM="Client Name <hello@clientdomain.com>"
# Fresh, random secrets for every client — never reuse another client's values:
POSTGRES_PASSWORD=… JWT_ACCESS_SECRET=… JWT_REFRESH_SECRET=… REVALIDATE_SECRET=…
```

> **Currency is permanent.** Prices are stored as cents of `STORE_CURRENCY`. Choose it before
> adding products; changing it later means re-entering every price.

**Do not load the demo seed** on a client's shop. Create their admin account instead:

```bash
dc run --rm -e ADMIN_EMAIL=owner@clientdomain.com -e ADMIN_PASSWORD='…' migrate npm run admin:create
```

The shop starts with neutral defaults ("My Store") and template pages.

---

## 3. Brand and store settings (Admin → Settings)

Sign in at `/login` with the admin account, then open **Settings**:

1. **Brand:** store name, legal name, tagline, description, logo.
2. **Contact:** customer-service email, phone, opening hours, address.
3. **Shipping & returns:** standard price and delivery time, express (on/off, price, time), free-shipping threshold (empty = never free), return window in days.
4. **Tax & currency:** tax rate, and "prices already include tax" for EU-style VAT. The currency shown comes from the deployment.
5. **Home page & announcements:** announcement bar messages (rotate at the top), home page highlights, up to three brand-story figures.
6. **Social links:** only filled ones appear in the footer.
7. **Brand colours:** the preview updates as you type; colours that would be hard to read are rejected.

Saving updates the storefront, emails and checkout immediately.

---

## 4. Pages (Admin → Pages)

Four pages start from templates that already use the settings above through placeholders
(`{{store_name}}`, `{{support_email}}`, `{{return_days}}`, `{{shipping_rates}}`…):

| Page | What to do |
|---|---|
| **About** | Replace the template with the client's story; add a hero image. A section written as a list of `**Title** — text` items becomes the numbered "pillars" band. |
| **Shipping & returns** | Adjust wording; keep `{{shipping_rates}}` so the delivery table stays in sync with Settings. |
| **Privacy policy** and **Terms of sale** | **Must be reviewed by the client's lawyer** for their country (GDPR, consumer law). The templates describe how this platform actually handles orders and data. |

The editor shows a live preview; **Reset to template** restores the original text.

---

## 5. Catalogue

In this order, so each step has what it needs:

1. **Sizes & colours** (Admin → Sizes & colours): their size scale and colour swatches.
2. **Categories** (with sub-categories, images and descriptions).
3. **Products**: images, variants (size × colour) with stock, prices, SEO fields.
4. **Collections**, **Featured** products and **Homepage banners** (hero slides, campaign, brand story, lookbook).
5. **Coupons**, e.g. a welcome code.

Use Cloudinary in production so product images are resized and served from a CDN.

---

## 6. Payments and email

- **Stripe:** test mode first, then live keys and a live webhook. See [DEPLOYMENT.md → Payments](DEPLOYMENT.md#payments-going-live-with-stripe).
- **Email:** confirm the startup log says `email: SMTP`, then trigger a password reset and an order to see the branded emails arrive (check spam; set up SPF/DKIM).

---

## 7. Go live and hand over

1. Run `npm run smoke -- https://<domain>` and the [go-live checklist](DEPLOYMENT.md#go-live-checklist).
2. Place one real order with a real card and refund it from Admin → Orders.
3. Submit `https://<domain>/sitemap.xml` in Google Search Console.
4. Hand over to the client:
   - their admin login (ask them to change the password at Account → Profile);
   - the owner's guide [HANDOVER.md](HANDOVER.md) (send it as a PDF or link);
   - a 30-minute walkthrough: orders and statuses, refunds, stock, products, coupons, banners, Settings, Pages;
   - who to contact for support, and how backups work.

---

## What clients can and can't change themselves

| They can (admin) | You change it (configuration / code) |
|---|---|
| See their package and what an upgrade adds (Settings → Your plan) | Their plan (`PLAN`; restart the API; all data is kept) |
| Everything in Settings and Pages, all catalogue content, banners, coupons, orders | Currency and locale, domain, payment and email providers |
| Brand colours and logo | Fonts and layout (code: `apps/web/src/app/layout.tsx`, `globals.css`) |
| Announcements, highlights, brand-story figures | Copy inside the storefront UI (e.g. button labels) |
