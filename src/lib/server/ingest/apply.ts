/**
 * Top-level ingest orchestrator.
 *
 * Takes a parsed HAE payload, dispatches each section to its mapper,
 * collects counts + errors, returns a summary. Per-section failures don't
 * abort the rest — we want partial ingest in the worst case rather than
 * losing a whole window because one workout had a bad date.
 *
 * All inserts share a single transaction so the whole HAE push either
 * commits atomically or rolls back.
 */

import type { Database } from '$lib/server/db';
import type { HaePayload, IngestSummary } from './types';
import { emptySummary } from './types';
import { applyBodyMetrics } from './mappers/body';
import { applyWaterMetrics } from './mappers/water';
import { applyDailyActivityMetrics } from './mappers/activity';
import { applyWorkouts } from './mappers/workouts';
import { applySleepSessions } from './mappers/sleep';

export async function applyHaePayload(
	db: Database,
	payload: HaePayload
): Promise<IngestSummary> {
	const summary = emptySummary();
	const metrics = payload.data.metrics ?? [];
	const workouts = payload.data.workouts ?? [];
	const sleep = payload.data.sleep_analysis ?? [];

	await db.transaction(async (tx) => {
		const safe = async <T>(category: string, fn: () => Promise<T>): Promise<T | null> => {
			try {
				return await fn();
			} catch (err) {
				summary.errors.push({
					category,
					message: err instanceof Error ? err.message : String(err)
				});
				return null;
			}
		};

		summary.bodyComposition = (await safe('body_composition', () => applyBodyMetrics(tx, metrics))) ?? 0;
		summary.waterIntake = (await safe('water_intake', () => applyWaterMetrics(tx, metrics))) ?? 0;
		summary.dailyActivity =
			(await safe('daily_activity', () => applyDailyActivityMetrics(tx, metrics))) ?? 0;
		summary.workouts = (await safe('workouts', () => applyWorkouts(tx, workouts))) ?? 0;
		summary.sleepSessions = (await safe('sleep_sessions', () => applySleepSessions(tx, sleep))) ?? 0;
	});

	return summary;
}
