/**
 * Test-only helpers for DB integration tests.
 *
 * Vitest's server project sets DATABASE_URL to `health_test` (see
 * vite.config.ts). We connect on demand and expose a TRUNCATE helper that
 * keeps tests isolated without dropping the schema.
 *
 * Run `pnpm db:test:setup` once to create the database and apply migrations.
 */

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function makeTestDb() {
	const url = process.env.DATABASE_URL;
	if (!url || !url.endsWith('/health_test')) {
		throw new Error(
			`makeTestDb refused: DATABASE_URL must point at the test DB (got: ${url ?? 'unset'}).`
		);
	}
	const client = postgres(url, { max: 5 });
	const db = drizzle(client, { schema, casing: 'snake_case' });
	return { db, client };
}

/**
 * Wipe every ingest- and seed-touching table back to empty. Restarts identity
 * so row IDs don't drift between tests. Keep `goals` in the list so the GiST
 * exclusion constraint doesn't carry state across tests that insert goals.
 */
export async function truncateAll(client: postgres.Sql) {
	await client.unsafe(`
		truncate
			body_composition,
			body_measurements,
			foods,
			meals,
			meal_items,
			water_intake,
			daily_activity,
			workouts,
			sleep_sessions,
			goals,
			ingest_events,
			reminder_rules,
			reminder_fires
		restart identity cascade
	`);
}

// Tiny convenience so a test can do `await sleep(0)` to flush microtasks.
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Re-export sql so tests don't need a separate drizzle import for raw queries.
export { sql };
