# CLAUDE.md

Project memory for Claude Code working in this repo. This file is loaded automatically. Keep it factual and short — long-form context lives in `docs/` and `design-system/MASTER.md`.

## What this project is

A single-user personal health-tracking dashboard. SvelteKit + Postgres, deployed to a self-hosted k3s cluster, exposed via Cloudflare Tunnel + Access. Primary goal: weight-loss tracking. Primary surface: iOS PWA. See `README.md` for the full overview.

## Source-of-truth files

When working in this repo, read these files first (in this order):

1. `design-system/MASTER.md` — visual + interaction rules. **Authoritative for all UI work.**
2. `docs/ARCHITECTURE.md` — system topology and data flow.
3. `docs/DATA_MODEL.md` — schema design.
4. The relevant doc for whatever you're doing (`INGEST.md`, `DEPLOY.md`, `DEVELOPMENT.md`, etc.).
5. `design-system/pages/<page>.md` if it exists for the page you're building — page overrides take precedence over MASTER for that page only.

## Hard rules

- **Always scan for secrets before pushing.** This repo is public on GitHub. Before any `git push`, run `git diff --cached` (and `git diff origin/<branch>..HEAD` for already-staged commits) and look for: API tokens, passwords, bearer tokens, private email addresses, internal IPs/hostnames, Cloudflare tokens, Telegram bot tokens, DB credentials, anything that looks like `*_TOKEN`, `*_SECRET`, `*_KEY`, `Authorization: Bearer <real-value>`. If anything looks risky, stop and surface it to the user. Real secrets live only in k8s Secrets and `.env.local` — never in tracked files.
- **Never hardcode hex colors in components.** Use the CSS custom properties from `design-system/MASTER.md` (`var(--bg-surface)`, `var(--accent)`, etc.).
- **Never use emojis as structural icons.** Use Lucide SVGs (`lucide-svelte`).
- **Inputs on mobile must be ≥ 16px font-size** to avoid iOS Safari auto-zoom. Default to `--text-md` (17px).
- **Wide-table schema:** every new metric = a dedicated table + one migration. Don't shoehorn into JSONB.
- **Idempotent ingest:** every metric table has a unique constraint that lets HAE re-push the same window without duplicating data.
- **Tabular numerics everywhere a number is rendered.** Apply `font-variant-numeric: tabular-nums` (the `.num` utility).
- **Don't introduce a new color, font, radius, or motion duration without adding it to the design system file first.**
- **Don't add features beyond v1 scope** (see `docs/ROADMAP.md`) unless the user explicitly asks. v2 ideas are documented but not built.

## Conventions

- App code lives under `src/` (SvelteKit defaults).
- Database access lives in `src/lib/server/db/`. Server-only modules use the `.server.ts` suffix.
- Components live in `src/lib/components/`. One component per file. Component tokens come from CSS vars, not Svelte props.
- Charts live in `src/lib/charts/` with a shared `palette.ts` that maps metrics → CSS color vars (so the chart library can be swapped without touching components).
- API routes live in `src/routes/api/`. `/api/ingest` is the HAE entry point.
- All time-series queries assume the user's time zone (Europe/Lisbon). Day boundaries use that TZ; raw timestamps in DB are UTC.
- Deployment manifests live in a **separate repo**: `~/devel/kubernetes-deployments/health-dashboard/deployment.yaml`. Don't put them in this repo.

## Obsidian vault sync

A summary of this project lives in the user's Obsidian vault at `/mnt/c/Users/joamvieira/Documents/notes/Personal/Health Dashboard/`. The vault is the human-readable hub; the repo (and especially `docs/` + `design-system/MASTER.md`) is the canonical source of truth. The two must not drift.

**When to update the vault notes:**

