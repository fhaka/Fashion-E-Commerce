# Maison — Client plans

Three packages, each a superset of the one before. Every package includes the same
production foundation: Next.js + Express + PostgreSQL, JWT auth, secure headers, rate
limiting, validation, responsive mobile-first design, and Stripe-ready payments (demo mode
until keys are added).

## Basic — "Launch"

A complete, professional online store.

| Area | Included |
|---|---|
| Storefront | Home page (hero, new arrivals, best sellers, shop by category, footer), shop, category and collection pages, search |
| Catalogue | Products with multiple images, size/colour variants, live stock, sale prices |
| Filtering | Category, gender, size, price; sorting; pagination |
| Product page | Image gallery, size/colour selection, stock indicator, add to bag, buy now, details accordions |
| Bag & checkout | Cart drawer, bag page, guest and account checkout, card payment (Stripe), order confirmation emails |
| Customers | Register / sign in / password reset, profile, saved addresses, order history |
| Admin | Dashboard overview, products (add/edit/delete, image upload, variants), categories, inventory, orders with status management, customers |
| SEO | Page titles and descriptions, clean URLs, sitemap |

## Advanced — "Growth"

Everything in Basic, plus the tools to grow repeat sales.

| Area | Added |
|---|---|
| Marketing | Discount codes (%, fixed, free shipping, limits, schedules), newsletter signup and CSV export |
| Engagement | Wishlist (guest + account, synced on login), reviews and ratings with moderation and "verified purchase" |
| Discovery | Colour filter with swatches and counts, availability/sale/new filters, mega menu, instant search suggestions, related products, recently viewed |
| Merchandising | Collections management, homepage banner management, featured products |
| Orders | Guest order tracking with timeline, shipping/delivery emails, refunds and cancellations with automatic restocking |
| Admin | Revenue charts with period comparison, top products, low-stock alerts, review moderation, coupon management |

## Premium — "Maison"

Everything in Advanced, plus the full luxury editorial experience.

| Area | Added |
|---|---|
| Motion design | Animated split-text headlines, image reveal wipes, parallax, page transitions, animated cart/wishlist, hover image swap, Ken Burns hero slideshow |
| Editorial home | Campaign banner, featured product showcase, brand story, lookbook / editorial grid |
| Product experience | Hover zoom, full-screen lightbox with swipe, product video, size guide, sticky mobile add-to-bag, animated variant transitions |
| Reports | Sales reports by day/week/month and by category with CSV export, inventory audit trail |
| Infrastructure | Cloudinary image CDN, structured data (Product, Breadcrumb, Organization) for rich search results, ISR caching tuned for speed |

## How the branches relate

| Branch | Purpose |
|---|---|
| `main` | Production-ready full product (all features). |
| `dev` | Day-to-day development; merged into `main` when stable. |
| `basic`, `advanced`, `premium` | Client deliverables. Each tracks `main` and differs only by its plan configuration, so fixes flow to every tier by merging `main`. |

> Status: the tier branches are created from `main`. Feature gating per plan (a single
> plan setting that switches features on/off) is the next step once the package contents
> above are confirmed.
