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
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { drizzle, type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
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

/** The top-level Drizzle client. Has `.transaction()`, `.execute()`, query builders, etc. */
export type Database = typeof db;

/** A live transaction passed to `db.transaction(async (tx) => …)`. */
export type Transaction = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

/**
 * Anything that can run queries — either the top-level db or a transaction.
 * Use this as the parameter type in helpers/mappers that should be callable
 * both inside and outside a transaction.
 */
export type DbOrTx = Database | Transaction;

// Re-export the schema so consumers can `import { db, foods } from '$lib/server/db'`
export * from './schema';
