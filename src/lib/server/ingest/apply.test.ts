/**
 * Integration tests for the ingest pipeline against a real Postgres
 * (the `health_test` DB on the docker-compose container).
 *
 * Each test starts from an empty schema (truncate cascade in beforeEach).
 * Setup expectation: the test DB is created and migrated once via
 * `pnpm db:test:setup` before this suite runs.
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
	bodyComposition,
	dailyActivity,
	sleepSessions,
	waterIntake,
	workouts
} from '$lib/server/db/schema';
import { makeTestDb, truncateAll } from '$lib/server/db/test-utils';
import { applyHaePayload, asHaePayload } from './index';
import { applyBodyMetrics } from './mappers/body';
import { applyDailyActivityMetrics } from './mappers/activity';
import { eq } from 'drizzle-orm';

const { db, client } = makeTestDb();

const loadSample = (name: string) =>
	asHaePayload(JSON.parse(readFileSync(`samples/${name}`, 'utf8')))!;

beforeEach(async () => {
	await truncateAll(client);
});

afterAll(async () => {
	await client.end();
});

describe('applyBodyMetrics', () => {
	it('merges partial pushes into one row (coalesce on conflict)', async () => {
		// First push: weight only.
		await applyBodyMetrics(db, [
			{
				name: 'weight_body_mass',
				units: 'kg',
				data: [{ date: '2026-05-13 07:42:00 +0100', qty: 82.4 }]
			}
		]);
		// Second push: body_fat only, same recorded_at. Should fill in the
		// missing column without blanking the existing weight.
		await applyBodyMetrics(db, [
			{
				name: 'body_fat_percentage',
				units: '%',
				data: [{ date: '2026-05-13 07:42:00 +0100', qty: 21.5 }]
			}
		]);

		const rows = await db.select().from(bodyComposition);
		expect(rows).toHaveLength(1);
		expect(rows[0].weightKg).toBe('82.40');
		expect(rows[0].bodyFatPct).toBe('21.50');
	});

	it('groups all three metrics at the same instant into one row', async () => {
		await applyBodyMetrics(db, [
			{ name: 'weight_body_mass', units: 'kg', data: [{ date: '2026-05-13 07:42:00 +0100', qty: 82.4 }] },
			{ name: 'body_fat_percentage', units: '%', data: [{ date: '2026-05-13 07:42:00 +0100', qty: 21.5 }] },
			{ name: 'lean_body_mass', units: 'kg', data: [{ date: '2026-05-13 07:42:00 +0100', qty: 35.6 }] }
		]);
		const rows = await db.select().from(bodyComposition);
		expect(rows).toHaveLength(1);
		expect(rows[0].weightKg).toBe('82.40');
		expect(rows[0].bodyFatPct).toBe('21.50');
		expect(rows[0].muscleMassKg).toBe('35.60');
	});
});

describe('applyDailyActivityMetrics', () => {
	it('overwrites on re-push for the same (day, source)', async () => {
		await applyDailyActivityMetrics(db, [
			{ name: 'step_count', units: 'count', data: [{ date: '2026-05-13 00:00:00 +0100', qty: 5000 }] }
		]);
		await applyDailyActivityMetrics(db, [
			{ name: 'step_count', units: 'count', data: [{ date: '2026-05-13 00:00:00 +0100', qty: 7432 }] },
			{
				name: 'distance_walking_running',
				units: 'm',
				data: [{ date: '2026-05-13 00:00:00 +0100', qty: 5640 }]
			}
		]);
		const rows = await db
			.select()
			.from(dailyActivity)
			.where(eq(dailyActivity.day, '2026-05-13'));
		expect(rows).toHaveLength(1);
		expect(rows[0].steps).toBe(7432);
		expect(rows[0].distanceM).toBe(5640);
	});
});

describe('applyHaePayload — end to end', () => {
	it('processes the full-day fixture into all five tables', async () => {
		const payload = loadSample('hae-full-day.json');
		const summary = await applyHaePayload(db, payload);
		expect(summary.errors).toEqual([]);
		expect(summary.bodyComposition).toBe(1);
		expect(summary.waterIntake).toBe(4);
		expect(summary.dailyActivity).toBe(1);
		expect(summary.workouts).toBe(1);
		expect(summary.sleepSessions).toBe(1);

		expect((await db.select().from(bodyComposition))[0].weightKg).toBe('82.40');
		expect(await db.select().from(waterIntake)).toHaveLength(4);
		expect(await db.select().from(workouts)).toHaveLength(1);
		expect(await db.select().from(sleepSessions)).toHaveLength(1);
	});

	it('is idempotent for constrained tables on replay', async () => {
		const minimal = loadSample('hae-minimal.json');
		await applyHaePayload(db, minimal);
		await applyHaePayload(db, minimal); // replay

		// Body composition + daily_activity each have unique constraints,
		// so a replay must NOT create a second row.
		expect(await db.select().from(bodyComposition)).toHaveLength(1);
		expect(await db.select().from(dailyActivity)).toHaveLength(1);

		// Water has no unique constraint by design — replays add rows.
		// The minimal fixture has 2 water rows, replay → 4 total.
		expect(await db.select().from(waterIntake)).toHaveLength(4);
	});

	it('parses workout name variations correctly', async () => {
		const payload = loadSample('hae-workout.json');
		await applyHaePayload(db, payload);
		const rows = await db.select({ kind: workouts.kind }).from(workouts).orderBy(workouts.startedAt);
		expect(rows.map((r) => r.kind)).toEqual(['running', 'strength']);
	});
});
