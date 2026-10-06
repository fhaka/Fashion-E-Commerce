# Maison — Client plans

Three packages, each including everything in the one before. They are **one codebase**: a
single setting, `PLAN=basic | advanced | premium`, switches features on or off across the
API (enforced: closed features return 404), the storefront and the admin. The definitive list
lives in [`packages/shared/src/plans.ts`](../packages/shared/src/plans.ts); this page mirrors it.

Every package includes the same production foundation: Next.js + Express + PostgreSQL, secure
JWT authentication, security headers, rate limiting, validation, responsive mobile-first design,
accessibility (WCAG AA), card payments with Stripe (demo mode until keys are added), branded
emails, and the white-label admin (Settings and Pages) so each client's shop carries their own
name, logo, colours, currency, shipping and tax rules.

---

## Basic — "Launch"

A complete, professional online store.

| Area | Included |
|---|---|
| Storefront | Home page (hero slideshow, highlights strip, new arrivals, best sellers, shop by category), shop, category pages, search results, About, Contact, Shipping & returns, Privacy and Terms pages |
| Catalogue | Products with multiple images, size/colour variants, live stock, sale prices |
| Filtering | Category, gender, size and price filters; sorting; load more |
| Product page | Image gallery, size/colour selection, stock indicator, add to bag, buy now, details accordions |
| Bag & checkout | Cart drawer, bag page, guest and account checkout, card payment, order confirmation emails |
| **Discount codes** | Percentage, fixed amount and free-shipping codes with minimum spend, usage limits and dates |
| Customers | Register / sign in / password reset, profile, saved addresses, order history |
| Admin | Dashboard (key figures and recent orders), products (images, variants), categories, sizes & colours, inventory, orders with status management, customers, homepage hero, contact messages, Settings, Pages |
| SEO | Page titles and descriptions, clean URLs, sitemap, social sharing image |

## Advanced — "Growth"

Everything in Basic, plus the tools to grow repeat sales.

| Area | Added |
|---|---|
| Engagement | Wishlist (guest and account, synced on sign-in); reviews and ratings with moderation and "verified purchase" |
| Marketing | Newsletter signup (home page, footer, registration) and subscriber CSV export |
| Discovery | Colour filter with swatches, availability / sale / new-in filters, mega menu, instant search suggestions, related products, recently viewed |
| Merchandising | Collections (pages and management) |
| Orders | Guest order tracking with timeline, shipping and delivery emails, refunds and cancellations with automatic restocking |
| Admin | Revenue chart with period comparison, orders by status, top products, low-stock alerts |

## Premium — "Maison"

Everything in Advanced, plus the full luxury editorial experience. The public demo runs on Premium.

| Area | Added |
|---|---|
| Motion design | Animated split-text headlines, image reveal wipes, parallax, page transitions, Ken Burns hero slideshow (always respecting reduced-motion settings) |
| Editorial home | Campaign banner, featured product showcase, brand story with figures, lookbook grid |
| Product experience | Hover zoom, full-screen lightbox, product video, size guide |
| Reports | Sales reports by day / week / month with CSV export; inventory audit trail |
| Search | Structured data (Product, Breadcrumb, Organization) for rich search results |

---

## Choosing and changing a plan

- Set `PLAN` in the deployment environment (`.env.production` for Docker, or the API's
  environment variables on a managed platform) and restart the API. The storefront picks it up
  automatically; no rebuild is needed.
- **Upgrades** keep all data: switching Basic → Advanced simply turns the new features on.
- **Downgrades** hide features but keep their data (reviews, collections, subscribers, editorial
  banners), so upgrading again brings everything back.
- The client sees their package and what an upgrade adds in **Admin → Settings → Your plan**.

## Git branches

| Branch | Purpose |
|---|---|
| `main` | Production-ready product. Deploy this for every client, with their `PLAN`. |
| `dev` | Day-to-day development; merged into `main` when stable. |
| `basic`, `advanced`, `premium` | Historical: created before plans became a setting. No longer needed for delivery, since every client runs `main`. Keep or delete them as you prefer. |
