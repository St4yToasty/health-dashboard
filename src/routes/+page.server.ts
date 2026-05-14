/**
 * Home (`/`) — bento dashboard load + manual-entry form actions.
 *
 * Every metric the home screen renders is loaded here in parallel and
 * shipped down to the page. Date math is in Europe/Lisbon per CLAUDE.md.
 *
 * Form actions (all server-validated with zod):
 *   ?/addWater             — water_intake row
 *   ?/addWeight            — body_composition row (weight + optional fat/muscle)
 *   ?/addBodyMeasurement   — body_measurements row (any subset of cm fields)
 *
 * Auth shim (Phase 7) will gate everything once it lands; for now we
 * trust the request.
 */

import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import { z } from 'zod';
import {
	bodyComposition,
	bodyMeasurements,
	dailyActivity,
	dailyNutrition,
	db,
	foods,
	goalsActive,
	mealItems,
	meals,
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

		db
			.select({ kcal: dailyNutrition.kcal, proteinG: dailyNutrition.proteinG })
			.from(dailyNutrition)
			.where(eq(dailyNutrition.day, today))
			.limit(1),

		db
			.select({ total: sql<number>`coalesce(sum(${waterIntake.amountMl}), 0)::int` })
			.from(waterIntake)
			.where(
				eq(
					sql`(${waterIntake.recordedAt} at time zone 'Europe/Lisbon')::date`,
					sql`${today}::date`
				)
			),

		db
			.select({
				steps: dailyActivity.steps,
				distanceM: dailyActivity.distanceM,
				activeEnergyKcal: dailyActivity.activeEnergyKcal
			})
			.from(dailyActivity)
			.where(eq(dailyActivity.day, today))
			.limit(1),

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

// ─── Form-action validation schemas ──────────────────────────────────────

const waterSchema = z.object({
	amount_ml: z.coerce.number().int().positive().max(5000)
});

const weightSchema = z.object({
	weight_kg: z.coerce.number().positive().min(20).max(300),
	body_fat_pct: z.coerce.number().min(3).max(60).optional().or(z.literal('').transform(() => undefined)),
	muscle_mass_kg: z.coerce.number().min(10).max(200).optional().or(z.literal('').transform(() => undefined))
});

// Meal payload — comes from MealForm as JSON in a single hidden `items` field
// so we don't have to wrestle with bracketed form-data keys.
const mealItemSchema = z.object({
	foodId: z.number().int().positive(),
	grams: z.number().positive().max(5000)
});
const mealSchema = z.object({
	kind: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
	eaten_at: z.string().min(1), // ISO datetime-local string
	items: z.array(mealItemSchema).min(1).max(20)
});

// All six measurement fields are optional; at least one must be present.
const measurementSchema = z
	.object({
		waist_cm: z.coerce.number().min(10).max(300).optional().or(z.literal('').transform(() => undefined)),
		chest_cm: z.coerce.number().min(10).max(300).optional().or(z.literal('').transform(() => undefined)),
		hips_cm: z.coerce.number().min(10).max(300).optional().or(z.literal('').transform(() => undefined)),
		thigh_cm: z.coerce.number().min(10).max(300).optional().or(z.literal('').transform(() => undefined)),
		arm_cm: z.coerce.number().min(10).max(300).optional().or(z.literal('').transform(() => undefined)),
		neck_cm: z.coerce.number().min(10).max(300).optional().or(z.literal('').transform(() => undefined))
	})
	.refine((v) => Object.values(v).some((x) => x !== undefined), {
		message: 'Fill in at least one measurement.'
	});

// Drizzle's numeric columns want strings; convert at the boundary.
const num = (n: number | undefined): string | null => (n === undefined ? null : String(n));

export const actions: Actions = {
	addWater: async ({ request }) => {
		const parsed = waterSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { addWater: { error: 'invalid_amount' } });
		}
		await db.insert(waterIntake).values({
			recordedAt: new Date(),
			amountMl: parsed.data.amount_ml,
			source: 'manual'
		});
		return { addWater: { ok: true, amount: parsed.data.amount_ml } };
	},

	addWeight: async ({ request }) => {
		const parsed = weightSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { addWeight: { error: 'invalid_input' } });
		}
		const { weight_kg, body_fat_pct, muscle_mass_kg } = parsed.data;
		await db.insert(bodyComposition).values({
			recordedAt: new Date(),
			weightKg: num(weight_kg),
			bodyFatPct: num(body_fat_pct),
			muscleMassKg: num(muscle_mass_kg),
			source: 'manual'
		});
		return { addWeight: { ok: true, weight: weight_kg } };
	},

	addBodyMeasurement: async ({ request }) => {
		const parsed = measurementSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { addBodyMeasurement: { error: 'invalid_input' } });
		}
		const v = parsed.data;
		await db.insert(bodyMeasurements).values({
			recordedAt: new Date(),
			waistCm: num(v.waist_cm),
			chestCm: num(v.chest_cm),
			hipsCm: num(v.hips_cm),
			thighCm: num(v.thigh_cm),
			armCm: num(v.arm_cm),
			neckCm: num(v.neck_cm),
			source: 'manual'
		});
		return { addBodyMeasurement: { ok: true } };
	},

	addMeal: async ({ request }) => {
		const form = await request.formData();
		let payload: unknown;
		try {
			payload = JSON.parse(String(form.get('payload') ?? ''));
		} catch {
			return fail(400, { addMeal: { error: 'invalid_json' } });
		}
		const parsed = mealSchema.safeParse(payload);
		if (!parsed.success) {
			return fail(400, { addMeal: { error: parsed.error.message } });
		}
		const { kind, eaten_at, items } = parsed.data;

		// Look up each food and snapshot its macros at the chosen grams.
		const foodIds = items.map((i) => BigInt(i.foodId));
		const lookups = await db
			.select({
				id: foods.id,
				servingGrams: foods.servingGrams,
				kcal: foods.kcal,
				proteinG: foods.proteinG
			})
			.from(foods)
			.where(sql`${foods.id} in (${sql.join(foodIds, sql`, `)})`);
		const byId = new Map(lookups.map((f) => [Number(f.id), f]));

		// Transaction: one meal row + N meal_items rows.
		const totalKcal = await db.transaction(async (tx) => {
			const inserted = await tx
				.insert(meals)
				.values({ eatenAt: new Date(eaten_at), kind })
				.returning({ id: meals.id });
			const mealId = inserted[0].id;
			let sumKcal = 0;
			const itemRows: (typeof mealItems.$inferInsert)[] = [];
			for (const item of items) {
				const food = byId.get(item.foodId);
				if (!food) continue;
				const ratio = item.grams / Number(food.servingGrams);
				const kcalAmt = Number((Number(food.kcal) * ratio).toFixed(1));
				const proteinAmt = Number((Number(food.proteinG) * ratio).toFixed(1));
				sumKcal += kcalAmt;
				itemRows.push({
					mealId,
					foodId: BigInt(item.foodId),
					grams: String(item.grams),
					kcal: String(kcalAmt),
					proteinG: String(proteinAmt)
				});
			}
			if (itemRows.length > 0) {
				await tx.insert(mealItems).values(itemRows);
			}
			return sumKcal;
		});

		return { addMeal: { ok: true, kcal: Math.round(totalKcal) } };
	}
};
