import { sql } from 'drizzle-orm';
import { date, numeric, pgView } from 'drizzle-orm/pg-core';
import { goalMetric } from './enums';

/**
 * Daily nutrition totals, bucketed by the user's local time zone.
 * `meals.eaten_at` is timestamptz (UTC); we bucket at `Europe/Lisbon`.
 *
 * Generated as a regular Postgres view (not materialized) — write volume
 * is low enough that re-computing on every read is fine, and we avoid
 * the staleness/refresh dance.
 */
export const dailyNutrition = pgView('daily_nutrition', {
	day: date('day').notNull(),
	kcal: numeric('kcal', { precision: 7, scale: 1 }).notNull(),
	proteinG: numeric('protein_g', { precision: 6, scale: 1 }).notNull(),
	mealCount: numeric('meal_count').notNull()
}).as(
	sql`
		select
			date_trunc('day', m.eaten_at at time zone 'Europe/Lisbon')::date as day,
			sum(mi.kcal)::numeric(7, 1) as kcal,
			sum(mi.protein_g)::numeric(6, 1) as protein_g,
			count(distinct m.id) as meal_count
		from meals m
		join meal_items mi on mi.meal_id = m.id
		group by 1
	`
);

/**
 * The currently-active goal per metric. Resolves "as of today" using
 * `current_date` against the goal's effective window.
 *
 * `distinct on (metric)` + `order by metric, effective_from desc` returns
 * the most recently-effective row for each metric, which is the one we
 * want when multiple windows overlap (the GiST exclusion constraint
 * forbids overlaps in practice, but the ordering keeps the query robust).
 */
export const goalsActive = pgView('goals_active', {
	metric: goalMetric('metric').notNull(),
	targetValue: numeric('target_value', { precision: 8, scale: 2 }).notNull(),
	targetDate: date('target_date'),
	effectiveFrom: date('effective_from').notNull(),
	effectiveTo: date('effective_to')
}).as(
	sql`
		select distinct on (metric)
			metric,
			target_value,
			target_date,
			effective_from,
			effective_to
		from goals
		where current_date >= effective_from
			and (effective_to is null or current_date < effective_to)
		order by metric, effective_from desc
	`
);
