import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

// ─── Dev-tunnel mode ─────────────────────────────────────────────────────
// Set DEV_TUNNEL=1 when running `pnpm dev` on the k3s VM, exposed through
// the existing Cloudflare tunnel. This binds Vite to 0.0.0.0, whitelists
// the tunnel hostname, and points the HMR websocket at wss://<host>:443
// (otherwise the client tries to ws://<wherever>:5173 and live-reload dies
// silently). Laptop dev is unaffected — these settings only apply when the
// env var is set.
//
// See docs/DEV_TUNNEL.md.
const useTunnel = process.env.DEV_TUNNEL === '1';
const tunnelHost = process.env.DEV_TUNNEL_HOST ?? 'dev.joaomvieira.com';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: useTunnel
		? {
				host: true,
				allowedHosts: [tunnelHost],
				hmr: {
					host: tunnelHost,
					protocol: 'wss',
					clientPort: 443
				}
			}
		: undefined,
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					// Force tests to use a separate DB so they never touch dev fixture data.
					env: { DATABASE_URL: 'postgres://health:health@localhost:5433/health_test' }
				}
			}
		]
	}
});
