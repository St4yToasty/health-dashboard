# Implementation plan

12 sequenced phases from empty repo to live, daily-used dashboard. Each phase ends with a verifiable exit criterion. Decision moments for previously-deferred choices are called out where they happen.

**Effort scale:** estimates are in **evenings**, where 1 evening ≈ 2–3 focused hours. Total target: **25–35 evenings** (roughly 1–2 months of evening hacking).

**Critical path:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 8 → 10 → 11. Phases 7 and 9 can be slotted in flexibly around the critical path.

```
0 ─► 1 ─► 2 ─┐
     │       │
     ▼       ▼
     3 ───► 4 ───► 5 ───► 6 ───► 8 ───► 10 ─► 11 ─► 12
                                   │      ▲
                                   ▼      │
                                   7 ─────┤
                                   │      │
                                   ▼      │
                                   9 ─────┘
```

---

## Phase 0 — Foundations (scaffolding)

**Goal:** Empty SvelteKit app boots, design tokens are wired, dev tooling works, `/api/health` returns 200.

**Effort:** 1–2 evenings.

**Tasks:**

- `pnpm create svelte@latest .` — TypeScript, ESLint, Prettier, Vitest, Playwright (skip Playwright for now if it complicates).
- Set up **Tailwind v4** with the `@tailwindcss/vite` plugin.
- Translate the color/spacing/radius/motion/typography tokens from `design-system/MASTER.md` into `src/app.css`:
  - `:root { --bg-canvas: …; … }` for dark.
  - `[data-theme="light"] { … }` for light.
  - `@theme` block in Tailwind v4 mapping tokens to utilities (`bg-canvas`, `text-default`, etc.).
- Self-host **Inter Variable** via `@fontsource-variable/inter`.
- Build the root layout `src/routes/+layout.svelte`: HTML scaffold, font loading, theme initialization script (reads `localStorage`, defaults to system), `viewport-fit=cover`.
- Add `/api/health/+server.ts` returning `{ ok: true, ts }`.
- Add a basic `Dockerfile` (multi-stage: pnpm install → build → node:20-alpine runtime, expose 3000).
- Add `docker-compose.yml` for local Postgres (see `docs/DEVELOPMENT.md`).
- Add `.env.example`.
- Configure `tsconfig.json` strict mode, `svelte-check`, ESLint flat config, Prettier.
- Add a `scripts/` folder placeholder for `deploy.sh`, `migrate.js`, `seed.js`.

**Decision moments:** none — all locked in.

**Exit criteria:**

- `pnpm dev` boots, root page renders with the correct background color in both themes.
- Toggling `data-theme="light"` on `<html>` flips the whole page.
- `curl localhost:5173/api/health` returns `200 {"ok":true,"ts":"..."}`.
- `docker build .` produces a working image.

---

## Phase 1 — Database layer

**Goal:** Full v1 schema applied to local Postgres; seed data populates a realistic-looking DB.

**Effort:** 2–3 evenings.

**Tasks:**

- **Decision: pick ORM/query builder.** Realistic candidates:
  - **Drizzle** — schema in TypeScript, generates migrations, good runtime queries, strong types. Best DX for SvelteKit.
  - **Kysely** — pure query builder, no schema-as-code; you keep the migrations in raw SQL. Lighter, more SQL-honest.
  - **node-postgres + raw SQL** — most explicit, most code.
- **Decision: pick migration tool** — usually tied to ORM (`drizzle-kit` if Drizzle), otherwise `dbmate` or `node-pg-migrate`.
- Write the 14 migration files from `docs/DATA_MODEL.md` in numbered order. Even if the ORM owns its own migration format, keep a `migrations/sql/` directory of human-readable SQL for reference.
- Write the connection module `src/lib/server/db/index.ts` reading `DATABASE_URL`, exporting a singleton client.
- Write a seed script (`scripts/seed.ts`) that inserts:
  - A handful of foods (oatmeal, chicken breast, eggs, banana, etc.).
  - A week of body composition rows (slight downward trend).
  - A week of daily activity, sleep, meals, water.
  - Active goal rows: daily_calories=1800, daily_water_ml=2500, daily_steps=8000, target_weight_kg=78 by `today + 90 days`.
- Wire `pnpm db:migrate`, `db:seed`, `db:reset` scripts in `package.json`.

**Exit criteria:**

- `pnpm db:reset && pnpm db:migrate && pnpm db:seed` runs cleanly.
- `psql` shows all tables, indexes, the `goals_active` view, and the seed rows.
- Re-running `pnpm db:seed` doesn't error (idempotent or uses `truncate` first).

