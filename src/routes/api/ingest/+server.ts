/**
 * POST /api/ingest
 *
 * HealthAutoExport pushes JSON payloads here on its scheduled cadence
 * (~4× / day per docs/INGEST.md). In production this path is excluded
 * from Cloudflare Access via a Bypass policy; the in-app bearer check
 * is the only auth.
 *
 * Status codes (per docs/INGEST.md §Errors):
 *   200 — all sections parsed and written
 *   207 — partial parse: some categories errored (details in body)
 *   400 — body is not JSON, or shape is not recognisable as HAE
 *   401 — missing / wrong bearer
 *   500 — internal error during apply()
 *
 * Every request is archived to ingest_events first (status='parsed' or
 * 'error'). On error the raw payload is preserved for replay/debugging.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db, ingestEvents } from '$lib/server/db';
import { applyHaePayload, asHaePayload } from '$lib/server/ingest';

const TOKEN = env.INGEST_TOKEN ?? '';

/** Constant-time bearer comparison. Returns false if no token configured. */
function bearerMatches(header: string | null): boolean {
	if (!TOKEN) return false;
	if (!header || !header.startsWith('Bearer ')) return false;
	const provided = header.slice('Bearer '.length);
	const a = Buffer.from(provided);
	const b = Buffer.from(TOKEN);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	if (!bearerMatches(request.headers.get('authorization'))) {
		return new Response(null, { status: 401 });
	}

	let raw: string;
	try {
		raw = await request.text();
	} catch (err) {
		return json({ error: 'body_read_failed', message: String(err) }, { status: 400 });
	}

	const bytes = Buffer.byteLength(raw, 'utf8');
	const sourceIp = (() => {
		try {
			return getClientAddress();
		} catch {
			return null;
		}
	})();

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		await db.insert(ingestEvents).values({
			sourceIp,
			bytes,
			status: 'error',
			error: 'invalid_json',
			payload: raw.length < 1_000_000 ? ({ _raw: raw } as unknown as object) : null
		});
		return json({ error: 'invalid_json' }, { status: 400 });
	}

	const payload = asHaePayload(parsed);
	if (!payload) {
		await db.insert(ingestEvents).values({
			sourceIp,
			bytes,
			status: 'error',
			error: 'unrecognized_payload',
			payload: parsed as object
		});
		return json({ error: 'unrecognized_payload' }, { status: 400 });
	}

	try {
		const summary = await applyHaePayload(db, payload);
		await db.insert(ingestEvents).values({
			sourceIp,
			bytes,
			status: 'parsed',
			payload: payload as unknown as object
		});

		const total =
			summary.bodyComposition +
			summary.waterIntake +
			summary.dailyActivity +
			summary.workouts +
			summary.sleepSessions;

		return json(
			{ ingested: total, summary },
			{ status: summary.errors.length > 0 ? 207 : 200 }
		);
	} catch (err) {
		await db.insert(ingestEvents).values({
			sourceIp,
			bytes,
			status: 'error',
			error: err instanceof Error ? err.message : String(err),
			payload: payload as unknown as object
		});
		return json({ error: 'internal' }, { status: 500 });
	}
};

// GET on /api/ingest is not used; explicitly disallow so a confused click
// in a browser doesn't expose anything.
export const GET: RequestHandler = () => new Response(null, { status: 405 });