- A phase clears its exit criteria → add an entry to `Progress Log.md` (newest at top) AND flip its row in `Implementation Plan.md`.
- A decision moves from "Deferred decisions" to "Locked-in choices" in this CLAUDE.md → add a `> [!quote]+` block to `Decisions.md` AND remove the corresponding row from `Implementation Plan.md`'s "Open" decision table.
- A `docs/<name>.md` gains or loses material content → reflect the change in the matching `Health Dashboard/<Name>.md` vault note (each vault note has a `canonical:` frontmatter link to its repo counterpart — keep it valid).
- `design-system/MASTER.md` gets a non-trivial change (new token, new component, new rule) → reflect in `Design System.md`.
- A new component lands in `src/lib/components/` → list it under "Built so far" in `Design System.md`.

**What not to do:**

- Don't copy-paste full docs into the vault. Vault notes are summaries with `[[wikilinks]]` between them and a GitHub URL out to the canonical version. Detail belongs in the repo.
- Don't edit past entries in `Decisions.md` or `Progress Log.md` — both are append-only. Supersede with a new entry if reality changes.
- Don't write secrets (tokens, passwords, real internal hostnames, the user's personal email) into the vault notes. The vault syncs across devices via Self-hosted LiveSync — treat it like a public artifact for the purposes of secret hygiene.

**Daily-note logging is separate** and governed by the user's global `~/.claude/CLAUDE.md` (see "Logging work in the daily note") — that's for end-of-day summaries of the work, not for keeping the project hub current.

## Deferred decisions

These are not yet locked. When you reach work that requires one, ask the user before picking:

- **Component kit** — shadcn-svelte is the leading candidate but not locked.
- **Cloudflare hostname** — needs to be picked when we set up the tunnel route. Will probably be `<something>.<your-domain>`.

## Locked-in choices

- **ORM:** Drizzle (`drizzle-orm` + `drizzle-kit`) — schema in `src/lib/server/db/schema/`, migrations in `migrations/`. Driver: postgres.js (`postgres` package, not `pg`).
- **Migrations:** drizzle-kit auto-generates SQL from schema diffs (`pnpm db:generate`). Hand-crafted custom migrations (for things Drizzle can't express in its DSL, like GiST exclusion constraints) live alongside the generated ones — see `migrations/0001_gist_and_views.sql`. Run with `pnpm db:migrate`. Reset + reseed locally with `pnpm db:reset && pnpm db:seed`.
- **Local Postgres port:** 5433 (not 5432) to avoid colliding with another Postgres container on this machine. See `docker-compose.yml`.
- **Chart library:** **Apache ECharts** via direct imports from `echarts/core`, `echarts/charts`, etc. No wrapper library. Reasons: small footprint when tree-shaken (we only import what we use), powerful enough for every chart in the roadmap, and proven in the Phase 3 shootout. The `svelte-echarts` npm package is NOT installed — we wire ECharts ourselves inside `onMount`.
- **Theme-aware chart colors:** `src/lib/charts/css-vars.ts` exposes `cssVar(name, fallback)` and `chartTokens()` for reading design tokens at runtime. JS-driven charts (which can't consume Tailwind utility classes) must use these — never hardcode hex. Theme switch currently requires a re-mount; revisit if it becomes annoying.

## Environment

- The k3s cluster runs in a Proxmox VM. Images are built locally and loaded onto the node directly (`imagePullPolicy: Never`). Pattern mirrors the sibling `kubernetes-deployments/bbs-tracker/` repo.
- Kubernetes manifests for this project live in a **separate** `kubernetes-deployments/health-dashboard/` directory (not in this repo). Don't add them here.

## Commit & PR conventions

- This repo isn't a git repo yet. When it becomes one: small, focused commits; prose commit messages (no scope prefixes required).
- The user has a `/commit` skill; let them invoke it rather than running git commands proactively.

## Useful skills available in this session

- `svelte-bestpractices` — load when writing or analyzing Svelte components.
- `ui-ux-pro-max` — load for UI design questions. The Cinema Slate direction is already chosen; don't re-pick a style.
- `supabase-postgres-best-practices` — applicable Postgres advice even though we're self-hosting (not on Supabase).
