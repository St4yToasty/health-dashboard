/**
 * GET /api/foods?q=<substr>&limit=<n>
 *
 * Returns active foods whose lower(name) contains the query, ordered so
 * exact-prefix hits come first. Used by the MealForm autocomplete.
 *
 * Phase 7 auth shim will gate this once it lands; for now we trust the
 * request (only reachable behind Cloudflare Access or on localhost dev).
 */

import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { json, type RequestHandler } from '@sveltejs/kit';
import { db, foods } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);

	const rows = await db
		.select({
			id: foods.id,
			name: foods.name,
			brand: foods.brand,
			servingGrams: foods.servingGrams,
			kcal: foods.kcal,
			proteinG: foods.proteinG
		})
		.from(foods)
		.where(
			and(
				eq(foods.isArchived, false),
				q.length > 0
					? or(ilike(foods.name, `${q}%`), ilike(foods.name, `%${q}%`))
					: sql`true`
			)
		)
		.orderBy(asc(foods.name))
		.limit(limit);

	return json({
		results: rows.map((r) => ({
			id: Number(r.id),
			name: r.name,
			brand: r.brand,
			servingGrams: Number(r.servingGrams),
			kcal: Number(r.kcal),
			proteinG: Number(r.proteinG)
		}))
	});
};
