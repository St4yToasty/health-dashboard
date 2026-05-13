import { relations, sql } from 'drizzle-orm';
import {
	bigint,
	bigserial,
	boolean,
	check,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';
import { mealKind, metricSource } from './enums';

/**
 * Personal food library. User adds an item once and reuses it.
 * Macros are stored "per canonical serving" (e.g. per 100 g, or per 1 egg).
 */
export const foods = pgTable(
	'foods',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		name: text('name').notNull(),
		brand: text('brand'),
		servingGrams: numeric('serving_grams', { precision: 7, scale: 2 }).notNull(),
		kcal: numeric('kcal', { precision: 6, scale: 1 }).notNull(),
		proteinG: numeric('protein_g', { precision: 5, scale: 1 }).notNull(),
		isArchived: boolean('is_archived').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		unique('foods_name_brand_key').on(t.name, t.brand),
		index('foods_name_lower_idx').on(sql`lower(${t.name})`)
	]
);

/** A meal is a logical container for items eaten in the same sitting. */
export const meals = pgTable(
	'meals',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		eatenAt: timestamp('eaten_at', { withTimezone: true }).notNull(),
		kind: mealKind('kind').notNull(),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('meals_eaten_at_idx').on(sql`${t.eatenAt} desc`)]
);

/**
 * Items within a meal. Macros are *snapshot* at log time so editing
 * the parent food row later doesn't retroactively rewrite history.
 */
export const mealItems = pgTable(
	'meal_items',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		mealId: bigint('meal_id', { mode: 'bigint' })
			.notNull()
			.references(() => meals.id, { onDelete: 'cascade' }),
		foodId: bigint('food_id', { mode: 'bigint' })
			.notNull()
			.references(() => foods.id, { onDelete: 'restrict' }),
		grams: numeric('grams', { precision: 7, scale: 2 }).notNull(),
		kcal: numeric('kcal', { precision: 6, scale: 1 }).notNull(),
		proteinG: numeric('protein_g', { precision: 5, scale: 1 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('meal_items_meal_id_idx').on(t.mealId)]
);

export const mealsRelations = relations(meals, ({ many }) => ({
	items: many(mealItems)
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
	meal: one(meals, { fields: [mealItems.mealId], references: [meals.id] }),
	food: one(foods, { fields: [mealItems.foodId], references: [foods.id] })
}));

/**
 * Each row is one logged drink. Primary entry path is the one-tap
 * quick-add tile on the home screen. No unique constraint — drinking
 * water twice in the same minute should produce two rows.
 */
export const waterIntake = pgTable(
	'water_intake',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		amountMl: integer('amount_ml').notNull(),
		source: metricSource('source').notNull().default('manual'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('water_intake_amount_range', sql`${t.amountMl} > 0 and ${t.amountMl} <= 5000`),
		index('water_intake_recorded_at_idx').on(sql`${t.recordedAt} desc`)
	]
);

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type MealItem = typeof mealItems.$inferSelect;
export type NewMealItem = typeof mealItems.$inferInsert;
export type WaterIntake = typeof waterIntake.$inferSelect;
export type NewWaterIntake = typeof waterIntake.$inferInsert;
