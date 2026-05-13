# Development

How to run the dashboard locally for iteration.

## Prerequisites

- **Node** ≥ 20 (LTS).
- **pnpm** — `npm i -g pnpm` (or use Corepack: `corepack enable`).
- **Docker** + **Docker Compose** — for the local Postgres.
- Optional: **Ngrok** or a local Telegram-bot polling setup if you want to test reminders against a real chat.

## First-time setup

```bash
cd ~/devel/health-dashboard

# 1. Install dependencies (once the SvelteKit project is scaffolded)
pnpm install

# 2. Start local Postgres
docker compose up -d postgres

# 3. Copy and edit env vars
cp .env.example .env.local
# Edit .env.local — see "Environment variables" below

# 4. Run migrations
pnpm db:migrate

# 5. (Optional) Seed a few rows for hand-testing
pnpm db:seed

# 6. Start the dev server
pnpm dev
# → http://localhost:5173
```

## `docker-compose.yml` (postgres only)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: health
      POSTGRES_PASSWORD: health
      POSTGRES_DB: health
      TZ: Europe/Lisbon
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Local Postgres is intentionally separate from prod; the data is throwaway.

## Environment variables

`.env.local` for development:

```dotenv
DATABASE_URL=postgres://health:health@localhost:5432/health

INGEST_TOKEN=devtoken                 # any value; you'll use it in curl

# Skip Cloudflare Access locally — hooks.server.ts checks this flag
DEV_SKIP_CF_ACCESS=1
DEV_USER_EMAIL=you@example.com        # what the app sees as "logged in" identity

TELEGRAM_BOT_TOKEN=                   # leave blank to disable; or use a real dev bot
TELEGRAM_CHAT_ID=

TZ=Europe/Lisbon
```

In production these come from Kubernetes Secrets; in dev they live in `.env.local` (which is `.gitignore`'d).

## Auth in development

- Cloudflare Access doesn't apply to localhost. The SvelteKit `hooks.server.ts` checks for `DEV_SKIP_CF_ACCESS=1` and uses `DEV_USER_EMAIL` as the logged-in identity instead of the `Cf-Access-Authenticated-User-Email` header.
- This shortcut **must** be gated on `process.env.NODE_ENV !== 'production'` *and* the env flag — never trust either alone.

## Common dev workflows

### Test the ingest endpoint by hand

```bash
curl -X POST http://localhost:5173/api/ingest \
  -H "Authorization: Bearer devtoken" \
  -H "Content-Type: application/json" \
  -d @samples/hae-minimal.json
```

Sample payloads live in `samples/`. Each covers a small slice of HAE's shape.

### Test the ingest endpoint from your phone

When you want to test the real HAE → /api/ingest flow without deploying:

1. `pnpm dev -- --host 0.0.0.0` (bind to all interfaces).
2. Find your WSL IP: `hostname -I | awk '{print $1}'`.
3. On the iPhone, set HAE's URL to `http://<that-ip>:5173/api/ingest`. Must be on the same WiFi.
4. Trigger an export.

### Build the production image locally

```bash
docker build -t health-dashboard:dev .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgres://health:health@host.docker.internal:5432/health" \
  -e INGEST_TOKEN=devtoken \
  -e DEV_SKIP_CF_ACCESS=1 \
  health-dashboard:dev
```

Confirms the production build works before shipping to the cluster.

### Reset the local database

```bash
docker compose down -v
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed   # optional
```

The `-v` flag deletes the Postgres volume — destructive but desired for "back to clean".

### Run the reminder scheduler in dev

The scheduler is part of the same Node process. To test reminders without waiting for real cron times:

- Add a `?force=<rule_id>` query parameter to `GET /api/dev/fire-reminder` (dev-only route) that runs a rule's evaluation immediately.
- Or shorten the schedule in the DB to `* * * * *` while testing.

## Useful scripts (to be added to `package.json`)

| Script              | Purpose                                                   |
|---------------------|-----------------------------------------------------------|
| `pnpm dev`          | Vite dev server, hot reload.                              |
| `pnpm build`        | Production build.                                         |
| `pnpm preview`      | Serve the production build locally.                       |
| `pnpm db:migrate`   | Apply pending migrations (tool TBD).                      |
| `pnpm db:seed`      | Insert a handful of sample rows for UI work.              |
| `pnpm db:reset`     | Drop & recreate the DB, then migrate + seed.              |
| `pnpm lint`         | ESLint + Prettier check.                                  |
| `pnpm format`       | Prettier write.                                           |
| `pnpm check`        | `svelte-check` for type errors.                           |
| `pnpm test`         | Vitest unit + integration.                                |
| `scripts/deploy.sh` | Build image + ship to cluster + roll deployment.          |

These don't exist yet — they'll be added when the SvelteKit project is scaffolded.

## IDE / editor

- **VS Code** with `Svelte for VS Code` (svelte.svelte-vscode).
- Recommended: enable format-on-save with Prettier; Tailwind IntelliSense plugin; ESLint plugin.
- Recommended workspace settings live in `.vscode/settings.json` (to be added).

## Working with the design system

- All UI work consults `design-system/MASTER.md` first. The CSS custom properties are the only source of color/spacing/radius — components don't hardcode.
- If you find yourself wanting a value that isn't in the system, **add it to the MASTER file first**, then reference it from the component. Don't reach for inline hex.
- Page-specific overrides go in `design-system/pages/<page>.md` — keep them short (deltas only).

## Test data

- `samples/` — HAE payloads, hand-crafted for fast manual testing.
- `seed.sql` — small fixture data so the home screen has something to render in dev.

## Common pitfalls

- **Forgot to run migrations after pulling.** Symptom: enum / table errors at startup. Fix: `pnpm db:migrate`.
- **iOS auto-zoom on focus.** Cause: input font-size < 16px. Fix: bump to `--text-md` (17px) and check `design-system/MASTER.md` §3.3.
- **Times look "an hour off".** Cause: writing local time when storing or reading. Always store UTC; convert to `Europe/Lisbon` at query time.
- **HAE re-pushes a window and the chart shows duplicates.** Cause: missing unique constraint. Every metric table must have one — see `DATA_MODEL.md`.
