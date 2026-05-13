/**
 * Drizzle client singleton.
 *
 * Lives under `src/lib/server/` so SvelteKit forbids importing it from
 * client-side code. The whole module — including the postgres connection —
 * never ships to the browser.
 *
 * Uses postgres.js (the `postgres` package) as the underlying driver:
 * lighter, faster, and more idiomatic for modern Drizzle than node-postgres.
 */

import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
}

// `max: 10` keeps the pool small for a single-user, single-pod deployment.
// `prepare: false` is safer with pgbouncer-like proxies if we ever add one.
const client = postgres(env.DATABASE_URL, {
	max: 10,
	idle_timeout: 20,
	prepare: false
});

export const db = drizzle(client, { schema, casing: 'snake_case' });

export type Database = typeof db;

// Re-export the schema so consumers can `import { db, foods } from '$lib/server/db'`
export * from './schema';
