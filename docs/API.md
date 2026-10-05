# Maison — REST API reference

Base URL: `/api/v1`. In the browser, call it on the storefront's own origin (Next.js proxies
`/api/v1/*` to Express). Server-to-server callers can use the API origin directly.

All request validation rules live in [`packages/shared/src/schemas.ts`](../packages/shared/src/schemas.ts),
the single source of truth used by both the API and the web forms.

---

## Conventions

**Success**

```json
{ "data": { … } }
{ "data": [ … ], "meta": { "total": 37, "page": 1, "limit": 24, "pages": 2 } }
```

**Errors**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Please check the highlighted fields",
             "details": { "fields": { "email": "Enter a valid email address" } } } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON, business rule violated (e.g. empty bag) |
| 401 | `UNAUTHORIZED` / `TOKEN_EXPIRED` | Missing or invalid access token, or it has expired (refresh and retry) |
| 403 | `FORBIDDEN` | Signed in but not allowed (e.g. not an admin) |
| 404 | `NOT_FOUND` | Unknown route or record |
| 409 | `CONFLICT` | Duplicate (email, slug, SKU, code) or the record is in use |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 1 MB |
| 422 | `VALIDATION_ERROR` | Input failed validation; `details.fields` maps field → message |
| 429 | `RATE_LIMITED` | Too many requests (see `RateLimit-*` headers) |
| 500 | `INTERNAL_ERROR` / `DATABASE_ERROR` | Unexpected; logged server-side |

**Money** is always integer **cents** (`39000` = $390.00). **IDs** are cuids. Dates are ISO 8601.
Pagination uses `?page=` (1-based) and `?limit=`; maximums are listed per endpoint.

---

## Authentication

| Credential | Where | Lifetime |
|---|---|---|
| Access token (JWT) | `Authorization: Bearer <token>` header; keep it in memory, not localStorage | 15 min (`JWT_ACCESS_TTL`) |
| Refresh token | `maison_rt` cookie, `httpOnly`, path `/api/v1/auth` | 30 days, rotated on every refresh |
| Session hint | `maison_session` cookie (readable by JS, holds no secret) | Same as the refresh token |
| Guest cart | `maison_cart` cookie, `httpOnly` | 30 days |

Flow: `POST /auth/login` returns `{ user, accessToken }` and sets the cookies. When a request
returns `401 TOKEN_EXPIRED`, call `POST /auth/refresh` once (the cookie is sent automatically)
and retry. Reusing an old refresh token revokes all of that user's sessions.

Legend: 🔓 public · 👤 signed-in customer · 🔐 admin · ⏱ rate-limited

