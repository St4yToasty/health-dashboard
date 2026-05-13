/**
 * HealthAutoExport payload shape — what we expect to receive on /api/ingest.
 *
 * HAE's actual JSON has many more fields per metric (units, qty, source,
 * sometimes Avg/Min/Max etc.) and the set varies by metric type. We only
 * type the bits we read; anything else stays untyped so we don't lie about
 * HAE's contract.
 *
 * See docs/INGEST.md for the canonical mapping and example payloads.
 */

/** Single data point inside an HAE metric `data` array. */
export interface HaeMetricPoint {
	/** "YYYY-MM-DD HH:MM:SS ±HHMM" — local time with TZ offset. */
	date: string;
	/** Numeric value in the metric's `units`. May be missing for some weird metrics. */
	qty?: number;
	/** Original device that wrote the row into Apple Health (e.g. "Withings", "Huawei Health"). */
	source?: string;
}

/** A single quantity-type metric in HAE's `metrics[]`. */
export interface HaeMetric {
	/** HAE's internal metric name. See `INGESTABLE_METRICS` below. */
	name: string;
	units?: string;
	data?: HaeMetricPoint[];
}

/** A workout session entry in HAE's `workouts[]`. */
export interface HaeWorkout {
	name?: string;
	start: string;
	end: string;
	totalActiveEnergyBurned?: { qty?: number; units?: string };
	totalDistance?: { qty?: number; units?: string };
	avgHeartRate?: { qty?: number; units?: string };
	maxHeartRate?: { qty?: number; units?: string };
	source?: string;
}

/** A sleep session in HAE's `sleep_analysis[]`. Minutes per stage. */
export interface HaeSleepSession {
	startDate: string;
	endDate: string;
	inBed?: number;
	asleep?: number;
	deep?: number;
	rem?: number;
	core?: number;
	awake?: number;
	source?: string;
}

/** Top-level HAE payload. Every sub-key is optional — HAE only includes what's present in the window. */
export interface HaePayload {
	data: {
		metrics?: HaeMetric[];
		workouts?: HaeWorkout[];
		sleep_analysis?: HaeSleepSession[];
	};
}

/** Names we recognise in `metrics[]`. Anything else is silently ignored. */
export const INGESTABLE_METRICS = [
	'weight_body_mass',
	'body_fat_percentage',
	'lean_body_mass',
	'dietary_water',
	'step_count',
	'distance_walking_running',
	'active_energy',
	'basal_energy_burned',
	'flights_climbed'
] as const;
export type IngestableMetricName = (typeof INGESTABLE_METRICS)[number];

export function isIngestableMetric(name: string): name is IngestableMetricName {
	return (INGESTABLE_METRICS as readonly string[]).includes(name);
}

/**
 * Cheap structural guard for the top-level shape. Doesn't validate every
 * nested field — mappers do their own light validation per row.
 *
 * Returns null if the shape doesn't look like HAE at all.
 */
export function asHaePayload(input: unknown): HaePayload | null {
	if (typeof input !== 'object' || input === null) return null;
	const obj = input as Record<string, unknown>;
	if (typeof obj.data !== 'object' || obj.data === null) return null;
	const d = obj.data as Record<string, unknown>;
	const okMetrics = d.metrics === undefined || Array.isArray(d.metrics);
	const okWorkouts = d.workouts === undefined || Array.isArray(d.workouts);
	const okSleep = d.sleep_analysis === undefined || Array.isArray(d.sleep_analysis);
	if (!okMetrics || !okWorkouts || !okSleep) return null;
	return input as HaePayload;
}

/** Per-category counts of rows actually written. Returned by apply(). */
export interface IngestSummary {
	bodyComposition: number;
	waterIntake: number;
	dailyActivity: number;
	workouts: number;
	sleepSessions: number;
	errors: { category: string; message: string }[];
}

export const emptySummary = (): IngestSummary => ({
	bodyComposition: 0,
	waterIntake: 0,
	dailyActivity: 0,
	workouts: 0,
	sleepSessions: 0,
	errors: []
});
