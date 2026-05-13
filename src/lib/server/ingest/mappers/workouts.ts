/**
 * Workouts mapping.
 *
 * Each HAE workout becomes one row. Unique on (started_at, kind, source);
 * a re-pushed window for the same workout updates the energy/distance/HR
 * fields without duplicating.
 */

import type { DbOrTx } from '$lib/server/db';
import { workouts } from '$lib/server/db/schema';
import type { HaeWorkout } from '../types';
import { int, mapWorkoutKind, parseHaeDate } from '../normalize';

export async function applyWorkouts(db: DbOrTx, items: HaeWorkout[]): Promise<number> {
	let written = 0;
	for (const w of items) {
		const startedAt = parseHaeDate(w.start);
		const endedAt = parseHaeDate(w.end);
		if (!startedAt || !endedAt || endedAt <= startedAt) continue;

		await db
			.insert(workouts)
			.values({
				startedAt,
				endedAt,
				kind: mapWorkoutKind(w.name),
				activeEnergyKcal: int(w.totalActiveEnergyBurned?.qty),
				distanceM: int(w.totalDistance?.qty),
				avgHr: int(w.avgHeartRate?.qty),
				maxHr: int(w.maxHeartRate?.qty),
				source: 'apple_health'
			})
			.onConflictDoUpdate({
				target: [workouts.startedAt, workouts.kind, workouts.source],
				set: {
					endedAt,
					activeEnergyKcal: int(w.totalActiveEnergyBurned?.qty) ?? undefined,
					distanceM: int(w.totalDistance?.qty) ?? undefined,
					avgHr: int(w.avgHeartRate?.qty) ?? undefined,
					maxHr: int(w.maxHeartRate?.qty) ?? undefined
				}
			});
		written++;
	}
	return written;
}
