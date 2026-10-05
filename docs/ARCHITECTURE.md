# Maison — Architecture

## Overview

```
Browser ──► Next.js (apps/web) ──/api/* rewrite──► Express API (apps/api) ──► PostgreSQL
                                                         ├─► Cloudinary (or local disk)
                                                         └─► Stripe (or Mock provider)
```

- **Monorepo** (npm workspaces): `apps/api`, `apps/web`, `packages/shared`.
- **packages/shared** — zod schemas, enums and money helpers used by both the API (request validation) and the web app (form validation), so rules never drift.
- **Same-origin API** — Next.js rewrites `/api/*` to Express. The browser talks to one origin, so the refresh-token cookie is `httpOnly; SameSite=Lax` with no CORS complexity.

## Backend layering (`apps/api/src`)

| Layer | Responsibility |
|---|---|
| `config/` | zod-validated env (fails fast at boot), pino logger |
| `db/` | Prisma client singleton |
| `middleware/` | `authenticate`, `optionalAuth`, `requireAdmin`, `validate`, rate limiters, error + 404 handlers |
| `routes/` | URL → middleware chain → controller (`routes/admin/*` for the dashboard) |
| `controllers/` | Thin HTTP layer: read `req.valid`, call a service, shape the response |
| `services/` | Business logic: pricing, coupons, cart, checkout, inventory, orders, reports |
| `providers/` | Swappable integrations: `payment/` (Stripe, Mock), `storage/` (Cloudinary, Local), `email/` (Console) |
| `utils/` | `ApiError`, tokens, slugify, pagination, sanitising |

**Conventions:** success responses are `{ data, meta? }`; errors are `{ error: { code, message, details? } }`. Money is integer cents everywhere. Validated input is read from `req.valid` (Express 5 makes `req.query` read-only).

## Authentication

- Passwords hashed with bcrypt (cost 12).
- **Access token**: JWT (HS256, 15 min, issuer/audience checked), kept in memory on the client and sent as `Authorization: Bearer`.
- **Refresh token**: random 256-bit value in an `httpOnly` cookie (30 days). Only its SHA-256 hash is stored. It is rotated on every refresh, and if a revoked token is reused, every session for that user is revoked.
- `requireAdmin` re-reads role and `isActive` from the database, so a demoted or disabled admin loses access immediately.

## Inventory & checkout integrity

`Inventory.quantity` is physical stock; `Inventory.reserved` is held by unpaid orders. Available = quantity − reserved.

1. `POST /checkout` runs one transaction: re-price items from the DB (client prices are never trusted), validate the coupon, conditionally increment `reserved` (fails if insufficient), create a `PENDING` order with snapshot line items, and create a payment intent.
2. Payment success (Stripe webhook or mock confirm): `quantity −= n`, `reserved −= n`, a `SALE` movement is logged, the order becomes `PAID`, and the coupon redemption is recorded.
3. Failure, cancellation or reservation expiry (`ORDER_RESERVATION_MINUTES`): the reservation is released.

## Data model

See `apps/api/prisma/schema.prisma`. Core entities:

- **Identity:** User, RefreshToken, PasswordResetToken, Address
- **Catalog:** Category (self-referencing tree), Collection, ProductCollection, Product, ProductImage (optionally per colour), Size, Color, ProductVariant
- **Stock:** Inventory, InventoryMovement
- **Shopping:** Cart, CartItem, Wishlist, WishlistItem
- **Orders:** Order (address snapshots), OrderItem (product snapshots), OrderStatusEvent (tracking timeline), Payment
- **Marketing and other:** Coupon, CouponRedemption, Review, Banner, NewsletterSubscriber, ContactMessage

## Frontend (`apps/web`)

Next.js 16 App Router (Turbopack), TypeScript, Tailwind CSS v4, Motion (the library formerly published as Framer Motion; imported from `motion/react`).

- Catalog pages are server-rendered with ISR (for SEO); interactive islands are client components.
- Client state uses zustand: cart drawer, wishlist and recently viewed.
- Route groups: `(store)`, `(auth)`, `account/`, `admin/`.

### Design tokens

| Token | Value |
|---|---|
| Display font | Cormorant Garamond |
| UI font | Inter |
| Ink | `#0E0E0E` |
| Bone | `#F5F2ED` |
| Accent (camel) | `#B08D57` |
| Sale | muted red |
| Motion easing | `cubic-bezier(0.22, 1, 0.36, 1)`, 0.4–0.9 s |

All motion respects `prefers-reduced-motion`.

## Build phases

1. ✅ Foundation: monorepo, schema, migration, seed, Express core
2. ✅ Customer APIs: auth, catalog, cart, wishlist, reviews, newsletter, account
3. ✅ Commerce and admin APIs: checkout, coupons, payments, orders, admin CRUD, uploads, reports
4. ✅ Frontend foundation and home page
5. ✅ Shop, product page, cart, wishlist
6. ✅ Checkout, auth and account pages
7. Admin dashboard
8. SEO, performance and accessibility pass
9. Documentation and deployment guides
