/**
 * Home (`/`) — bento dashboard load + form actions.
 *
 * Every metric the home screen renders is loaded here in parallel and
 * shipped down to the page. Date math is in Europe/Lisbon per CLAUDE.md.
 *
 * Form actions:
 *   ?/addWater — POST with `amount_ml` to insert one water_intake row.
 *
 * Auth shim (Phase 7) will gate everything once it lands; for Phase 4 we
 * trust the request.
 */

import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import {
	bodyComposition,
	dailyActivity,
	dailyNutrition,
	db,
	goalsActive,
	sleepSessions,
	waterIntake
} from '$lib/server/db';
import { lisbonDateOffset, lisbonToday } from '$lib/server/time';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const today = lisbonToday();
	const sevenDaysAgo = lisbonDateOffset(6); // inclusive 7-day window

	const [
		latestWeightRow,
		weightSparkline,
		todayNutrition,
		todayWaterAgg,
		todayActivity,
		latestSleep,
		goals
	] = await Promise.all([
		// Most recent body_composition with a weight value.
		db
			.select({
				recordedAt: bodyComposition.recordedAt,
				weightKg: bodyComposition.weightKg,
				bodyFatPct: bodyComposition.bodyFatPct
			})
			.from(bodyComposition)
			.where(isNotNull(bodyComposition.weightKg))
			.orderBy(desc(bodyComposition.recordedAt))
			.limit(1),

		// Last 7 days of weight for the sparkline.
		db
			.select({
				recordedAt: bodyComposition.recordedAt,
				weightKg: bodyComposition.weightKg
			})
			.from(bodyComposition)
			.where(
				and(
					isNotNull(bodyComposition.weightKg),
					gte(
						sql`(${bodyComposition.recordedAt} at time zone 'Europe/Lisbon')::date`,
						sql`${sevenDaysAgo}::date`
					)
				)
			)
			.orderBy(bodyComposition.recordedAt),

		// Today's calories + protein from the daily_nutrition view.
		db
			.select({
				kcal: dailyNutrition.kcal,
				proteinG: dailyNutrition.proteinG
			})
			.from(dailyNutrition)
			.where(eq(dailyNutrition.day, today))
			.limit(1),

		// Today's water sum.
		db
			.select({
				total: sql<number>`coalesce(sum(${waterIntake.amountMl}), 0)::int`
			})
			.from(waterIntake)
			.where(
				eq(
					sql`(${waterIntake.recordedAt} at time zone 'Europe/Lisbon')::date`,
					sql`${today}::date`
				)
			),

		// Today's daily_activity (steps etc.).
		db
			.select({
				steps: dailyActivity.steps,
				distanceM: dailyActivity.distanceM,
				activeEnergyKcal: dailyActivity.activeEnergyKcal
			})
			.from(dailyActivity)
			.where(eq(dailyActivity.day, today))
			.limit(1),

		// Most recent sleep session.
		db
			.select({
				startedAt: sleepSessions.startedAt,
				endedAt: sleepSessions.endedAt,
				asleepMin: sleepSessions.asleepMin,
				inBedMin: sleepSessions.inBedMin
			})
			.from(sleepSessions)
			.orderBy(desc(sleepSessions.startedAt))
			.limit(1),

		// Active goals via the view.
		db.select().from(goalsActive)
	]);

	const goalFor = (metric: string) => {
		const row = goals.find((g) => g.metric === metric);
		return row ? Number(row.targetValue) : null;
	};

	return {
		today,
		weight: latestWeightRow[0]
			? {
					recordedAt: latestWeightRow[0].recordedAt,
					kg: Number(latestWeightRow[0].weightKg),
					bodyFatPct: latestWeightRow[0].bodyFatPct
						? Number(latestWeightRow[0].bodyFatPct)
						: null
				}
			: null,
		weightSparkline: weightSparkline.map((r) => ({
			date: r.recordedAt,
			value: Number(r.weightKg)
		})),
		nutrition: todayNutrition[0]
			? {
					kcal: Number(todayNutrition[0].kcal),
					proteinG: Number(todayNutrition[0].proteinG)
				}
			: { kcal: 0, proteinG: 0 },
		waterMl: todayWaterAgg[0]?.total ?? 0,
		activity: todayActivity[0] ?? null,
		sleep: latestSleep[0] ?? null,
		goals: {
			daily_calories: goalFor('daily_calories'),
			daily_water_ml: goalFor('daily_water_ml'),
			daily_steps: goalFor('daily_steps'),
			target_weight_kg: goalFor('target_weight_kg'),
			target_weight_date: goals.find((g) => g.metric === 'target_weight_kg')?.targetDate ?? null
		}
	};
};

export const actions: Actions = {
	addWater: async ({ request }) => {
		const form = await request.formData();
		const amountStr = form.get('amount_ml');
		const amount = typeof amountStr === 'string' ? Number(amountStr) : NaN;

		if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
			return fail(400, { addWater: { error: 'invalid_amount' } });
		}

		await db.insert(waterIntake).values({
			recordedAt: new Date(),
			amountMl: Math.round(amount),
			source: 'manual'
		});

		return { addWater: { ok: true, amount: Math.round(amount) } };
	}
};
