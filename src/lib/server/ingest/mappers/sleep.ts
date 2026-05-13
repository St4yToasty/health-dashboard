/**
 * Sleep session mapping.
 *
 * One HAE sleep entry → one row in sleep_sessions. Unique on
 * (started_at, source). Re-pushing the same window updates the duration
 * fields (Sleep Cycle sometimes corrects its analysis after the fact).
 */

import type { DbOrTx } from '$lib/server/db';
import { sleepSessions } from '$lib/server/db/schema';
import type { HaeSleepSession } from '../types';
import { int, parseHaeDate } from '../normalize';

export async function applySleepSessions(db: DbOrTx, items: HaeSleepSession[]): Promise<number> {
	let written = 0;
	for (const s of items) {
		const startedAt = parseHaeDate(s.startDate);
		const endedAt = parseHaeDate(s.endDate);
		if (!startedAt || !endedAt || endedAt <= startedAt) continue;

		await db
			.insert(sleepSessions)
			.values({
				startedAt,
				endedAt,
				inBedMin: int(s.inBed),
				asleepMin: int(s.asleep),
				deepMin: int(s.deep),
				remMin: int(s.rem),
				coreMin: int(s.core),
				awakeMin: int(s.awake),
				source: 'apple_health'
			})
			.onConflictDoUpdate({
				target: [sleepSessions.startedAt, sleepSessions.source],
				set: {
					endedAt,
					inBedMin: int(s.inBed) ?? undefined,
					asleepMin: int(s.asleep) ?? undefined,
					deepMin: int(s.deep) ?? undefined,
					remMin: int(s.rem) ?? undefined,
					coreMin: int(s.core) ?? undefined,
					awakeMin: int(s.awake) ?? undefined
				}
			});
		written++;
	}
	return written;
}
