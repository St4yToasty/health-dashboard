import { json } from '@sveltejs/kit';

/**
 * Liveness probe. No auth.
 *
 * In production this path is excluded from Cloudflare Access (see docs/DEPLOY.md)
 * so external monitors and the k8s readiness/liveness probes can hit it without
 * a login flow.
 *
 * v1 just returns app liveness; once the DB layer exists (Phase 1) this will
 * also fan out to a `select 1` against Postgres so the probe fails if the DB
 * is unreachable.
 */
export const GET = () => json({ ok: true, ts: new Date().toISOString() });