---

## Phase 2 — Ingest pipeline

**Goal:** HAE payloads can be POSTed to `/api/ingest` and produce correctly-shaped rows in every metric table, idempotently.

**Effort:** 2–3 evenings.

**Tasks:**

- Implement `/api/ingest/+server.ts`:
  - Constant-time bearer check against `INGEST_TOKEN`.
  - Streaming JSON parse (`stream-json` or similar) so backfill payloads don't blow memory.
  - Write the raw payload to `ingest_events` *first*, then parse.
- Build `src/lib/server/ingest/`:
  - `types.ts` — TypeScript types matching the HAE JSON shape.
  - `mappers/` — one file per HAE metric category (`weight.ts`, `water.ts`, `activity.ts`, `workouts.ts`, `sleep.ts`) doing the HAE → our-table mapping.
  - `upsert.ts` — generic idempotent upsert helpers using each table's unique constraint.
- Create `samples/` directory with hand-crafted JSONs:
  - `hae-minimal.json` (one weight, one water, one steps row).
  - `hae-workout.json`.
  - `hae-sleep.json`.
  - `hae-full-day.json` (everything).
  - `hae-duplicate.json` (same data as hae-minimal, for idempotency tests).
- Write Vitest integration tests against a test database:
  - Each sample inserts the expected rows.
  - Replaying the same sample doesn't duplicate.
  - Wrong bearer → 401.
  - Malformed JSON → 400.

**Exit criteria:**

- `curl -X POST localhost:5173/api/ingest -H "Authorization: Bearer devtoken" -d @samples/hae-full-day.json` returns 200 and rows appear.
- Replaying it leaves row counts unchanged.
- All ingest tests pass.

---

## Phase 3 — Design system component library

**Goal:** Every component in `design-system/MASTER.md` §7 is implemented as a real Svelte 5 component and visually QA'd against the spec.

**Effort:** 4–5 evenings.

**Tasks:**

- **Decision: chart library.** Compare in context:
  - **layerchart** — Svelte-native, shadcn-style API, Tremor-inspired. Closest to the MASTER.md aesthetic.
  - **ECharts via `svelte-echarts`** — most powerful, needs theming work.
  - **Chart.js via wrapper** — easiest, most generic-looking output.
  - **Apache ECharts raw + Svelte action** — flexibility, more wiring.
  - Build a small spike on each (one weight line chart + one sparkline) before committing.
- **Decision: component kit** — `shadcn-svelte` for primitives (Dialog, DropdownMenu, etc.), or build from scratch. Recommend shadcn-svelte for the non-trivial primitives; build the rest from scratch.
- Implement components per MASTER.md §7, each in `src/lib/components/`:
  - `Button.svelte` (all variants per §7.1 table)
  - `Card.svelte`
  - `MetricCard.svelte` (§7.3 — the headline component)
  - `Input.svelte` (text/number, with unit adornment slot)
  - `ProgressBar.svelte`
  - `Sparkline.svelte` (uses chosen chart lib)
  - `FAB.svelte`
  - `TabBar.svelte`
  - `SegmentedControl.svelte`
  - `Sheet.svelte` (mobile slide-up + desktop centered modal)
  - `ListRow.svelte` (with swipe-left destructive action on mobile)
  - `EmptyState.svelte`
  - `Toast.svelte` (with provider/store)
  - `Badge.svelte`
- Build `/dev/components/+page.svelte` — a showcase route rendering every component variant for side-by-side QA. **Not** linked from production navigation; gated on dev or behind a query flag in prod.
- Run the §12 accessibility checklist over each component.

**Exit criteria:**

- Every component renders in both themes with no hardcoded hex anywhere.
- `/dev/components` shows every variant.
- Focus rings visible on all interactive elements; `prefers-reduced-motion` respected.
- Lighthouse on `/dev/components` scores ≥ 95 accessibility.

---

## Phase 4 — Home screen (bento layout)

**Goal:** The home route at `/` renders the bento grid against real seeded data.

**Effort:** 2–3 evenings.

**Tasks:**

- Build `src/routes/+page.server.ts` load function that queries today's data in parallel:
  - Today's nutrition totals (from `daily_nutrition` view).
  - Latest body composition row.
  - Today's `daily_activity` row.
  - Last 7 days of weight, steps for sparklines.
  - Active goals.
  - Today's water sum.
  - Most recent sleep session.
- Build `src/routes/+page.svelte`:
  - Sticky header (greeting based on local time, bell icon, settings icon).
  - Bento grid per MASTER.md §9 (mobile 2-col / tablet 3 / desktop 4).
  - MetricCard instances bound to load data.
  - Quick-log scroll-snap row with water buttons + meal CTA.
  - FAB → opens placeholder Sheet (real content in Phase 5).
