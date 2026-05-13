/**
 * Idempotent setup for the `health_test` database used by Vitest's server
 * project (see vite.config.ts).
 *
 * 1. Connect to `postgres` (admin DB) and `CREATE DATABASE health_test`
 *    if it doesn't exist.
 * 2. Connect to `health_test` and apply all migrations.
 *
 * Safe to re-run any time. Run via `pnpm db:test:setup`.
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: '.env.local' });

const baseUrl = process.env.DATABASE_URL ?? 'postgres://health:health@localhost:5433/health';
const testUrl = baseUrl.replace(/\/[^/]+$/, '/health_test');
const adminUrl = baseUrl.replace(/\/[^/]+$/, '/postgres');

console.log('→ ensuring health_test database exists');
const admin = postgres(adminUrl, { max: 1 });
const exists =
	(
		await admin`select 1 from pg_database where datname = 'health_test' limit 1` as Array<{
			'?column?': number;
		}>
	).length > 0;
if (!exists) {
	await admin.unsafe('create database health_test');
	console.log('  created');
} else {
	console.log('  already present');
}
await admin.end();

console.log('→ applying migrations to health_test');
const test = postgres(testUrl, { max: 1 });
const db = drizzle(test);
await migrate(db, { migrationsFolder: './migrations' });
await test.end();

console.log('✓ test DB ready');
