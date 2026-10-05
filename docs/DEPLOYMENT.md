# Maison — Deployment guide

There are two supported ways to run Maison in production. Pick one:

| | A. Single server with Docker | B. Managed platforms |
|---|---|---|
| What runs where | One VPS runs Caddy (HTTPS), the web app, the API and PostgreSQL | Web on Vercel, API on Render, Railway or Fly.io, database on Neon, Supabase or RDS |
| Cost | One server (from about $10–20/month) | Free tiers to start, then pay per service |
| Effort | You manage the server, updates and backups | The platforms handle servers, TLS and backups |
| Good for | Full control, predictable cost | Least operations work, scales automatically |

Whichever you choose, finish with the [go-live checklist](#go-live-checklist).

---

## A. Single server with Docker

The stack is defined in [`docker-compose.prod.yml`](../docker-compose.prod.yml):

```
internet ─▶ caddy :80/:443 ─▶ web :3000 ─▶ api :4000 ─▶ postgres :5432
                (HTTPS)        (Next.js)     (Express)
```

Only Caddy is reachable from the internet. It gets and renews Let's Encrypt certificates
automatically. The storefront forwards `/api/v1/*` and `/uploads/*` to the private API, and
PostgreSQL is never exposed.

### 1. Server

- Ubuntu 22.04/24.04 (or any Linux) with **2 vCPU / 4 GB RAM**; the Next.js build needs about 2 GB.
- Install Docker Engine with the Compose plugin: https://docs.docker.com/engine/install/
- Firewall: allow 22 (SSH), 80 and 443, and nothing else.
- DNS: create an **A record** (and AAAA for IPv6) for your domain pointing at the server's IP.
  Add `www` too if you want the www → apex redirect.

### 2. Get the code and configure it

```bash
git clone https://github.com/fhaka/Fashion-E-Commerce.git maison
cd maison
cp .env.production.example .env.production
nano .env.production
```

Fill in at least:
- `DOMAIN` (e.g. `shop.example.com`)
- `STORE_CURRENCY` and `STORE_LOCALE` (e.g. `EUR` and `fr-FR`). These are permanent once products exist, because prices are stored in that currency.
- `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `REVALIDATE_SECRET`. Generate each one separately with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` or
  `openssl rand -hex 48`.
- `SMTP_*` and `EMAIL_FROM`. Without them, customers can't reset passwords or receive order emails.
- `CLOUDINARY_*` (recommended). Otherwise uploaded images are stored in a Docker volume.
- Stripe keys only when you're ready for real payments. Empty keys mean demo mode.

`.env.production` is git-ignored. Keep it only on the server, with `chmod 600 .env.production`.

### 3. Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The first build takes a few minutes. Startup order is handled for you:

1. **postgres** starts and becomes healthy.
2. **migrate** applies all pending Prisma migrations, then exits.
3. **api** starts once migrations succeed and becomes healthy.
4. **web** starts once the API is healthy.
5. **caddy** gets the HTTPS certificate and starts serving.

Check:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
curl -I https://shop.example.com
curl https://shop.example.com/api/v1/health
```

> Tip: create an alias so you don't type the long command every time:
> `alias dc='docker compose -f docker-compose.prod.yml --env-file .env.production'`
> The rest of this guide uses `dc`.

### 4. Create your admin account

> Setting up a shop for a client? Follow [CLIENT-SETUP.md](CLIENT-SETUP.md) from here: it covers branding, settings, pages, catalogue and handover.


For a **real launch**, create only your admin and add products through `/admin`:

```bash
dc run --rm -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='choose-a-strong-one-1' migrate npm run admin:create
```

For a **demo or staging** site, load the full demo shop instead. It deletes all existing data
first, and creates the public demo customer `ava@maison.test` / `Customer123!`, so never do
this on a live shop:

```bash
dc run --rm -e SEED_ADMIN_PASSWORD='choose-a-strong-one-1' migrate npm run db:seed
```

### 5. Day-to-day operations

| Task | Command |
|---|---|
| Logs (follow) | `dc logs -f api web` |
| Restart one service | `dc restart api` |
| Deploy a new version | `git pull && dc up -d --build` (new migrations run automatically) |
| Stop everything | `dc down` (data volumes are kept; never add `-v` on production) |
| Database shell | `dc exec postgres psql -U maison -d maison` |
| Backup / restore | See [DATABASE.md → Backups](DATABASE.md#backups-and-restore) |

**Rolling back:** check out the previous release (`git checkout <tag>`) and run
`dc up -d --build`. Migrations don't roll back automatically. If a release included a
migration, restore the backup you took before deploying, or write a corrective migration.
Back up before every deploy that changes the schema.

### Notes on the Docker images

- `apps/api/Dockerfile` builds two targets. `runtime` is the slim API server, running as a
  non-root user with a health check. `build` has the full toolchain and is used by the
  `migrate` service for migrations, the seed and `admin:create`.
- `apps/web/Dockerfile` produces a Next.js **standalone** server, also non-root.
- `API_ORIGIN` and `NEXT_PUBLIC_*` are **baked into the web image at build time**. Rebuild
  after changing `DOMAIN` or the Stripe publishable key: `dc up -d --build web`.
- The web image is built without access to the API, so data-backed pages are rendered on
  first request instead of prerendered at build time (`src/lib/buildGuard.ts`). API data is
  still cached and refreshed instantly when the admin edits something, so pages stay fast.
- Rate limiting sees each visitor's real IP: the stack sets `TRUST_PROXY=2` for its two
  proxy hops (Caddy, then Next.js). If you add another proxy or CDN in front, increase it by one.

---

## Public sales demo

Run a demo that prospects can try on their own: the full shop **and** the admin, with
nothing for them to break. Deploy it exactly like option A, on its own domain (e.g.
`demo.yourstudio.com`), adding the demo override file:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.demo.yml   --env-file .env.production up -d --build
```

What demo mode does:

| | |
|---|---|
| Demo data | Loaded automatically on first start (products, 220 orders of history, customers, reviews, coupons) |
| One-click entry | A floating "Live demo" panel and the sign-in page offer **Customer view** and **Open the admin**, with no passwords to share |
| Nightly reset | Every day at `DEMO_RESET_HOUR_UTC` (default 03:00 UTC): data re-seeded, visitor uploads deleted, page cache refreshed |
| Guardrails | Demo accounts can't change their password; roles can't be changed; admins can't be disabled |
| No real email | Visitors type arbitrary addresses, so email is only written to the log, even if SMTP is configured |
| Payments | Simulated (keep Stripe keys empty). Checkout has a **Fill in demo details** button with a test card; card `4000 0000 0000 0002` shows a declined payment |

**Before a sales call**, give the prospect a fresh shop:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.demo.yml   --env-file .env.production exec demo-reset npm run demo:reset
```

**Suggested demo script (10 minutes):**
1. Home page: hero, collections, scroll animations; resize to mobile.
2. Shop: filters, sorting, quick add; product page with gallery zoom, sizes, stock and reviews.
3. Add to bag, apply `WELCOME10`, check out with **Fill in demo details**.
4. **Open the admin**: the new order on the dashboard, change its status to *Shipped* with a tracking number.
5. Edit a product's price in the admin, then refresh the storefront: it updates instantly.
6. Reports (CSV export), inventory, coupons and banners.

The reset refuses to run unless `DEMO_MODE=true`, so the demo tooling can never wipe a
client's real shop. Never deploy a client's shop with `docker-compose.demo.yml`.

---

## B. Managed platforms

The browser always talks to the **web** domain, and Next.js proxies `/api/v1/*` to the API,
so cookies stay first-party and the API can live on any domain.

### 1. Database (Neon, Supabase, RDS…)

Create a PostgreSQL 16 database and copy its connection string. Many providers require
`?sslmode=require` at the end. Enable automated backups.

### 2. API (Render example; Railway and Fly.io are similar)

Create a **Web Service** from the repository:

| Setting | Value |
|---|---|
| Runtime | Node 20+ (or Docker with `apps/api/Dockerfile`) |
| Build command | `npm ci && npm run build -w @maison/shared && npm run build -w @maison/api` |
| Pre-deploy command | `npm run db:deploy` (on plans without one, append `&& npm run db:deploy` to the build command) |
| Start command | `npm run start -w @maison/api` |
| Health check path | `/health` |

Environment variables (see `apps/api/.env.example` for all of them):

```
NODE_ENV=production
DATABASE_URL=postgresql://…
WEB_URL=https://shop.example.com
API_URL=https://maison-api.onrender.com
JWT_ACCESS_SECRET=…            # random, 32+ chars
JWT_REFRESH_SECRET=…           # different random value
COOKIE_SECURE=true
TRUST_PROXY=2                  # proxies in front of the API — see the note below
REVALIDATE_SECRET=…            # same value as on the web app
CLOUDINARY_CLOUD_NAME=… CLOUDINARY_API_KEY=… CLOUDINARY_API_SECRET=…
SMTP_HOST=… SMTP_PORT=587 SMTP_USER=… SMTP_PASSWORD=… EMAIL_FROM="Maison <hello@example.com>"
```

`TRUST_PROXY` is the number of proxies between the visitor and the API, and it depends on the
platforms you combine. For Vercel in front of Render it's typically 2 (Vercel's edge, then
Render's load balancer). Confirm after launch: if login rate limits hit all visitors at once,
the value is too low; if one visitor can retry without limit by sending a fake
`X-Forwarded-For` header, it's too high.

**Cloudinary is required here:** platform disks are ephemeral, so local uploads would vanish
on every deploy.

Create the admin from your machine once, pointing at the production database:

```bash
cd apps/api
DATABASE_URL='postgresql://…' ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run admin:create
```

### 3. Web (Vercel)

Import the repository and set:

| Setting | Value |
|---|---|
| Root directory | `apps/web` |
| Framework | Next.js (auto-detected; npm workspaces are installed from the repo root) |
| Node.js | 20+ |

Environment variables:

```
API_ORIGIN=https://maison-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://shop.example.com
REVALIDATE_SECRET=…                 # same as the API
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # only with Stripe
```

Add your domain in Vercel and point DNS at it. Deploy the API first: with the API reachable
during the build, pages are prerendered at build time.

---

## Payments: going live with Stripe

Until Stripe keys are set, checkout runs in **demo mode** and no money moves.

1. Create a Stripe account and stay in **Test mode** first.
2. Set the keys:
   - API: `STRIPE_SECRET_KEY=sk_test_…`
   - Web: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…` (rebuild the web app)
3. Create a webhook: Stripe Dashboard → Developers → Webhooks → **Add endpoint**
   - URL: `https://shop.example.com/api/v1/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` on the API.
4. Place a test order with card `4242 4242 4242 4242`, then check the order becomes **Paid** in
   `/admin/orders`. Also try a declined card (`4000 0000 0000 0002`) and confirm the stock is
   released.
5. When everything works, switch to **live** keys and a live-mode webhook (it has its own
   signing secret), then redeploy.

Orders are only marked paid by the signature-verified webhook. The browser can't fake a payment.

---

## Email

Without `SMTP_HOST`, every email (welcome, password reset, order confirmation, shipping and
refund updates, contact replies) is only written to the API log. Any SMTP provider works:

| Provider | `SMTP_HOST` | Port | User / password |
|---|---|---|---|
| Resend | `smtp.resend.com` | 587 | `resend` / API key |
| Postmark | `smtp.postmarkapp.com` | 587 | Server API token (both fields) |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 | SMTP credentials from the SES console |
| Mailgun | `smtp.mailgun.org` | 587 | Domain SMTP login |

Verify your sending domain with the provider (SPF, DKIM, DMARC DNS records) so emails don't
land in spam, and set `EMAIL_FROM` to an address on that domain. The API log line
`email: SMTP` at startup confirms it's active. Delivery failures are logged
(`Email delivery failed`) and never block an order.

---

## Go-live checklist

**Security**
- [ ] Unique random values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REVALIDATE_SECRET` and the database password. The API refuses to start with the placeholder JWT secrets.
- [ ] `COOKIE_SECURE=true` and the site served only over HTTPS (HSTS is sent automatically in production).
- [ ] `.env.production` / platform secrets not committed; server firewall allows only 22, 80 and 443.
- [ ] Demo accounts absent, or their passwords changed (`admin@maison.test`, `ava@maison.test`).

**Business**
- [ ] Privacy policy and terms of sale reviewed by a lawyer. The included pages are templates.
- [ ] Store details updated: contact information, shipping rates and the free-shipping threshold (`packages/shared/src/constants.ts`), and tax. The demo uses a flat rate; use a tax provider for real VAT/sales tax.
- [ ] Real products, images, categories and banners entered; demo content removed.

**Integrations**
- [ ] SMTP configured; a password reset email received and the link works.
- [ ] Cloudinary configured (required on managed platforms).
- [ ] Stripe tested end to end in test mode, then switched to live keys with a live webhook.

**Operations**
- [ ] Automated daily database backups, stored off the server, with one restore tested.
- [ ] Uptime monitoring on `https://<domain>/api/v1/health` (UptimeRobot, Better Stack…).
- [ ] `https://<domain>/sitemap.xml` submitted in Google Search Console.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Caddy can't get a certificate | DNS doesn't point at the server yet, or ports 80/443 are blocked. Check `dc logs caddy`. |
| `api` won't start: "Invalid environment configuration" | A required variable is missing or too short; the log lists which. |
| `api` exits: "Refusing to start in production with placeholder JWT secrets" | Replace both JWT secrets. |
| `migrate` fails | Check `dc logs migrate`. Usually a bad `DATABASE_URL` or the database isn't reachable. |
| Admin edits take minutes to show on the shop | `REVALIDATE_SECRET` differs between API and web, or isn't set. |
| Everyone gets "Too many requests" together | `TRUST_PROXY` is too low, so all visitors look like the proxy's IP. Count the proxies in front of the API. |
| Uploaded images vanish after a deploy | Local disk on an ephemeral platform. Configure Cloudinary. |
| Customers aren't receiving emails | `SMTP_HOST` isn't set (startup log says `email: log only`), or look for `Email delivery failed` in the API log. |
| Stripe payments stay "Pending" | Webhook URL or secret is wrong. Check Stripe → Webhooks → recent deliveries. |
