/**
 * Drop and recreate the public schema, then re-apply all migrations.
 *
 * Useful when you've changed migrations and want a clean slate without
 * tearing down the whole docker-compose volume. NEVER run against prod.
 *
 * Run via `pnpm db:reset` then `pnpm db:seed`.
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

if (url.includes('@health-dashboard.health-dashboard-ns')) {
	console.error('Refusing to run against in-cluster DATABASE_URL. Drop manually if intentional.');
	process.exit(2);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log('→ dropping public + drizzle schemas');
await db.execute(sql`drop schema if exists public cascade`);
await db.execute(sql`drop schema if exists drizzle cascade`);
await db.execute(sql`create schema public`);

console.log('→ applying migrations');
await migrate(db, { migrationsFolder: './migrations' });

console.log('✓ reset complete');
await client.end();
