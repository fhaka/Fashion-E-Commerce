# Changelog

## Unreleased

- Admin: every image field (collections, categories, banners, logo, About image) and the product video are uploaded from your computer (button or drag and drop) with a live preview; pasting a link remains optional.
- Product videos: MP4 or WebM up to 50 MB, content-checked, stored locally or on Cloudinary (as video). Clear error messages with the size limit.
- Fix: the storefront proxy limited request bodies to 10 MB, so larger uploads failed; raised to 60 MB.

## 1.0.0 — 2026-10-06

First production release: a white-label premium fashion store sold as Basic, Advanced and
Premium packages, with a self-resetting public demo.

### Product
- **Storefront:** editorial home page, shop, category, collection and search pages with filters, product pages with gallery, variants, size guide and reviews, cart drawer and bag page, wishlist, guest and account checkout, order confirmation and tracking, customer accounts, About, Contact, Shipping & returns, Privacy and Terms pages.
- **Admin:** dashboard and sales reports, products with variants and images, categories, collections, sizes and colours, inventory with audit trail, orders with status timeline, refunds and restocking, customers, reviews moderation, coupons, homepage banners, newsletter and messages, store settings and pages.
- **Payments:** Stripe (Payment Element, signature-verified webhooks) or a built-in demo provider; stock reserved during checkout and released automatically.
- **White-label:** store name, logo, brand colours (contrast-checked), contact details, social links, announcements, shipping prices, free-shipping threshold, tax (inclusive or added), return window, editable pages with placeholders, per-deployment currency and locale, branded HTML emails over any SMTP provider.
- **Packages:** one `PLAN` setting (basic / advanced / premium) enforced by the API and reflected in the storefront and admin; changing plan needs only an API restart and keeps all data.
- **Public demo:** `DEMO_MODE` with one-click customer/admin entry, guardrails, no outgoing email, nightly automatic reset and an on-demand reset.

### Quality
- 166 API integration tests (auth, catalogue, cart, checkout and stock races, payments, admin, account, settings and pages, plans, demo mode).
- Accessibility audited with axe-core on storefront, account, checkout and admin screens (WCAG AA).
- SEO: metadata, sitemap with images, robots.txt, Open Graph image, structured data (Premium).
- Production Docker stack (Caddy HTTPS → Next.js → API → PostgreSQL) verified end to end for every plan and the demo with `npm run smoke`.

### Security
- bcrypt passwords, short-lived JWT access tokens in memory, rotating httpOnly refresh cookies with reuse detection, database-checked admin access, zod validation on every input, rate limiting with correct client IPs behind proxies, helmet/HSTS headers, server-side pricing, demo-account protection.
- **Known advisory (accepted):** `npm audit` reports GHSA-ggr8-5vv4-36mx in `deepmerge-ts` 7.1.5, a dependency of the Prisma command-line tool's config loader. It only processes this project's own `prisma.config.ts` during migrations and is never reachable from web requests. Forcing the patched version breaks Prisma; it will be resolved by the next Prisma release that updates the dependency.

### Known limitations
- One currency and one language per shop; a single tax rate (use a tax provider for multi-country VAT).
- Legal page templates must be reviewed by a lawyer for each client.
- Fonts and storefront layout are changed in code, not in the admin.
