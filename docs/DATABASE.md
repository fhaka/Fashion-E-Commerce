# Maison — Database guide

PostgreSQL 16 with Prisma 6. The schema lives in `apps/api/prisma/schema.prisma`, and the
migration history (SQL files, committed to git) lives in `apps/api/prisma/migrations/`.

---

## Development database

```bash
npm run db:up      # start PostgreSQL in Docker (host port 5434, data kept in a named volume)
npm run db:down    # stop it (data is kept)
```

Connection string (already in `apps/api/.env.example`):

```
postgresql://maison:maison@localhost:5434/maison?schema=public
```

To use your own PostgreSQL instead, create a database and point `DATABASE_URL` at it.

---

## Migrations

### Changing the schema (development)

1. Edit `apps/api/prisma/schema.prisma`.
2. Generate and apply a migration:
   ```bash
   npm run db:migrate
   ```
   Prisma asks for a name (e.g. `add_gift_message_to_order`), writes
   `prisma/migrations/<timestamp>_<name>/migration.sql`, applies it and regenerates the client.
3. Review the generated SQL, then commit it together with the schema change.

Tips:
- Adding a required column to a table that already has rows needs a default value, or a
  two-step migration (add it nullable, backfill, then make it required).
- Renaming a field generates a drop plus an add. Edit the SQL to `ALTER TABLE … RENAME COLUMN`
  so you don't lose data.

### Applying migrations (CI, staging, production)

```bash
npm run db:deploy        # = prisma migrate deploy
```

`migrate deploy` only applies committed migrations that haven't run yet. It never generates
SQL, resets anything or prompts, so it's safe to run on every deploy. The Docker production
stack runs it automatically through the one-off `migrate` service before the API starts.

**Never run `prisma migrate dev` or `db:reset` against production.** Both can drop data.

### Resetting a development database

```bash
npm run db:reset         # drops everything, re-applies all migrations, then runs the seed
```

Development only.

---

## Seed data

```bash
npm run db:seed
```

The seed (`apps/api/prisma/seed/`) **deletes all data first**, then loads a complete demo shop:
- products with variants, stock and images
- categories, collections, banners and coupons
- 41 customers, an admin and 220 orders spread over the past year (so dashboards have history)
- reviews and newsletter subscribers

It prints the demo logins (`admin@maison.test` / `Admin12345!` or `SEED_ADMIN_PASSWORD`, and
`ava@maison.test` / `Customer123!`).

Safety: with `NODE_ENV=production` it refuses to run on a database that already has orders,
unless `SEED_ALLOW_RESET=true` is set.

### Launching without demo data

For a real shop, skip the seed. Apply the migrations and create your admin account:

```bash
ADMIN_EMAIL=you@yourshop.com ADMIN_PASSWORD='a-strong-password-1' npm run admin:create
```

This creates the user, or promotes an existing one to admin with the new password. Then add
categories, sizes, colours and products from `/admin`.

---

## Tests

`npm test` uses a separate database named after yours with a `_test` suffix (`maison_test`), or
`TEST_DATABASE_URL` if you set it. Before each run it applies migrations and re-seeds that
database, and it refuses to run against any database whose name doesn't end in `_test`.

---

## Backups and restore

**Docker production stack:**

```bash
# Backup (compressed custom format)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > maison-$(date +%F).dump

# Restore into the running database (replaces existing objects)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < maison-2026-10-05.dump
```

Run the backup from cron daily, copy the files off the server (S3, Backblaze, etc.) and test a
restore regularly. Managed databases (Neon, Supabase, RDS) include automated backups and
point-in-time recovery; switch them on.

Uploaded images: if you aren't using Cloudinary, also back up the `uploads` Docker volume.

---

## Useful commands

| Command | Purpose |
|---|---|
| `npm run db:studio -w @maison/api` | Prisma Studio: browse and edit data in the browser |
| `npx prisma migrate status` (in `apps/api`) | Which migrations are applied or pending |
| `npx prisma validate` (in `apps/api`) | Check `schema.prisma` |
| `npx prisma generate` (in `apps/api`) | Regenerate the client (also runs during `npm run build`) |