- Build `src/lib/components/AppShell.svelte` providing the persistent tab bar + FAB across routes.
- Implement `+250 ml` and `+500 ml` form actions (the smallest end-to-end manual entry — proves the wiring before Phase 5).

**Exit criteria:**

- Visiting `/` shows real KPI values from the seeded DB.
- Tapping `+250 ml` increments the water tile after a server round-trip.
- Layout reflows correctly at 375 / 768 / 1024 / 1440 widths.
- Tab bar persists across route changes; current route is highlighted.

---

## Phase 5 — Manual entry flows

**Goal:** Every metric the user logs manually has a Sheet-based entry flow accessible from the FAB or its tile.

**Effort:** 3–4 evenings.

**Tasks:**

- **Quick Log sheet** (FAB → opens a 4-option menu: Water / Weight / Meal / Measurement).
- **Water entry** — number input with quick-select chips (100/250/330/500/750), submit.
- **Weight entry** — single number, optional body fat % + muscle mass fields under a "More" disclosure.
- **Body measurement entry** — list of measurement types with optional number inputs each.
- **Meal entry** — multi-step within the same sheet:
  1. Pick meal kind (breakfast/lunch/dinner/snack) + time (default now).
  2. Search the food library or "Add new food".
  3. Pick grams (default to food's canonical serving), recompute kcal/protein.
  4. Add more items or save.
- **Food library CRUD** at `/foods`:
  - List view: search, sort by recent / by frequency-used.
  - Add new food: name, brand, serving grams, kcal per serving, protein per serving.
  - Edit existing (changes don't propagate to historical `meal_items` — those are snapshots).
  - Archive (soft-hide from search).
- Server actions for every form (`/api/manual/*` and SvelteKit `+page.server.ts` actions).
- Server-side validation with Zod.
- Optimistic UI for water/weight (insert client-side, reconcile on response).
- Drag-to-dismiss on mobile Sheets; confirm dialog if unsaved.

**Exit criteria:**

- Log a complete meal end-to-end on the phone via dev server.
- Water tile updates immediately on `+250` tap, even before server responds.
- Food library has at least 10 user-added foods after a session of real use.
- Failure paths show clear error messages near the offending field.

---

## Phase 6 — Trends & detail pages

**Goal:** Every metric has a detail page with the full history chart and D/W/M/Y range switching.

**Effort:** 3–4 evenings.

**Tasks:**

- `/trends` index — a list of all tracked metrics with their current value + tiny sparkline + delta.
- `/metrics/[slug]` per-metric detail:
  - Page title + current value (big).
  - SegmentedControl: D / W / M / Y / All.
  - Main chart (line / area / bar depending on metric).
  - Goal line overlay where applicable.
  - Summary card: average / min / max / count for the visible range.
  - Recent entries list (last 10 in the range).
- Server load function with range-aware queries (different `date_trunc` granularity per range).
- Use Postgres window functions for "rolling 7-day average" overlays on weight.
- Loading states (skeleton per chart).
- Empty states for ranges with no data.
- Chart accessibility: visually-hidden data table per chart (§8.9).

**Exit criteria:**

- Open `/metrics/weight`, switch ranges, scrub the chart.
- Open `/metrics/calories`, see the goal line, see the green/red fill above/below.
- Sleep page shows stage breakdown stacked bar.
- All charts render correctly in both themes.

---

## Phase 7 — Auth shim & settings

**Goal:** Production auth via Cloudflare Access is wired (with dev shortcut); Settings page exists for theme, goals, food library, and reminder rules.

**Effort:** 1–2 evenings.

**Tasks:**

- `src/hooks.server.ts`:
  - In prod (`NODE_ENV=production` AND `DEV_SKIP_CF_ACCESS` unset): read `Cf-Access-Authenticated-User-Email` from request headers; if missing or empty, return 403.
  - In dev: use `DEV_USER_EMAIL` env var.
  - Expose the email on `locals.user.email` for downstream loaders.
- `/api/ingest` and `/api/health` exempted from the email check (they're bypassed at the CF edge anyway, but harden in-app too).
- `/settings` route with:
  - **Appearance** — theme override (Auto/Light/Dark), persisted to `localStorage` and rendered on first paint.
  - **Goals** — list of current goals with effective dates; edit creates a new row with `effective_to = today` on the old one.
  - **Foods** — link to `/foods` (built in Phase 5).
  - **Reminders** — stub UI (full editor in Phase 8).
  - **Account** — shows the CF Access email, a sign-out link (clears CF Access cookies).
  - **About** — app version, build SHA, link to repo.

**Exit criteria:**

- In dev with `DEV_SKIP_CF_ACCESS=1`, `/` renders normally.
- Without the flag set, every UI route returns 403.
- Editing a goal creates a new row and the old one shows `effective_to`.
- Theme override persists across reloads.

---

## Phase 8 — Reminders & Telegram bot

**Goal:** Telegram bot sends the seed reminders on schedule; the user can edit rules from Settings.

**Effort:** 2–3 evenings.

**Tasks:**

- `src/lib/server/telegram.ts` — minimal client (just `sendMessage`).
- `src/lib/server/reminders/scheduler.ts` — `setInterval(tick, 60_000)` starting from `hooks.server.ts`.
  - `tick()` fetches active rules, evaluates schedule against current minute (use `cron-parser`).
  - For each due rule: run its condition evaluator; if it fires, send message + write to `reminder_fires`.
  - Skip already-fired-today-for-this-rule based on `reminder_fires` lookup.
- `src/lib/server/reminders/conditions/`:
  - `no-metric-since.ts`
  - `no-metric-today-by.ts`
  - `goal-progress-above.ts`
  - `goal-progress-below.ts`
  - `streak-milestone.ts`
  - `summary.ts`
- Seed insert for the 5 starter rules (in `seed.ts` or as part of migrations).
- Quiet hours (22:00–08:00 default), daily cap (6 messages), `reminder_snooze_until` table column + Settings toggle.
- `/settings/reminders` UI:
  - List rules with toggle (active/inactive), schedule, last-fired time.
  - Edit form per rule (name, schedule cron, params).
  - "Send test message" button per rule.

**Exit criteria:**

- `/settings/reminders` lists 5 rules.
- "Send test" triggers a real Telegram push to the dev bot chat.
- A rule with cron `* * * * *` fires once per minute (test, then disable).
- Quiet-hours suppression visible in `reminder_fires.delivery_status`.

---

## Phase 9 — PWA polish

**Goal:** Adding to Home Screen on iOS Safari produces an app-feel install with the right icon, splash, and status bar.

**Effort:** 1–2 evenings.

**Tasks:**

- Generate icons (192, 512, maskable, Apple touch). Use a flat indigo glyph on `--bg-canvas` background.
- `static/manifest.webmanifest`:
  - `display: standalone`, `theme_color: #0A0A0B`, `background_color: #0A0A0B`, `start_url: /`.
  - All icon sizes.
- `<meta>` tags in `+layout.svelte`:
  - `apple-mobile-web-app-capable=yes`
  - `apple-mobile-web-app-status-bar-style=black-translucent`
  - `apple-mobile-web-app-title=Health`
- Minimal service worker (`src/service-worker.ts`):
  - Cache the app shell (HTML + critical CSS + Inter woff2) on install.
  - Network-first for `/api/*`, cache-first for static assets.
  - No write queuing (v1 is online-only).
- Splash screens for iOS (use `pwa-asset-generator` or hand-roll).
- Test the install flow on the real phone.

**Exit criteria:**

- "Add to Home Screen" produces an icon with no URL bar in the app shell.
- Status bar overlays the page background cleanly (no white strip).
- Cold-start time on iPhone < 2s on WiFi.
- Lighthouse PWA audit passes all checks.

---

## Phase 10 — Production deployment

**Goal:** The dashboard is reachable at the production hostname via Cloudflare Tunnel + Access; HAE on the real phone can post to `/api/ingest`.

**Effort:** 2–3 evenings.

**Tasks:**

- **Decision: production hostname.** Pick a subdomain on a Cloudflare-managed zone (e.g. `health.<your-domain>`).
- Polish `Dockerfile` (multi-stage, build-time tsc, runtime user, no dev deps in final image).
- Write `scripts/deploy.sh` that runs the build → save → scp → import → kubectl-apply chain from `docs/DEPLOY.md`.
- Create `kubernetes-deployments/health-dashboard/deployment.yaml` in the sibling repo (per `docs/DEPLOY.md` skeleton).
- Cloudflare dashboard:
  - Add public hostname to the existing tunnel → routes to `health-dashboard.health-dashboard-ns:3000`.
  - Create Access Application for the hostname with email allowlist.
  - Create the second Access Application with `Path = /api/ingest` and Bypass action; ensure it sits above the main app in precedence.
- Create Telegram bot via @BotFather, obtain token + chat ID.
- Create k8s Secrets per `docs/DEPLOY.md`.
- Run migrations on the production DB (via `kubectl exec` job or one-shot pod).
- First deploy with `scripts/deploy.sh`.
- Smoke tests:
  - UI loads after Access login.
  - `/api/health` returns 200 (use the Access bypass).
  - `/api/ingest` with the real bearer returns 200 on a tiny payload.
- Configure HAE on the phone with the production URL + token; trigger first export.

**Exit criteria:**

- Production hostname loads the dashboard after CF Access login.
- HAE auto-export runs, rows land in production Postgres.
- Telegram bot sends a "deploy successful" test message.

---

## Phase 11 — Historical backfill

**Goal:** Years of Apple Health data are imported and visible in trends.

**Effort:** 1 evening.

**Tasks:**

- In HAE on the phone: **Export → Range: All time → Format: JSON → Send**.
- Either trigger one big POST via the Automation, or transfer the file to the laptop and POST it via curl in chunks if HAE's POST size is limiting:
  ```bash
  curl -X POST https://<host>/api/ingest \
    -H "Authorization: Bearer $INGEST_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @apple-health-all.json
  ```
- Verify row counts in each table (`select source, count(*) from <table> group by source`).
- Spot-check the weight trend against Apple Health screenshots for a few dates.
- Disable / adjust the `body_composition` unique constraint behavior if duplicates accumulated during testing (or just `delete` and re-run).
- Document the backfill date in a `BACKFILL.md` note (so we know the cutoff if we ever re-run).

**Exit criteria:**

- Trends pages show the full history range (probably years).
- Counts match expectations (e.g. ~1 weight row per day for the days you weighed in).
- No constraint violations during the import.

---

## Phase 12 — Iteration & v2 prep

**Goal:** Use the dashboard daily, accumulate real friction, decide what v2 actually deserves.

**Effort:** ongoing.

**Tasks:**

- Keep a `FRICTION.md` (or use Obsidian) noting every "I wish this was…" moment during real use. Don't fix in the moment — capture and triage weekly.
- After ~2 weeks of daily use, reassess `docs/ROADMAP.md`:
  - Which v2 items still feel necessary?
  - Which are missing from the v2 list?
  - Reorder by actual value, not initial guess.
- Decide whether to start v2 work, leave the app stable, or do a small polish pass.

**Exit criteria:** none — this is the steady state.

---

## Decision moments summary

Decisions explicitly deferred during planning, with the phase that resolves them:

| Decision                  | Resolves in | Notes                                                          |
|---------------------------|-------------|----------------------------------------------------------------|
| ORM / query builder        | Phase 1     | Drizzle vs Kysely vs raw — recommend Drizzle for SvelteKit fit |
| Migration tool             | Phase 1     | Usually tied to ORM choice                                     |
| Chart library              | Phase 3     | Build a layerchart + ECharts spike before committing           |
| Component kit              | Phase 3     | `shadcn-svelte` for complex primitives; rest from scratch      |
| Production hostname        | Phase 10    | Subdomain on a Cloudflare-managed zone                         |

## What happens if a phase blows up

Each phase has a "if this turns out worse than I thought" escape hatch:

- **Phase 1:** raw SQL + node-postgres always works as a fallback if the ORM choice is painful.
- **Phase 2:** if streaming JSON parse is a hassle, accept the memory cost for now and stream later — backfill is one-time anyway.
- **Phase 3:** if chosen chart lib disappoints, swap. The CSS-var-driven design system makes this cheap.
- **Phase 5:** the meal flow is the riskiest UX. If multi-step within a sheet feels bad, fall back to a full page route.
- **Phase 6:** if cross-range queries are slow, denormalize into a daily aggregates table for the cold ranges.
- **Phase 8:** if the in-process scheduler is unreliable across pod restarts, move to a k8s CronJob hitting an internal `/api/cron/tick` endpoint.
- **Phase 10:** if Cloudflare Access bypass policies don't behave, run `/api/ingest` on a separate hostname with no Access at all.

## Sequencing notes

- **Don't skip Phase 3.** Building components ad-hoc as you need them produces inconsistency. The investment of one focused stretch pays off across every later phase.
- **Phase 11 (backfill) waits for prod.** Don't backfill into the dev DB — you'll re-do it. Cleaner to backfill once, into production, after you trust the ingest pipeline.
- **Phases 7 and 9 are flexible.** Auth shim is needed before Phase 10 (deploy) but the Settings UI can be a stub. PWA polish (9) can land before *or* after deploy.
- **Don't start Phase 12 until daily-use data exists.** Two weeks minimum.
