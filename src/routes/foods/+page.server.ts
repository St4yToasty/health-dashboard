/**
 * /foods — personal food library.
 *
 * Lists every food row in the library (active first, archived collapsed
 * underneath). Three form actions:
 *
 *   ?/createFood   — insert a new row
 *   ?/updateFood   — edit an existing row (macros snapshot in meal_items
 *                    are preserved by design — see DATA_MODEL.md §nutrition)
 *   ?/archiveFood  — soft-hide (is_archived = true). Hard delete is blocked
 *                    by the FK from meal_items, which is intentional.
 */

import { asc, eq } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import { z } from 'zod';
import { db, foods } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const all = await db
		.select()
		.from(foods)
		.orderBy(asc(foods.isArchived), asc(foods.name));
	return {
		foods: all.map((f) => ({
			id: Number(f.id),
			name: f.name,
			brand: f.brand,
			servingGrams: Number(f.servingGrams),
			kcal: Number(f.kcal),
			proteinG: Number(f.proteinG),
			isArchived: f.isArchived,
			updatedAt: f.updatedAt
		}))
	};
};

const baseSchema = z.object({
	name: z.string().trim().min(1).max(200),
	brand: z
		.string()
		.trim()
		.max(200)
		.optional()
		.transform((v) => (v === '' || v === undefined ? null : v)),
	serving_grams: z.coerce.number().positive().max(99999),
	kcal: z.coerce.number().nonnegative().max(99999),
	protein_g: z.coerce.number().nonnegative().max(9999)
});

const createSchema = baseSchema;
const updateSchema = baseSchema.extend({ id: z.coerce.number().int().positive() });
const archiveSchema = z.object({
	id: z.coerce.number().int().positive(),
	is_archived: z
		.string()
		.optional()
		.transform((v) => v === 'true')
});

const num = (n: number): string => String(n);

export const actions: Actions = {
	createFood: async ({ request }) => {
		const parsed = createSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { createFood: { error: parsed.error.message } });
		}
		const d = parsed.data;
		try {
			await db.insert(foods).values({
				name: d.name,
				brand: d.brand,
				servingGrams: num(d.serving_grams),
				kcal: num(d.kcal),
				proteinG: num(d.protein_g)
			});
		} catch (err) {
			return fail(400, {
				createFood: { error: err instanceof Error ? err.message : 'duplicate or invalid' }
			});
		}
		return { createFood: { ok: true } };
	},

	updateFood: async ({ request }) => {
		const parsed = updateSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { updateFood: { error: parsed.error.message } });
		}
		const d = parsed.data;
		await db
			.update(foods)
			.set({
				name: d.name,
				brand: d.brand,
				servingGrams: num(d.serving_grams),
				kcal: num(d.kcal),
				proteinG: num(d.protein_g),
				updatedAt: new Date()
			})
			.where(eq(foods.id, BigInt(d.id)));
		return { updateFood: { ok: true } };
	},

	archiveFood: async ({ request }) => {
		const parsed = archiveSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { archiveFood: { error: 'invalid' } });
		await db
			.update(foods)
			.set({ isArchived: parsed.data.is_archived, updatedAt: new Date() })
			.where(eq(foods.id, BigInt(parsed.data.id)));
		return { archiveFood: { ok: true } };
	}
};
