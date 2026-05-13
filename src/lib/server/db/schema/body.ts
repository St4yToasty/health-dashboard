import { sql } from 'drizzle-orm';
import {
	bigserial,
	check,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';
import { metricSource } from './enums';

/**
 * Smart-scale + manual entries: weight, body fat %, lean mass, BMI.
 * One row per measurement. Unique on (recorded_at, source) so HAE
 * re-pushes upsert instead of duplicating.
 */
export const bodyComposition = pgTable(
	'body_composition',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
		bodyFatPct: numeric('body_fat_pct', { precision: 4, scale: 2 }),
		muscleMassKg: numeric('muscle_mass_kg', { precision: 5, scale: 2 }),
		bmi: numeric('bmi', { precision: 4, scale: 2 }),
		source: metricSource('source').notNull(),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check(
			'body_composition_at_least_one_value',
			sql`${t.weightKg} is not null or ${t.bodyFatPct} is not null or ${t.muscleMassKg} is not null`
		),
		unique('body_composition_recorded_at_source_key').on(t.recordedAt, t.source),
		index('body_composition_recorded_at_idx').on(sql`${t.recordedAt} desc`)
	]
);

/**
 * Tape-measure measurements (waist, chest, etc.). Always manual,
 * lower frequency than weight. Every column nullable so partial
 * entries (e.g. waist-only days) are valid.
 */
export const bodyMeasurements = pgTable(
	'body_measurements',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		waistCm: numeric('waist_cm', { precision: 5, scale: 1 }),
		chestCm: numeric('chest_cm', { precision: 5, scale: 1 }),
		hipsCm: numeric('hips_cm', { precision: 5, scale: 1 }),
		thighCm: numeric('thigh_cm', { precision: 5, scale: 1 }),
		armCm: numeric('arm_cm', { precision: 5, scale: 1 }),
		neckCm: numeric('neck_cm', { precision: 5, scale: 1 }),
		source: metricSource('source').notNull().default('manual'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check(
			'body_measurements_at_least_one',
			sql`coalesce(${t.waistCm}, ${t.chestCm}, ${t.hipsCm}, ${t.thighCm}, ${t.armCm}, ${t.neckCm}) is not null`
		),
		unique('body_measurements_recorded_at_source_key').on(t.recordedAt, t.source)
	]
);

export type BodyComposition = typeof bodyComposition.$inferSelect;
export type NewBodyComposition = typeof bodyComposition.$inferInsert;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;
