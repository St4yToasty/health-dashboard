# Architecture

System topology, data flow, and the responsibilities of each piece. This is the map; specific concerns get their own doc (`DATA_MODEL.md`, `INGEST.md`, `DEPLOY.md`).

## Topology

```
                              ┌─────────────────────┐
                              │   iPhone (Safari)   │
                              │  PWA installed to   │
                              │     home screen     │
                              └──────────┬──────────┘
                                         │
                  ┌──────────────────────┴─────────────────────┐
                  │  HealthAutoExport app           User taps  │
                  │  4× / day auto POST             Open PWA   │
                  └──────────────────────┬─────────────────────┘
                                         │ HTTPS
                                         ▼
                          ┌────────────────────────────┐
                          │   Cloudflare Edge          │
                          │   ─ DNS                    │
                          │   ─ Tunnel termination     │
                          │   ─ Access (UI gate)       │
                          │   ─ Access bypass for      │
                          │     /api/ingest path       │
                          └──────────────┬─────────────┘
                                         │ Tunnel
                                         ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  k3s cluster (Proxmox VM)                                            │
   │                                                                       │
   │   ┌──────────────────────┐                                           │
   │   │  cloudflared-ns       │ (pre-existing)                            │
   │   │   cloudflared pod     │                                           │
   │   └──────────┬───────────┘                                           │
   │              │                                                        │
   │              ▼                                                        │
   │   ┌──────────────────────────────────────────────────────────────┐  │
   │   │  health-dashboard-ns                                          │  │
   │   │                                                                │  │
   │   │   ┌──────────────────────┐        ┌──────────────────────┐   │  │
   │   │   │  health-dashboard    │  TCP   │  postgres            │   │  │
   │   │   │  (SvelteKit)         │ ─────► │  PVC: 5Gi (default   │   │  │
   │   │   │                      │        │   storage class)     │   │  │
   │   │   │  ─ UI (SSR + PWA)    │        │                      │   │  │
   │   │   │  ─ /api/* JSON       │        │  Internal only       │   │  │
   │   │   │  ─ /api/ingest       │        │  (ClusterIP)         │   │  │
   │   │   │  ─ Reminder cron      │        └──────────────────────┘   │  │
   │   │   │  ─ Telegram client   │                                    │  │
   │   │   └──────────┬───────────┘                                    │  │
   │   │              │ outbound HTTPS                                 │  │
   │   │              ▼                                                 │  │
   │   │       api.telegram.org                                         │  │
   │   └──────────────────────────────────────────────────────────────┘  │
   └─────────────────────────────────────────────────────────────────────┘
```

## Components

### `cloudflared` (existing)

- Lives in `cloudflared-ns`. Deployed via `~/devel/kubernetes-deployments/cloudflared/cloudflared.yaml`.
- Already terminates the tunnel. We add a hostname route in the Cloudflare dashboard pointing the dashboard hostname to the `health-dashboard` Service inside `health-dashboard-ns`.
- **Tech-debt note:** the tunnel token is currently committed in plaintext. Should be rotated and moved to a `Secret` at some point. Not blocking.

### `postgres` pod

