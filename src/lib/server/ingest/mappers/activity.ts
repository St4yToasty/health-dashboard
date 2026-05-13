/**
 * Daily activity mapping.
 *
 * HAE sends per-day aggregates (steps, distance, energies, flights) where
 * the `date` is midnight in the local TZ. Multiple metrics share the same
 * `(day, source)` natural key, so we merge them into one row per
 * (local-day, source='apple_health') and full-overwrite on conflict —
 * HAE keeps recalculating "today's" numbers until the day rolls over, so
 * the latest push wins.
 */

import type { DbOrTx } from '$lib/server/db';
import { dailyActivity } from '$lib/server/db/schema';
import type { HaeMetric } from '../types';
import { int, localDay, parseHaeDate } from '../normalize';

const FIELDS = {
	step_count: 'steps',
	distance_walking_running: 'distanceM',
	active_energy: 'activeEnergyKcal',
	basal_energy_burned: 'basalEnergyKcal',
	flights_climbed: 'flightsClimbed'
} as const;

type Field = (typeof FIELDS)[keyof typeof FIELDS];

interface DayAccum {
	day: string;
	steps: number | null;
	distanceM: number | null;
	activeEnergyKcal: number | null;
	basalEnergyKcal: number | null;
	flightsClimbed: number | null;
}

export async function applyDailyActivityMetrics(
	db: DbOrTx,
	metrics: HaeMetric[]
): Promise<number> {
	const grouped = new Map<string, DayAccum>();

	for (const metric of metrics) {
		const field = (FIELDS as Record<string, Field>)[metric.name];
		if (!field) continue;
		for (const point of metric.data ?? []) {
			const at = parseHaeDate(point.date);
			const value = int(point.qty);
			if (!at || value === null) continue;
			const day = localDay(at);
			const acc = grouped.get(day) ?? {
				day,
				steps: null,
				distanceM: null,
				activeEnergyKcal: null,
				basalEnergyKcal: null,
				flightsClimbed: null
			};
			acc[field] = value;
			grouped.set(day, acc);
		}
	}

	let written = 0;
	for (const acc of grouped.values()) {
		await db
			.insert(dailyActivity)
			.values({
				day: acc.day,
				steps: acc.steps,
				distanceM: acc.distanceM,
				activeEnergyKcal: acc.activeEnergyKcal,
				basalEnergyKcal: acc.basalEnergyKcal,
				flightsClimbed: acc.flightsClimbed,
				source: 'apple_health'
			})
			.onConflictDoUpdate({
				target: [dailyActivity.day, dailyActivity.source],
				set: {
					// Overwrite each non-null incoming value; nulls preserve existing data.
					// (HAE keeps recomputing today; latest push wins.)
					steps: acc.steps ?? undefined,
					distanceM: acc.distanceM ?? undefined,
					activeEnergyKcal: acc.activeEnergyKcal ?? undefined,
					basalEnergyKcal: acc.basalEnergyKcal ?? undefined,
					flightsClimbed: acc.flightsClimbed ?? undefined,
					updatedAt: new Date()
				}
			});
		written++;
	}
	return written;
}
