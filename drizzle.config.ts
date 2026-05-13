import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Local dev reads from .env.local; production env vars come from k8s Secrets.
config({ path: '.env.local' });

export default defineConfig({
	schema: './src/lib/server/db/schema/index.ts',
	out: './migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL ?? 'postgres://health:health@localhost:5432/health'
	},
	verbose: true,
	strict: true
});
