/**
 * Helpers for normalising HAE inputs into shapes our DB layer wants.
 */

import type { workoutKind } from '$lib/server/db/schema';

type WorkoutKind = (typeof workoutKind.enumValues)[number];

/**
 * HAE timestamps look like:  "2026-05-13 07:42:00 +0100"
 *
 * Node's Date constructor parses that on V8 but the format is not part of
 * the ECMAScript spec, so we normalise to ISO 8601 first to keep things
 * predictable across runtimes.
 *
 * Returns null on garbage input; callers should skip the row.
 */
export function parseHaeDate(s: string): Date | null {
	if (typeof s !== 'string') return null;
	const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/);
	const iso = m ? `${m[1]}T${m[2]}${m[3]}:${m[4]}` : s;
	const d = new Date(iso);
	return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Convert a Date to its `YYYY-MM-DD` representation in `Europe/Lisbon`.
 * Used to bucket HAE's daily-aggregate rows correctly across DST.
 */
export function localDay(d: Date, timeZone = 'Europe/Lisbon'): string {
	// Intl.DateTimeFormat with en-CA yields "YYYY-MM-DD" exactly.
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/**
 * HAE workout names are free-form ("Walking", "Strength Training",
 * "High Intensity Interval Training", ...) — collapse them to our enum.
 * Anything we don't recognise falls back to 'other' rather than failing.
 */
export function mapWorkoutKind(name: string | undefined | null): WorkoutKind {
	if (!name) return 'other';
	const n = name.toLowerCase();
	if (n.includes('walk')) return 'walking';
	if (n.includes('run')) return 'running';
	// `cycl` matches both "Cycle" and "Cycling"; the explicit `bike`/`biking` covers Apple Health's alternative naming.
	if (n.includes('cycl') || n.includes('bike') || n.includes('biking')) return 'cycling';
	if (n.includes('strength') || n.includes('lifting') || n.includes('weight')) return 'strength';
	if (n.includes('hiit') || n.includes('interval')) return 'hiit';
	if (n.includes('yoga')) return 'yoga';
	if (n.includes('swim')) return 'swimming';
	return 'other';
}

/**
 * Convert a possibly-undefined number into a string suitable for Drizzle's
 * `numeric` columns, or null if absent. Drizzle expects `numeric` values as
 * strings so we don't lose precision through the JS double.
 */
export function num(v: number | undefined | null): string | null {
	if (v === undefined || v === null || !Number.isFinite(v)) return null;
	return String(v);
}

/** Integer flavour of {@link num} — for `integer` columns. */
export function int(v: number | undefined | null): number | null {
	if (v === undefined || v === null || !Number.isFinite(v)) return null;
	return Math.round(v);
}
