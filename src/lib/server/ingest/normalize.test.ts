import { describe, expect, it } from 'vitest';
import { localDay, mapWorkoutKind, parseHaeDate } from './normalize';

describe('parseHaeDate', () => {
	it('parses canonical HAE format', () => {
		const d = parseHaeDate('2026-05-13 07:42:00 +0100');
		expect(d).not.toBeNull();
		// 07:42 +01:00 → 06:42 UTC
		expect(d!.toISOString()).toBe('2026-05-13T06:42:00.000Z');
	});

	it('parses negative offsets', () => {
		const d = parseHaeDate('2026-01-15 18:30:00 -0500');
		expect(d!.toISOString()).toBe('2026-01-15T23:30:00.000Z');
	});

	it('returns null for non-string', () => {
		expect(parseHaeDate(undefined as unknown as string)).toBeNull();
	});

	it('returns null for garbage', () => {
		expect(parseHaeDate('not a date')).toBeNull();
	});
});

describe('mapWorkoutKind', () => {
	const cases: [string | undefined, string][] = [
		['Walking', 'walking'],
		['Running', 'running'],
		['Outdoor Run', 'running'],
		['Cycling', 'cycling'],
		['Indoor Cycle', 'cycling'],
		['Biking', 'cycling'],
		['Strength Training', 'strength'],
		['Weight Lifting', 'strength'],
		['High Intensity Interval Training', 'hiit'],
		['HIIT', 'hiit'],
		['Yoga', 'yoga'],
		['Swimming', 'swimming'],
		['Pickleball', 'other'],
		['', 'other'],
		[undefined, 'other']
	];
	for (const [input, expected] of cases) {
		it(`${JSON.stringify(input)} → ${expected}`, () => {
			expect(mapWorkoutKind(input)).toBe(expected);
		});
	}
});

describe('localDay', () => {
	it('buckets to Europe/Lisbon date', () => {
		// 2026-03-29 01:30 UTC is 2026-03-29 02:30 Lisbon (post-DST jump to +01)
		// — still the 29th.
		const utc = new Date('2026-03-29T01:30:00.000Z');
		expect(localDay(utc)).toBe('2026-03-29');
	});

	it('handles UTC late evening crossing into next-day Lisbon', () => {
		// In winter (Lisbon = UTC), 23:30 UTC stays on the same day.
		// But 23:30 UTC on a +01:00 day is 00:30 the next day Lisbon.
		// Pick a summer date.
		const utc = new Date('2026-06-15T23:30:00.000Z');
		expect(localDay(utc)).toBe('2026-06-16');
	});
});
