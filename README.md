# health-dashboard

Personal health-tracking dashboard. Captures weight, nutrition, activity, and sleep data — partly automated via HealthAutoExport (iOS → Apple Health → our API), partly manually via a mobile-first PWA — and visualizes progress against goals.

Single user (me). Self-hosted on my own k3s cluster, exposed via Cloudflare Tunnel + Cloudflare Access.

## Status

**Pre-implementation.** Architecture, design system, and v1 scope are decided and documented; no code written yet.

## Stack at a glance

| Layer            | Choice                                                                 |
|------------------|------------------------------------------------------------------------|
| App framework    | SvelteKit (Svelte 5)                                                   |
| Database         | Postgres                                                               |
| Styling          | Tailwind v4 + CSS custom properties (see `design-system/MASTER.md`)   |
| Component kit    | shadcn-svelte (planned, not locked)                                   |
| Chart library    | **Deferred** — compared at viz build time                              |
| ORM / migrations | **Deferred** — compared at DB layer build time                         |
| Runtime          | k3s on a Proxmox VM, one Postgres pod + one app pod                    |
| Public access    | Existing Cloudflare Tunnel (`cloudflared` deployment) + Access at edge |
| UI auth          | Cloudflare Access (Google / email OTP)                                 |
| Ingest auth      | Static bearer token in `Authorization` header                          |
| Reminders        | Telegram bot (v1); email + iOS Shortcuts in v2                         |
| PWA              | Installable (manifest + minimal service worker), online-only v1        |

## v1 scope

Tracks: **body composition**, **nutrition** (calories + protein + water), **activity** (steps / workouts / active energy), **sleep**.

Goals (with effective-from/to dates): daily kcal, weight (with target date), daily water, daily steps.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for v2 backlog and out-of-scope items.

## Repo layout

```
health-dashboard/                  ← this repo (app code)
├── README.md
├── CLAUDE.md                      ← Claude Code project memory
├── design-system/
│   ├── MASTER.md                  ← visual + interaction source of truth
│   └── pages/                     ← per-page overrides (currently empty)
└── docs/
    ├── ARCHITECTURE.md            ← system topology, pods, data flow
    ├── DATA_MODEL.md              ← schema design for v1
    ├── INGEST.md                  ← HealthAutoExport integration spec
    ├── DEPLOY.md                  ← k8s deployment runbook
    ├── DEVELOPMENT.md             ← local dev loop
    ├── REMINDERS.md               ← Telegram bot reminder spec
    └── ROADMAP.md                 ← v1 vs v2 split

~/devel/kubernetes-deployments/
└── health-dashboard/
    └── deployment.yaml            ← k8s manifest (not yet created)
```

## Quick links

- **Design system:** [`design-system/MASTER.md`](design-system/MASTER.md)
- **Architecture overview:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Get the dev environment running:** [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- **Deploy to the cluster:** [`docs/DEPLOY.md`](docs/DEPLOY.md)

## Decisions journal

This project's design decisions were captured during a structured interview. The major forks chosen:

- **Topology:** three pods in k3s (Postgres + app; cloudflared reused).
- **App shape:** single SvelteKit app for UI + API + ingest + reminder scheduler. No split front/back.
- **Schema style:** wide per-metric tables (one table per metric type). Each new metric = one migration.
- **Backfill:** import full Apple Health history on day one through the same `/ingest` endpoint.
- **Visual direction:** *Cinema Slate* — dark-first premium dashboard aesthetic, equally polished light mode.

Deferred decisions are tracked in `CLAUDE.md` so we know what's still open.
