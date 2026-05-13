import { sql } from 'drizzle-orm';
import {
	bigserial,
	check,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';
import { metricSource, workoutKind } from './enums';

/**
 * Daily aggregates from HAE: steps, distance, active and basal energy.
 * One row per day per source. Re-pushes for "today" simply overwrite,
 * since HAE keeps recalculating it until the day rolls over.
 */
export const dailyActivity = pgTable(
	'daily_activity',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		day: date('day').notNull(),
		steps: integer('steps'),
		distanceM: integer('distance_m'),
		activeEnergyKcal: integer('active_energy_kcal'),
		basalEnergyKcal: integer('basal_energy_kcal'),
		flightsClimbed: integer('flights_climbed'),
		source: metricSource('source').notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		unique('daily_activity_day_source_key').on(t.day, t.source),
		index('daily_activity_day_idx').on(sql`${t.day} desc`)
	]
);

/** Discrete workout sessions from HAE. Unique on start + kind + source. */
export const workouts = pgTable(
	'workouts',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
		kind: workoutKind('kind').notNull(),
		activeEnergyKcal: integer('active_energy_kcal'),
		distanceM: integer('distance_m'),
		avgHr: integer('avg_hr'),
		maxHr: integer('max_hr'),
		notes: text('notes'),
		source: metricSource('source').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('workouts_time_order', sql`${t.endedAt} > ${t.startedAt}`),
		unique('workouts_started_kind_source_key').on(t.startedAt, t.kind, t.source),
		index('workouts_started_at_idx').on(sql`${t.startedAt} desc`)
	]
);

/**
 * One row per sleep session. Typically one per night, sometimes naps.
 * Stage-level columns are nullable because Huawei Band 9 + Sleep Cycle
 * may not always expose every stage.
 */
export const sleepSessions = pgTable(
	'sleep_sessions',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
		inBedMin: integer('in_bed_min'),
		asleepMin: integer('asleep_min'),
		deepMin: integer('deep_min'),
		remMin: integer('rem_min'),
		coreMin: integer('core_min'),
		awakeMin: integer('awake_min'),
		source: metricSource('source').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('sleep_sessions_time_order', sql`${t.endedAt} > ${t.startedAt}`),
		unique('sleep_sessions_started_source_key').on(t.startedAt, t.source),
		index('sleep_sessions_started_at_idx').on(sql`${t.startedAt} desc`)
	]
);

export type DailyActivity = typeof dailyActivity.$inferSelect;
export type NewDailyActivity = typeof dailyActivity.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type SleepSession = typeof sleepSessions.$inferSelect;
export type NewSleepSession = typeof sleepSessions.$inferInsert;
