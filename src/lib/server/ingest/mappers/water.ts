/**
 * Water intake mapping.
 *
 * HAE's `dietary_water` rows are additive: each row is one logged drink.
 * No unique constraint — drinking water twice in the same minute should
 * produce two rows. Re-pushing the same HAE window will therefore *add*
 * duplicate rows, but in practice HAE only sends new rows per window so
 * this isn't a problem.
 *
 * If we ever observe duplicate problems in real use we can add a unique
 * (recorded_at, amount_ml, source) constraint and switch to DO NOTHING.
 */

import type { DbOrTx } from '$lib/server/db';
import { waterIntake } from '$lib/server/db/schema';
import type { HaeMetric } from '../types';
import { int, parseHaeDate } from '../normalize';

export async function applyWaterMetrics(db: DbOrTx, metrics: HaeMetric[]): Promise<number> {
	const rows = [];
	for (const metric of metrics) {
		if (metric.name !== 'dietary_water') continue;
		for (const point of metric.data ?? []) {
			const at = parseHaeDate(point.date);
			const amount = int(point.qty);
			if (!at || amount === null || amount <= 0) continue;
			rows.push({ recordedAt: at, amountMl: amount, source: 'apple_health' as const });
		}
	}
	if (rows.length === 0) return 0;
	await db.insert(waterIntake).values(rows);
	return rows.length;
}
