# Maison — Premium Fashion E‑Commerce

A full-stack luxury clothing store: an editorial storefront, a complete checkout, customer
accounts and an admin dashboard for running the shop.

**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · Motion · Express 5 · PostgreSQL 16 ·
Prisma 6 · JWT auth · Stripe (with a built-in demo mode) · Cloudinary (or local disk)

---

## Contents

- [Features](#features)
- [Project structure](#project-structure)
- [Quick start (local development)](#quick-start-local-development)
- [Environment variables](#environment-variables)
- [Database: migrations and seed data](#database-migrations-and-seed-data)
- [Scripts](#scripts)
- [Public sales demo](#public-sales-demo)
- [Payments: demo mode and Stripe](#payments-demo-mode-and-stripe)
- [Testing](#testing)
- [Deployment](#deployment)
- [Further documentation](#further-documentation)

---

## Features

**Storefront**
- Editorial home page: hero, featured collections, new arrivals, best sellers, shop by category, campaign banner, brand story, lookbook and newsletter.
- Shop, category, collection and search pages. Filters cover category, gender, size, colour, price, availability, sale and new; you can sort the results and load more.
- Product page: gallery with zoom, colour and size selection with live stock, size guide, reviews with a fit summary, related products and recently viewed.
- Bag drawer and bag page, plus a wishlist. Both work for guests and merge into the account on sign-in.
- Checkout for guests and signed-in customers, with discount codes, standard or express shipping, and Stripe or demo payments. Stock is reserved while the customer pays.
- Accounts: register, sign in, password reset, profile, saved addresses, order history and order tracking.
- SEO: metadata, a sitemap with product images, robots.txt, an Open Graph image and structured URLs.
- Accessibility: audited with axe-core (WCAG AA contrast, landmarks, labels, keyboard support), and every animation respects reduced-motion settings.

**Admin dashboard** (`/admin`)
- Overview with revenue charts and key numbers, plus a sales report with CSV export.
- Products (variants, image upload and ordering, SEO fields, duplicate, bulk actions), inventory with stock history, categories, collections, sizes and colours.
- Orders (status timeline, tracking numbers, refunds with optional restock), customers, reviews moderation, coupons, banners, newsletter export and contact messages.
- Storefront pages update instantly after admin edits (on-demand revalidation).

**Security**
- bcrypt password hashing. Short-lived JWT access tokens are kept only in memory, while the refresh token sits in an `httpOnly` cookie and changes on every use (reuse is detected).
- Admin access is re-checked against the database on every request. Every request body and query is validated with zod.
- Rate limiting on login, checkout, coupons and forms. Security headers via helmet and Next.js, plus HSTS in production.
- Prices are always recalculated on the server, and stock is reserved inside database transactions.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together.

---

## Project structure

```
.
├── apps/
│   ├── api/                 Express REST API
│   │   ├── prisma/          schema.prisma, migrations/, seed/, scripts/create-admin.ts
│   │   ├── src/             config · middleware · routes · controllers · services · providers
│   │   └── Dockerfile
│   └── web/                 Next.js storefront + admin
│       ├── src/app/         (store) · (checkout) · (admin)/admin · sitemap · robots · OG image
│       ├── src/components/  home · product · cart · checkout · account · admin · motion · ui
│       └── Dockerfile
├── packages/shared/         zod schemas + constants shared by API and web
├── deploy/Caddyfile         HTTPS reverse proxy for the production stack
├── docker-compose.yml       development database (PostgreSQL only)
├── docker-compose.prod.yml  production stack (Caddy + web + API + PostgreSQL)
└── docs/                    architecture, API, database, deployment, plans
```

---

## Quick start (local development)

### Prerequisites

- **Node.js 20.11+** (developed on Node 24) and npm 10+
- **Docker Desktop** to run PostgreSQL. A local PostgreSQL 16 also works; just update `DATABASE_URL`.

### 1. Install

```bash
git clone https://github.com/fhaka/Fashion-E-Commerce.git
cd Fashion-E-Commerce
npm install
```

`npm install` also builds `packages/shared`.

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The defaults work out of the box for local development. For anything shared, replace the
two JWT secrets with random values:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Start the database

```bash
npm run db:up
```

PostgreSQL 16 runs in Docker on host port **5434**, so it won't clash with a local install.

### 4. Create the schema and load demo data

```bash
npm run db:migrate
npm run db:seed
```

The seed creates about 37 products with variants and stock, categories, collections, banners,
coupons, 41 customers, 220 orders spread over the past year, and reviews. It prints two demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@maison.test` | `Admin12345!` (or `SEED_ADMIN_PASSWORD`) |
| Customer | `ava@maison.test` | `Customer123!` |

Demo coupons: `WELCOME10`, `FREESHIP`, `SAVE50`, `VIP20` (`SUMMER25` is deliberately expired).

### 5. Run

```bash
npm run dev
```

| URL | What |
|---|---|
| http://localhost:3000 | Storefront |
| http://localhost:3000/admin | Admin dashboard (sign in as the admin) |
| http://localhost:4000/health | API health check |

The browser only ever talks to `localhost:3000`. Next.js proxies `/api/v1/*` to the API, so
cookies work without CORS.

---

## Environment variables

Both apps validate their configuration at startup. The API refuses to boot in production
with the placeholder JWT secrets.

**API: `apps/api/.env`** (full list with comments in [`apps/api/.env.example`](apps/api/.env.example))

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | 32+ random characters each, different from each other |
| `WEB_URL` | yes | Public storefront URL (CORS, links in emails, payment redirects) |
| `API_URL` | yes | Public base URL for locally stored uploads |
| `COOKIE_SECURE` | prod | `true` behind HTTPS |
| `TRUST_PROXY` | prod | Number of reverse proxies in front of the API (real client IP for rate limits) |
| `REVALIDATE_SECRET` | optional | Shared with the web app; admin edits refresh the storefront instantly |
| `STOREFRONT_INTERNAL_URL` | optional | Private storefront address for that call (e.g. `http://web:3000`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional | Enables Stripe; leave empty for demo payments |
| `CLOUDINARY_*` | optional | Enables Cloudinary; otherwise uploads go to `apps/api/uploads` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | prod | Outgoing email via any SMTP provider; without `SMTP_HOST`, emails are printed to the API log |
| `ORDER_RESERVATION_MINUTES` | optional | How long an unpaid order holds stock (default 30) |

**Web: `apps/web/.env.local`**

| Variable | Purpose |
|---|---|
| `API_ORIGIN` | Where the API runs (server-side fetches and the `/api/v1` proxy) |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL (sitemap, Open Graph, canonical links) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Only when Stripe is enabled |
| `REVALIDATE_SECRET` | Must match the API's value |

---

## Database: migrations and seed data

| Task | Command |
|---|---|
| Create a migration after editing `schema.prisma` (dev) | `npm run db:migrate` (you'll be asked for a name) |
| Apply pending migrations (CI / production) | `npm run db:deploy` |
| Load demo data (**deletes all existing data first**) | `npm run db:seed` |
| Create or promote an admin without demo data | `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create` |
| Browse data | `npm run db:studio -w @maison/api` |

The full workflow, including backups, is in [docs/DATABASE.md](docs/DATABASE.md).

---

## Scripts

Run from the repository root:

| Script | Does |
|---|---|
| `npm run dev` | API (port 4000) and web (port 3000) with hot reload |
| `npm run build` | Builds shared, API and web for production |
| `npm run typecheck` | TypeScript in every workspace |
| `npm test` | API integration tests (needs the database running) |
| `npm run db:up` / `db:down` | Start or stop the development database |
| `npm run demo:reset` | Reset a public demo to fresh demo data (only with `DEMO_MODE=true`) |

---

## Public sales demo

Set `DEMO_MODE=true` (or deploy with `docker-compose.demo.yml`) to run a public demo:
one-click "Customer view" and "Open the admin" entry, protected demo accounts, no outgoing
email, and an automatic nightly reset (`npm run demo:reset` resets it on demand). See
[docs/DEPLOYMENT.md → Public sales demo](docs/DEPLOYMENT.md#public-sales-demo).

## Payments: demo mode and Stripe

With no `STRIPE_SECRET_KEY`, the API uses a **mock payment provider**. Checkout shows a demo
card step where you can approve or decline the payment, and orders, stock and coupons behave
exactly as they would with real payments. No money moves.

To take real payments, add Stripe keys (test keys first). Setup is in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#payments-going-live-with-stripe).

---

## Testing

```bash
npm run db:up
npm test
```

There are 123 API integration tests, covering auth, the catalogue, cart, checkout and payments
(including stock races), admin, account and demo mode. They run against a separate `maison_test` database
(your `DATABASE_URL` name plus `_test`, or `TEST_DATABASE_URL`), which is migrated and re-seeded before every run. The
setup refuses to touch any database whose name doesn't end in `_test`.

---

## Deployment

Two supported routes:

1. **Single server with Docker:** `docker-compose.prod.yml` runs Caddy (automatic HTTPS), the
   storefront, the API and PostgreSQL on one VPS.
2. **Managed platforms:** the web app on Vercel, the API on Render, Railway or Fly.io, and
   PostgreSQL on Neon, Supabase or RDS.

Step-by-step instructions and a go-live checklist are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Further documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, auth, inventory integrity, data model |
| [docs/API.md](docs/API.md) | REST API reference |
| [docs/DATABASE.md](docs/DATABASE.md) | Migrations, seeding, backups |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment and go-live checklist |
| [docs/PLANS.md](docs/PLANS.md) | Basic / Advanced / Premium client packages |
