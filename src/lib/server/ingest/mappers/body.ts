/**
 * Body-composition mapping.
 *
 * Three HAE metrics share the same `(recorded_at, source)` natural key:
 *  - weight_body_mass     → body_composition.weight_kg
 *  - body_fat_percentage  → body_composition.body_fat_pct
 *  - lean_body_mass       → body_composition.muscle_mass_kg
 *
 * A typical smart-scale push produces all three at the same instant. We
 * merge them into one row per (instant, source) and upsert. On conflict
 * we coalesce: a later push that includes weight but not body fat won't
 * overwrite an existing body_fat_pct with null.
 */

import { sql } from 'drizzle-orm';
import type { DbOrTx } from '$lib/server/db';
import { bodyComposition } from '$lib/server/db/schema';
import type { HaeMetric } from '../types';
import { num, parseHaeDate } from '../normalize';

// HAE metric → body_composition column mapping.
// Kept verbose (vs a lookup table) so each branch is type-checked against
// the schema directly.

interface Accum {
	recordedAt: Date;
	weightKg: string | null;
	bodyFatPct: string | null;
	muscleMassKg: string | null;
}

export async function applyBodyMetrics(db: DbOrTx, metrics: HaeMetric[]): Promise<number> {
	const grouped = new Map<string, Accum>();

	for (const metric of metrics) {
		if (
			metric.name !== 'weight_body_mass' &&
			metric.name !== 'body_fat_percentage' &&
			metric.name !== 'lean_body_mass'
		) {
			continue;
		}
		for (const point of metric.data ?? []) {
			const at = parseHaeDate(point.date);
			if (!at) continue;
			const key = at.toISOString();
			const acc = grouped.get(key) ?? {
				recordedAt: at,
				weightKg: null,
				bodyFatPct: null,
				muscleMassKg: null
			};
			if (metric.name === 'weight_body_mass') acc.weightKg = num(point.qty);
			else if (metric.name === 'body_fat_percentage') acc.bodyFatPct = num(point.qty);
			else if (metric.name === 'lean_body_mass') acc.muscleMassKg = num(point.qty);
			grouped.set(key, acc);
		}
	}

	let written = 0;
	for (const acc of grouped.values()) {
		if (acc.weightKg === null && acc.bodyFatPct === null && acc.muscleMassKg === null) continue;
		await db
			.insert(bodyComposition)
			.values({
				recordedAt: acc.recordedAt,
				weightKg: acc.weightKg,
				bodyFatPct: acc.bodyFatPct,
				muscleMassKg: acc.muscleMassKg,
				source: 'apple_health'
			})
			.onConflictDoUpdate({
				target: [bodyComposition.recordedAt, bodyComposition.source],
				set: {
					// Coalesce so a partial repush doesn't blank existing columns.
					weightKg: sql`coalesce(excluded.weight_kg, ${bodyComposition.weightKg})`,
					bodyFatPct: sql`coalesce(excluded.body_fat_pct, ${bodyComposition.bodyFatPct})`,
					muscleMassKg: sql`coalesce(excluded.muscle_mass_kg, ${bodyComposition.muscleMassKg})`
				}
			});
		written++;
	}
	return written;
}
