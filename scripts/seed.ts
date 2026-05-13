/**
 * Seed the local database with realistic fixture data.
 *
 * What it inserts:
 *  - A small foods library (oatmeal, chicken, eggs, banana, etc.)
 *  - 7 days of body composition with a gentle downward weight trend
 *  - 7 days of daily activity (steps, distance, energy)
 *  - 7 days of sleep sessions
 *  - 7 days of meals + meal items (drawn from the foods library)
 *  - Water intake scattered through each day
 *  - Active goals: 1800 kcal, 2500 ml water, 8000 steps, 78 kg by today+90d
 *
 * Idempotent via TRUNCATE-then-insert. Drop the database with
 * `pnpm db:reset` between major schema changes.
 *
 * Run via `pnpm db:seed`.
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema';
import { sql } from 'drizzle-orm';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

const today = new Date();
const dayOffset = (d: number) => {
	const x = new Date(today);
	x.setDate(today.getDate() + d);
	return x;
};
const dateStr = (d: Date) => d.toISOString().slice(0, 10);

console.log('→ truncating all tables');
await db.execute(sql`
	truncate
		body_composition,
		body_measurements,
		foods,
		meals,
		meal_items,
		water_intake,
		daily_activity,
		workouts,
		sleep_sessions,
		goals,
		ingest_events,
		reminder_rules,
		reminder_fires
	restart identity cascade
`);

console.log('→ foods library');
const insertedFoods = await db
	.insert(schema.foods)
	.values([
		{ name: 'Oatmeal (dry)', brand: null, servingGrams: '50', kcal: '190', proteinG: '6.5' },
		{ name: 'Chicken breast (cooked)', brand: null, servingGrams: '100', kcal: '165', proteinG: '31' },
		{ name: 'Eggs (whole)', brand: null, servingGrams: '50', kcal: '72', proteinG: '6.3' },
		{ name: 'Banana', brand: null, servingGrams: '120', kcal: '105', proteinG: '1.3' },
		{ name: 'Greek yogurt 0%', brand: null, servingGrams: '170', kcal: '100', proteinG: '17' },
		{ name: 'White rice (cooked)', brand: null, servingGrams: '150', kcal: '195', proteinG: '4' },
		{ name: 'Olive oil', brand: null, servingGrams: '14', kcal: '120', proteinG: '0' },
		{ name: 'Whey protein shake', brand: null, servingGrams: '30', kcal: '120', proteinG: '24' },
		{ name: 'Almonds', brand: null, servingGrams: '28', kcal: '164', proteinG: '6' },
		{ name: 'Apple', brand: null, servingGrams: '180', kcal: '95', proteinG: '0.5' }
	])
	.returning({ id: schema.foods.id, name: schema.foods.name });

const foodId = (name: string) => {
	const row = insertedFoods.find((f) => f.name === name);
	if (!row) throw new Error(`food not found in seed: ${name}`);
	return row.id;
};

console.log('→ body composition (7 days, slight downward trend)');
for (let i = -6; i <= 0; i++) {
	const day = dayOffset(i);
	day.setHours(7, 30, 0, 0);
	// Trend from 83.4 down to ~82.4
	const weight = (83.4 + i * 0.15).toFixed(1);
	await db.insert(schema.bodyComposition).values({
		recordedAt: day,
		weightKg: weight,
		bodyFatPct: (22.0 + i * 0.03).toFixed(2),
		muscleMassKg: (35.5).toFixed(2),
		bmi: ((Number(weight) / 1.78 / 1.78) as number).toFixed(2),
		source: 'apple_health'
	});
}

console.log('→ daily activity');
for (let i = -6; i <= 0; i++) {
	const d = dayOffset(i);
	await db.insert(schema.dailyActivity).values({
		day: dateStr(d),
		steps: 6500 + Math.round(Math.random() * 4500),
		distanceM: 4800 + Math.round(Math.random() * 3000),
		activeEnergyKcal: 350 + Math.round(Math.random() * 300),
		basalEnergyKcal: 1650,
		flightsClimbed: 4 + Math.round(Math.random() * 12),
		source: 'apple_health'
	});
}

console.log('→ sleep sessions');
for (let i = -6; i <= 0; i++) {
	const start = dayOffset(i - 1); // previous evening
	start.setHours(23, 20, 0, 0);
	const end = dayOffset(i);
	end.setHours(7, 5, 0, 0);
	await db.insert(schema.sleepSessions).values({
		startedAt: start,
		endedAt: end,
		inBedMin: 465,
		asleepMin: 425 + Math.round(Math.random() * 20),
		deepMin: 65 + Math.round(Math.random() * 20),
		remMin: 95 + Math.round(Math.random() * 25),
		coreMin: 220,
		awakeMin: 20 + Math.round(Math.random() * 15),
		source: 'apple_health'
	});
}

console.log('→ meals + meal items (7 days)');
for (let i = -6; i <= 0; i++) {
	// Breakfast: oatmeal + banana
	const breakfast = dayOffset(i);
	breakfast.setHours(8, 0, 0, 0);
	const [b] = await db
		.insert(schema.meals)
		.values({ eatenAt: breakfast, kind: 'breakfast' })
		.returning();
	await db.insert(schema.mealItems).values([
		{ mealId: b.id, foodId: foodId('Oatmeal (dry)'), grams: '50', kcal: '190', proteinG: '6.5' },
		{ mealId: b.id, foodId: foodId('Banana'), grams: '120', kcal: '105', proteinG: '1.3' }
	]);

	// Lunch: chicken + rice + olive oil
	const lunch = dayOffset(i);
	lunch.setHours(13, 0, 0, 0);
	const [l] = await db.insert(schema.meals).values({ eatenAt: lunch, kind: 'lunch' }).returning();
	await db.insert(schema.mealItems).values([
		{ mealId: l.id, foodId: foodId('Chicken breast (cooked)'), grams: '150', kcal: '247', proteinG: '46.5' },
		{ mealId: l.id, foodId: foodId('White rice (cooked)'), grams: '200', kcal: '260', proteinG: '5.3' },
		{ mealId: l.id, foodId: foodId('Olive oil'), grams: '10', kcal: '86', proteinG: '0' }
	]);

	// Dinner: eggs + yogurt
	const dinner = dayOffset(i);
	dinner.setHours(20, 0, 0, 0);
	const [d] = await db.insert(schema.meals).values({ eatenAt: dinner, kind: 'dinner' }).returning();
	await db.insert(schema.mealItems).values([
		{ mealId: d.id, foodId: foodId('Eggs (whole)'), grams: '150', kcal: '216', proteinG: '18.9' },
		{ mealId: d.id, foodId: foodId('Greek yogurt 0%'), grams: '170', kcal: '100', proteinG: '17' }
	]);

	// Optional snack: whey + almonds
	if (i % 2 === 0) {
		const snack = dayOffset(i);
		snack.setHours(16, 30, 0, 0);
		const [s] = await db.insert(schema.meals).values({ eatenAt: snack, kind: 'snack' }).returning();
		await db.insert(schema.mealItems).values([
			{ mealId: s.id, foodId: foodId('Whey protein shake'), grams: '30', kcal: '120', proteinG: '24' },
			{ mealId: s.id, foodId: foodId('Almonds'), grams: '28', kcal: '164', proteinG: '6' }
		]);
	}
}

console.log('→ water intake (scattered through each day)');
for (let i = -6; i <= 0; i++) {
	for (const [hour, ml] of [
		[8, 250],
		[10, 250],
		[12, 500],
		[15, 250],
		[18, 500],
		[20, 250]
	] as const) {
		const t = dayOffset(i);
		t.setHours(hour, Math.round(Math.random() * 30), 0, 0);
		await db.insert(schema.waterIntake).values({
			recordedAt: t,
			amountMl: ml,
			source: 'manual'
		});
	}
}

console.log('→ goals');
await db.insert(schema.goals).values([
	{
		metric: 'daily_calories',
		targetValue: '1800',
		effectiveFrom: dateStr(dayOffset(-30))
	},
	{
		metric: 'daily_water_ml',
		targetValue: '2500',
		effectiveFrom: dateStr(dayOffset(-30))
	},
	{
		metric: 'daily_steps',
		targetValue: '8000',
		effectiveFrom: dateStr(dayOffset(-30))
	},
	{
		metric: 'target_weight_kg',
		targetValue: '78',
		targetDate: dateStr(dayOffset(90)),
		effectiveFrom: dateStr(dayOffset(-30))
	}
]);

console.log('→ checking row counts');
for (const name of [
	'foods',
	'meals',
	'meal_items',
	'water_intake',
	'body_composition',
	'daily_activity',
	'sleep_sessions',
	'goals'
] as const) {
	const result = await db.execute(sql`select count(*)::int as n from ${sql.identifier(name)}`);
	console.log(`  ${name.padEnd(20)} ${(result[0] as { n: number }).n}`);
}

console.log('✓ seed complete');
await client.end();
