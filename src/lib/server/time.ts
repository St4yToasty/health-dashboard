/**
 * Time-zone helpers for server-side queries. The dashboard's day boundary
 * is always Europe/Lisbon (see CLAUDE.md "Conventions"); raw timestamps in
 * the DB are UTC, and we convert at query time.
 *
 * Server-only — these helpers don't depend on browser APIs, but they're
 * intended for `+page.server.ts` and other backend code.
 */

const TZ = 'Europe/Lisbon';

/** Current date in Europe/Lisbon, formatted "YYYY-MM-DD". */
export function lisbonToday(now: Date = new Date()): string {
	// en-CA happens to format dates exactly as "YYYY-MM-DD".
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
}

/** Date `daysAgo` days before today, formatted "YYYY-MM-DD". */
export function lisbonDateOffset(daysAgo: number, now: Date = new Date()): string {
	const d = new Date(now);
	d.setUTCDate(d.getUTCDate() - daysAgo);
	return lisbonToday(d);
}