---

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` (outside `/api/v1`) | Process liveness (used by Docker health checks) |
| GET | `/api/v1/health` | Liveness plus a database check |

## Auth: `/auth`

| Method | Path | | Body / notes |
|---|---|---|---|
| POST | `/auth/register` | 🔓⏱ | `{ email, password, firstName, lastName, newsletter? }` → `{ user, accessToken }` |
| POST | `/auth/login` | 🔓⏱ | `{ email, password }` → `{ user, accessToken }` |
| POST | `/auth/refresh` | 🔓 | Uses the refresh cookie → `{ user, accessToken }` |
| POST | `/auth/logout` | 🔓 | Revokes the refresh token and clears the cookies |
| GET | `/auth/me` | 👤 | Current user |
| POST | `/auth/forgot-password` | 🔓⏱ | `{ email }`; always returns 200, so it can't be used to discover accounts |
| POST | `/auth/reset-password` | 🔓⏱ | `{ token, password }` |
| POST | `/auth/change-password` | 👤⏱ | `{ currentPassword, newPassword }`; signs out other sessions |

Passwords need 8–128 characters with at least one letter and one number. Login, register and
reset allow 20 failed attempts per 15 minutes per IP.

## Catalogue

| Method | Path | | Notes |
|---|---|---|---|
| GET | `/products` | 🔓 | Listing with filters (below); `meta.facets` gives counts for the filter UI |
| POST | `/products/batch` | 🔓 | `{ ids: string[] }` (max 24); cards for the wishlist and recently viewed |
| GET | `/products/:slug` | 🔓 | Full product: images, colours, sizes, variants with `available` stock, breadcrumbs |
| GET | `/products/:slug/related` | 🔓 | Up to 8 related products |
| GET | `/products/:slug/reviews` | 🔓 | `?sort=newest\|highest\|lowest&rating=1-5&page&limit≤50` |
| GET | `/products/:slug/reviews/eligibility` | 👤 | Whether the user can review (and whether it's a verified purchase) |
| POST | `/products/:slug/reviews` | 👤⏱ | `{ rating 1-5, title, body, fit? }`; held as PENDING until moderated |
| GET | `/categories` | 🔓 | Category tree |
| GET | `/categories/:slug` | 🔓 | Category with children and breadcrumbs |
| GET | `/collections`, `/collections/:slug` | 🔓 | Active collections |
| GET | `/sizes`, `/colors` | 🔓 | Attribute lists |
| GET | `/banners?placement=` | 🔓 | Active, scheduled banners (`HERO`, `PROMO`, `EDITORIAL`, `STORY`) |
| GET | `/search/suggest?q=` | 🔓 | Instant search: products, categories, collections |

**`GET /products` query**

| Param | Example | Notes |
|---|---|---|
| `q` | `cashmere wool` | Every word must match the name, description, category or colour |
| `category` | `women-coats` | Includes subcategories |
| `collection` | `autumn-winter-26` | |
| `gender` | `WOMEN` | `WOMEN`, `MEN`, `UNISEX` |
| `size`, `color` | `S,M` or repeated | Slugs |
| `minPrice`, `maxPrice` | `20000` | Cents |
| `inStock`, `onSale`, `featured`, `bestSeller`, `isNew` | `true` | |
| `sort` | `newest` | `newest`, `price_asc`, `price_desc`, `bestselling`, `rating` |
| `page`, `limit` | `1`, `24` | `limit` ≤ 60 |

## Cart: `/cart` (guest or signed-in)

| Method | Path | Notes |
|---|---|---|
| GET | `/cart` | Lines with live `available` stock and an `issue` flag (unavailable, sold out or too few left), plus the subtotal |
| POST | `/cart/items` | `{ variantId, quantity 1-20 }`; creates the guest cart cookie if needed |
| PATCH | `/cart/items/:id` | `{ quantity 0-20 }`; 0 removes the line |
| DELETE | `/cart/items/:id` | Remove a line |
| DELETE | `/cart` | Empty the bag |
| POST | `/cart/merge` 👤 | Merge the guest cart into the account (login and register already do this automatically) |

## Wishlist: `/wishlist` 👤

| Method | Path | Notes |
|---|---|---|
| GET | `/wishlist` | Product cards |
| GET | `/wishlist/ids` | Product IDs only (for heart icons) |
| POST / DELETE | `/wishlist/:productId` | Add / remove |

## Checkout: `/checkout`

| Method | Path | | Notes |
|---|---|---|---|
| GET | `/checkout/config` | 🔓 | Payment provider (`mock` or `stripe`), shipping methods, free-shipping threshold |
| POST | `/checkout/quote` | 🔓 | `{ shippingMethod, couponCode?, items? }` → subtotal, discount, shipping, tax, total (re-priced server-side) |
| POST | `/checkout/coupon/validate` | 🔓⏱ | `{ code, subtotal, email? }` |
| POST | `/checkout` | 🔓⏱ | Places the order (below); reserves stock, returns `{ orderNumber, total, payment: { provider, clientSecret } }` |
| POST | `/checkout/:orderNumber/confirm-mock` | 🔓 | Demo mode only: `{ clientSecret, outcome: "success" \| "decline" }` |
| POST | `/checkout/:orderNumber/abandon` | 🔓 | `{ clientSecret }`; releases the stock when the shopper goes back |
| GET | `/checkout/:orderNumber/confirmation` | 🔓 | Order summary for the success page |
| POST | `/webhooks/stripe` | Stripe | Raw body, signature-verified; handles `payment_intent.succeeded` and `payment_intent.payment_failed` |

**`POST /checkout` body**

```json
{
  "email": "ava@example.com",
  "shippingAddress": { "fullName": "Ava Laurent", "line1": "12 Rue Saint-Honoré", "city": "Paris",
                       "postalCode": "75001", "country": "FR", "phone": "+33 1 23 45 67 89" },
  "billingSameAsShipping": true,
  "shippingMethod": "standard",
  "couponCode": "WELCOME10",
  "items": [{ "variantId": "cm…", "quantity": 1 }],
  "saveAddress": false,
  "notes": "Gift wrap please"
}
```

`items` is optional: without it, the current bag is checked out ("Buy now" sends `items`).
Stock is held for `ORDER_RESERVATION_MINUTES` and released if payment doesn't complete.

## Account: `/account` 👤

| Method | Path | Notes |
|---|---|---|
| GET / PATCH | `/account/profile` | `{ firstName, lastName, phone? }` |
| GET / POST | `/account/addresses` | Address book |
| PUT / DELETE | `/account/addresses/:id` | |
| GET | `/account/orders` | Paginated (`limit` ≤ 100) |
| GET | `/account/orders/:orderNumber` | Detail with status timeline |

## Other public endpoints

| Method | Path | | Notes |
|---|---|---|---|
| GET | `/orders/track?orderNumber=&email=` | 🔓⏱ | Guest order tracking (both values must match) |
| POST | `/newsletter/subscribe` | 🔓⏱ | `{ email, source? }` |
| POST | `/newsletter/unsubscribe` | 🔓 | `{ email, token }` from the unsubscribe link |
| POST | `/contact` | 🔓⏱ | `{ name, email, subject?, message }` |

Forms (track, newsletter, contact, reviews) allow 10 requests per hour per IP.

---

## Admin: `/admin` 🔐

Every admin route requires an access token for an active user with role `ADMIN`, re-checked
in the database on each request. Write requests also tell the storefront to refresh the
affected cached pages.

| Area | Endpoints |
|---|---|
| Dashboard | `GET /admin/stats/overview?range=7\|30\|90\|365` |
| Reports | `GET /admin/reports/sales?from&to&groupBy=day\|week\|month&format=json\|csv` (max 3 years) |
| Products | `GET /admin/products?q&status&categoryId&featured&lowStock&sort&page&limit` · `POST /admin/products` · `GET/PUT/DELETE /admin/products/:id` · `POST /admin/products/:id/duplicate` · `PATCH /admin/products/bulk` `{ ids, status?, isFeatured?, isBestSeller?, isNew? }` |
| Uploads | `POST /admin/uploads` (multipart `files`, up to 10 images, 8 MB each, JPEG/PNG/WebP/AVIF, file signatures checked) · `DELETE /admin/uploads` `{ publicId }` |
| Inventory | `GET /admin/inventory?q&filter=all\|low\|out` · `GET /admin/inventory/low-stock` · `PATCH /admin/inventory/:variantId` `{ quantity? or delta?, lowStockThreshold?, note? }` · `GET /admin/inventory/:variantId/movements` |
| Categories | `GET/POST /admin/categories` · `PUT/DELETE /admin/categories/:id` |
| Collections | `GET/POST /admin/collections` · `GET/PUT/DELETE /admin/collections/:id` · `PUT /admin/collections/:id/products` `{ productIds }` |
| Sizes and colours | `GET/POST /admin/sizes`, `/admin/colors` · `PUT/DELETE …/:id` (delete blocked while variants use them) |
| Coupons | `GET/POST /admin/coupons` · `PUT/DELETE /admin/coupons/:id` |
| Banners | `GET /admin/banners?placement` · `POST` · `PUT /admin/banners/reorder` `{ ids }` · `PUT/DELETE /admin/banners/:id` |
| Orders | `GET /admin/orders?q&status&from&to` · `GET /admin/orders/:id` · `PATCH /admin/orders/:id/status` `{ status, note?, restock? }` · `PATCH /admin/orders/:id` `{ trackingNumber?, carrier?, note? }` · `POST /admin/orders/:id/refund` `{ restock, note? }` |
| Customers | `GET /admin/customers?q&role` · `GET /admin/customers/:id` · `PATCH /admin/customers/:id` `{ isActive?, role? }` |
| Reviews | `GET /admin/reviews?q&status&rating` · `PATCH /admin/reviews/:id` `{ status }` · `DELETE /admin/reviews/:id` |
| Newsletter | `GET /admin/newsletter?q&status&format=json\|csv` |
| Messages | `GET /admin/messages` · `PATCH /admin/messages/:id` `{ isRead }` |

Request bodies for create/update are the `admin*Schema` definitions in
`packages/shared/src/schemas.ts` (e.g. `adminProductSchema` with nested variants and images).

---

## Example: sign in and read your orders

```bash
# 1. Sign in (stores the refresh cookie in cookies.txt)
curl -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"ava@maison.test","password":"Customer123!"}' \
  http://localhost:3000/api/v1/auth/login

# 2. Use the accessToken from the response
curl -H "authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/api/v1/account/orders

# 3. When it expires, get a new one
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/v1/auth/refresh
```
