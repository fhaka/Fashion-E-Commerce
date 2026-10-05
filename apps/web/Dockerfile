# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
#  Maison Web (Next.js storefront + admin) — production image
#  Build from the repository root:
#    docker build -f apps/web/Dockerfile \
#      --build-arg API_ORIGIN=http://api:4000 \
#      --build-arg NEXT_PUBLIC_SITE_URL=https://shop.example.com \
#      -t maison-web .
#
#  API_ORIGIN and NEXT_PUBLIC_* are baked in at build time (the /api/v1 proxy and
#  public client config), so rebuild the image when they change.
#  If the API is not reachable during the build, data-backed pages are rendered on
#  demand instead of prerendered (see src/lib/buildGuard.ts).
# ─────────────────────────────────────────────────────────────

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Build ──
FROM base AS build
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm \
  npm ci -w @maison/web -w @maison/shared --include-workspace-root --ignore-scripts
COPY packages/shared packages/shared
COPY apps/web apps/web

ARG API_ORIGIN=http://api:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ARG NEXT_PUBLIC_STORE_CURRENCY=USD
ARG NEXT_PUBLIC_STORE_LOCALE=en-US
ENV API_ORIGIN=$API_ORIGIN \
  NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
  NEXT_PUBLIC_STORE_CURRENCY=$NEXT_PUBLIC_STORE_CURRENCY \
  NEXT_PUBLIC_STORE_LOCALE=$NEXT_PUBLIC_STORE_LOCALE
RUN npm run build -w @maison/shared && npm run build -w @maison/web

# ── Runtime: Next.js standalone server ──
FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
# Writable page/data cache. A named volume mounted here inherits this ownership on first use.
RUN mkdir -p apps/web/.next/cache && chown -R node:node apps/web/.next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