- Image: `postgres:16-alpine`.
- Single replica, `strategy: Recreate` (DB with PVC — can't run two at once).
- PVC: `postgres-data`, 5 Gi from the default storage class.
- Resource limits intentionally small (personal dataset is < 100 MB even after years).
- `ClusterIP` Service `postgres:5432` reachable from the app pod only.
- Credentials live in `health-dashboard-db` Secret (created manually, not committed).

### `health-dashboard` pod (SvelteKit)

Single application that owns:

| Responsibility           | Detail                                                                 |
|--------------------------|------------------------------------------------------------------------|
| UI (SSR + hydrate)       | All routes under `/`. Renders the PWA shell.                           |
| API (`/api/*`)           | JSON endpoints consumed by the SPA portion.                            |
| Ingest (`/api/ingest`)   | HAE-facing endpoint. Bearer-auth, idempotent. See `INGEST.md`.         |
| Reminder scheduler       | In-process cron-style. Polls DB for due reminders, sends via Telegram. |
| Telegram client          | Outbound HTTPS to `api.telegram.org`. Bot token in Secret.             |

- Image built locally (`docker build`), loaded into the node (`docker save | k3s ctr images import`).
- `imagePullPolicy: Never`. Tag scheme: `health-dashboard:vX.Y.Z`.
- Single replica. App is stateless; persistence is in Postgres.
- Reads config from env vars wired to Secrets (`DATABASE_URL`, `INGEST_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).

## Public surface

| Path                    | Behind CF Access? | Auth required                                  |
|-------------------------|-------------------|------------------------------------------------|
| `/` and all UI routes   | Yes               | Cloudflare Access (Google / email OTP)         |
| `/api/*` (UI-facing)    | Yes               | Cloudflare Access (same identity as UI)        |
| `/api/ingest`           | **Bypassed**       | Bearer token in `Authorization` header        |
| `/api/health` (probe)   | Bypassed           | None (returns `{ok: true}` only)              |

The CF Access bypass for `/api/ingest` uses a Cloudflare Access **Bypass policy** scoped to that path. HAE can't authenticate to CF Access, so we let it through at the edge and rely on the in-app bearer check.

Identity at the app layer: SvelteKit `hooks.server.ts` reads `Cf-Access-Authenticated-User-Email` from incoming request headers. This header is set by Cloudflare and stripped at the edge for any request that didn't pass Access — so trusting it is safe **provided** the bypass policy on `/api/ingest` doesn't forward an attacker-controlled value. (Always strip + re-derive in hooks; don't blindly trust whatever arrives.)

## Data flow

### Automatic (4× / day)

1. iPhone, while unlocked, fires HAE's Automation.
2. HAE reads the configured Apple Health categories for the period since last successful export.
3. HAE POSTs JSON to `https://<hostname>/api/ingest` with `Authorization: Bearer <INGEST_TOKEN>`.
4. Cloudflare edge: matches `/api/ingest`, bypass policy lets the request through to the tunnel.
5. App receives POST, validates bearer, parses payload, upserts into the right metric tables (idempotent on `(date, source)` or equivalent).
6. App returns 200; HAE marks the window as exported.

### Manual entry (water / meal / weight)

1. User opens PWA on phone.
2. CF Access redirects to login if no valid session (one-time per device per ~24h).
3. User taps a quick-add tile (e.g. "+250 ml") or opens the FAB sheet.
4. SvelteKit form POSTs to `/api/manual/*`.
5. Server inserts a row, returns the updated tile data.
6. UI optimistically reflects the change before the response if appropriate.

### Backfill (one-time)

1. Open HAE on the phone → "Export All History" → JSON.
2. POST that JSON to `/api/ingest` (same endpoint, same auth). Large payloads are streaming-parsed.
3. Idempotent upserts mean re-running is safe.

### Reminders (Telegram)

1. App scheduler ticks every minute.
2. Reads rules from DB; for each due rule, evaluates its condition against current data.
3. If the condition fires, POSTs a message to `api.telegram.org/bot<TOKEN>/sendMessage`.
4. Marks the rule as fired-for-this-window so it doesn't double-fire.

See `REMINDERS.md` for rule schema and example rules.

## Time zone

- All timestamps in Postgres are UTC (`timestamptz`).
- All day-boundary math uses `Europe/Lisbon`. Queries that need "today" do the conversion at query time, not at write time.
- HAE payloads come with timezone-aware timestamps; we store as-is.

## What's deliberately *not* in scope

- **Multi-user / multi-tenant.** Single user assumed throughout.
- **Native mobile app.** PWA covers it.
- **Realtime / websockets.** 4× / day ingest + manual entry doesn't justify it.
- **External BI tools.** If we ever want Grafana/Metabase, point them at Postgres directly; that's a separate concern.
- **High availability.** One Postgres pod, one app pod. If the node dies, the dashboard is down until it's back. Acceptable for personal use.

See `ROADMAP.md` for things explicitly punted to v2.
