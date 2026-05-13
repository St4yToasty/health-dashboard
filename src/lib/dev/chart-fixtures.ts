/**
 * Plain-data fixtures used by the chart-library shootout at /dev/charts.
 *
 * Same data feeds every library so the only thing that varies between
 * panels is the library's rendering. Numbers chosen to look realistic for
 * a weight-loss tracker.
 */

const today = new Date('2026-05-13T00:00:00Z');
const day = (offset: number) => {
	const d = new Date(today);
	d.setUTCDate(today.getUTCDate() + offset);
	return d;
};

/** 30-day weight series with gentle downward trend + day-to-day noise. */
export const weight30d = Array.from({ length: 30 }, (_, i) => {
	const offset = i - 29;
	const trend = 84.5 + offset * 0.07; // 0.07 kg/day deficit
	const noise = Math.sin(i * 1.3) * 0.25 + (i % 5 === 0 ? -0.4 : 0);
	return { date: day(offset), weight: Number((trend + noise).toFixed(2)) };
});

/** Goal: 78 kg in ~90 days, drawn as a horizontal target line on the chart. */
export const weightGoalKg = 78;

/** 14 days of step counts vs an 8000 step goal. */
export const steps14d = Array.from({ length: 14 }, (_, i) => {
	const offset = i - 13;
	const base = 6500 + Math.sin(i * 1.7) * 1500 + (i % 3 === 0 ? 1800 : 0);
	return { date: day(offset), steps: Math.round(base) };
});
export const stepGoal = 8000;

/** 7-day weight sparkline (last 7 entries of the 30-day series). */
export const weight7d = weight30d.slice(-7);

/** Sleep stage breakdown for last night (minutes). For donut/pie comparison. */
export const sleepStages = [
	{ stage: 'Deep', minutes: 78, color: 'var(--data-1)' },
	{ stage: 'REM', minutes: 104, color: 'var(--data-2)' },
	{ stage: 'Core', minutes: 210, color: 'var(--data-4)' },
	{ stage: 'Awake', minutes: 28, color: 'var(--data-3)' }
];

/** Bundle size hints shown in the shootout header (post-tree-shake estimates). */
export const libraryNotes = [
	{
		name: 'LayerChart',
		bundle: '~35 KB gz',
		api: 'Declarative Svelte components, slot-based composition',
		theme: 'Tailwind utility classes; consumes our --data-N vars naturally'
	},
	{
		name: 'ECharts (svelte-echarts)',
		bundle: '~150 KB gz',
		api: 'Pass a single `options` object; imperative under the hood',
		theme: 'Needs a theme JSON; defaults look "ECharts-y" until restyled'
	},
	{
		name: '@unovis/svelte',
		bundle: '~60 KB gz',
		api: 'Declarative Svelte components; accessor-function style',
		theme: 'CSS vars supported; defaults look more "Unovis" than minimal'
	}
];
