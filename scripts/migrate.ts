/**
 * Apply all pending migrations from ./migrations to the database referenced
 * by DATABASE_URL. Run via `pnpm db:migrate`. Idempotent: re-running after
 * a successful migration is a no-op.
 *
 * In production this same script runs once via `kubectl exec` against the
 * app pod (see docs/DEPLOY.md §First-time deployment runbook).
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set. Copy .env.example to .env.local.');
	process.exit(1);
}

// `max: 1` because the migrator runs sequentially and we want to release
// the connection promptly after it finishes.
const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log('→ running migrations against', url.replace(/:[^@]*@/, ':***@'));
await migrate(db, { migrationsFolder: './migrations' });
console.log('✓ migrations applied');

await client.end();
