# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
#  Maison API — production image
#  Build from the repository root:
#    docker build -f apps/api/Dockerfile -t maison-api .
#  Targets:
#    runtime (default)  the API server
#    build              full toolchain; used to run migrations and the seed
# ─────────────────────────────────────────────────────────────

FROM node:24-bookworm-slim AS base
# Prisma's query engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Build: install everything, compile shared + API, generate the Prisma client ──
FROM base AS build
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,target=/root/.npm \
  npm ci -w @maison/api -w @maison/shared --include-workspace-root --ignore-scripts
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @maison/shared && npm run build -w @maison/api
WORKDIR /app/apps/api
# Default command of this stage: apply pending migrations (see docker-compose.prod.yml).
CMD ["npx", "prisma", "migrate", "deploy"]

# ── Production dependencies only ──
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,target=/root/.npm \
  npm ci -w @maison/api -w @maison/shared --include-workspace-root --omit=dev --ignore-scripts

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production PORT=4000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
# Local-disk image storage (only used when Cloudinary is not configured) — mount a volume here.
RUN mkdir -p apps/api/uploads && chown -R node:node apps/api/uploads
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
