# Roadmap

What's in v1, what's deferred, and what's explicitly out of scope.

## v1 — the build target

### Metrics tracked

- **Body composition** — weight, body fat %, muscle mass, BMI, body measurements (waist/chest/hips/etc.).
- **Nutrition** — meals with calories + protein (no carbs/fat in v1); water (one-tap quick-add).
- **Activity** — daily steps, distance, active and basal energy, discrete workout sessions.
- **Sleep** — sleep sessions with stage breakdown when available.

### Goals tracked

- Daily kcal (ceiling).
- Daily water ml (floor).
- Daily steps (floor).
- Target weight kg + target date.

### Capabilities

- HealthAutoExport auto-ingest 4× / day via `/api/ingest` (bearer auth).
- Full Apple Health history backfill on day one.
- Mobile-first PWA (installable, manifest + minimal service worker, online-only).
- Manual entry flows for body comp, body measurements, meals (with personal food library), water.
- Cloudflare Access in front of the UI; bearer-token bypass on `/api/ingest`.
- Home bento dashboard with KPI tiles + sparklines + progress bars.
- Trends page with per-metric history (D / W / M / Y switching).
- Telegram bot for reminders (no email, no Shortcuts in v1).
- Dark + light theme with system-preference default + manual override.
- Single user (me).

### Infrastructure

- k3s on Proxmox VM, three pods (Postgres, app, reused cloudflared).
- Locally-built image, loaded directly into the node (no registry).
- Manual k8s Secrets (not committed).
- Manual `pg_dump` backups (no automation in v1).

### Explicit non-features in v1

- No carbs or fat tracking (only calories + protein).
- No vitals (HR, HRV, BP, SpO2).
- No mood / subjective / habit tracking.
- No substances (caffeine, alcohol, supplements).
- No protein **goal** (you'll have protein numbers but not a target line on the chart).
- No offline support (PWA is online-only).
- No email reminders, no iOS Shortcuts integration.
- No inbound Telegram commands (bot only pushes, doesn't respond).
- No automated backups (manual `pg_dump`).
- No multi-user, no auth beyond Cloudflare Access.
- No native mobile app.

## v2 backlog

Roughly ordered by likely value, not by commitment. Reassess once v1 has been in daily use for a month.

### Metrics & data

- **Vitals tracking:** resting HR, HRV, blood pressure, SpO2, respiratory rate. Will add `vitals_hr`, `vitals_bp`, `vitals_spo2` tables.
- **Full macros:** carbs and fat columns on `meal_items`, plus optional fiber. Adds carbs/fat goals.
- **Protein goal:** add `daily_protein_g` to the `goal_metric` enum and a corresponding tile.
- **Mood / subjective wellbeing:** daily 1–5 mood, energy, stress, soreness. New `mood_log` table.
- **Habits:** definition table + daily binary log. Grid heatmap visualization.
- **Substances:** caffeine mg, alcohol units, supplement events. Useful for correlation with sleep/weight.
- **External food API:** Open Food Facts or USDA search to bootstrap the personal food library faster.

### Ingest

- **Garmin / Fitbit / Whoop ingestion** if a band switch ever happens. Their data doesn't natively go through Apple Health.
- **MyFitnessPal CSV import** as a one-off (`source = 'import'`).

### Reminders & notifications

- **Email channel** via SMTP relay (Resend / Postmark / Sendgrid free tier).
- **iOS Shortcuts pull endpoint** (`GET /api/today`) for native iOS notifications.
- **Inbound Telegram commands:** `/log_water 250`, `/today`, `/weight 82.3`.
- **Per-rule channel routing UI:** each rule picks one or more channels.

### UX

- **Offline-capable PWA:** cache reads, queue writes, sync when back online.
- **Goal projection:** "at this rate, you'll hit target weight by …" trend line.
- **Correlations view:** scatter plots like sleep vs weight delta, alcohol vs sleep, steps vs HR.
- **Export:** CSV download per metric, full DB dump on demand.
- **Photo progress:** monthly photo upload, side-by-side comparison.

### Infrastructure

- **Sealed Secrets or SOPS** so Secrets can live in git.
- **CronJob for automated `pg_dump`** to a PVC or off-cluster store (e.g. Cloudflare R2).
- **Rotate the committed `cloudflared` token** and move it to a Secret.
- **TimescaleDB extension** if query performance ever becomes an issue (it won't at this volume, but worth knowing the upgrade path).

## Explicitly out of scope, ever

- **Multi-user.** This is a personal tool. Don't pretend otherwise.
- **High availability.** Single node, single replica per service. If the cluster is down, the dashboard is down.
- **Real-time streaming.** 4× / day ingest doesn't justify websockets.
- **Public sharing of data.** The dashboard is private; no `/share/<token>` links.
- **Mobile-native app.** PWA is sufficient.

## Decision policy

When a v2 idea matures into a real ask, document it the same way v1 was: pick the architectural fork, write a `docs/` section if it touches infrastructure, update the data model, then implement. Don't add features by drift.
