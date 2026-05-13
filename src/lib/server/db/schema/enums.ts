import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Where a row originated. See docs/DATA_MODEL.md §Conventions.
 *
 * - `apple_health` — from HealthAutoExport auto-sync
 * - `manual` — entered in the dashboard UI
 * - `import` — one-time bulk import (e.g. MyFitnessPal CSV in v2)
 * - `derived` — computed from other rows (e.g. BMI from weight + height)
 */
export const metricSource = pgEnum('metric_source', [
	'apple_health',
	'manual',
	'import',
	'derived'
]);

export const mealKind = pgEnum('meal_kind', ['breakfast', 'lunch', 'dinner', 'snack']);

export const workoutKind = pgEnum('workout_kind', [
	'walking',
	'running',
	'cycling',
	'strength',
	'hiit',
	'yoga',
	'swimming',
	'other'
]);

/**
 * Sleep stages tracked by Apple Health.
 * Kept as an enum even though we currently model stage durations as integer
 * columns on sleep_sessions — reserved for future per-interval rows in v2.
 */
export const sleepStage = pgEnum('sleep_stage', [
	'in_bed',
	'asleep',
	'core',
	'deep',
	'rem',
	'awake'
]);

/**
 * Goal metrics that the goals table can target. Adding a new metric here
 * is a migration; new entries should land at the end of the list so existing
 * enum ordinals don't shift.
 */
export const goalMetric = pgEnum('goal_metric', [
	'daily_calories',
	'daily_water_ml',
	'daily_steps',
	'target_weight_kg'
]);
