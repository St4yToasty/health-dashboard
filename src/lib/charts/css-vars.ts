/**
 * Resolve CSS custom properties at runtime into hex/rgba strings.
 *
 * JS-driven chart libraries (ECharts, anything that paints to canvas/SVG
 * programmatically) need concrete color values, not Tailwind utility
 * classes. This helper reads our design tokens from `:root` at the point
 * of call and hands them off.
 *
 * Theme reactivity: a snapshot is just that — a snapshot. Components that
 * need to re-render on theme switch must call `chartTokens()` again and
 * push the new values into the chart (e.g. via `chart.setOption(...)`).
 * For Phase 3 we mount once and accept that switching theme requires a
 * route reload; Phase 4+ may add a reactive store if needed.
 *
 * SSR-safe: returns the fallback on the server.
 */

export function cssVar(name: string, fallback = '#888'): string {
	if (typeof window === 'undefined') return fallback;
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
}

/** Snapshot every chart-relevant token in one call. */
export function chartTokens() {
	return {
		fg: cssVar('--fg-default', '#ededef'),
		fgMuted: cssVar('--fg-muted', '#a1a1aa'),
		fgSubtle: cssVar('--fg-subtle', '#71717a'),
		border: cssVar('--border-default', 'rgba(255,255,255,0.08)'),
		surface: cssVar('--bg-surface', '#141416'),
		surfaceElevated: cssVar('--bg-surface-elevated', '#1c1c1f'),
		accent: cssVar('--accent', '#6366f1'),
		data1: cssVar('--data-1', '#6366f1'),
		data2: cssVar('--data-2', '#22c55e'),
		data3: cssVar('--data-3', '#f59e0b'),
		data4: cssVar('--data-4', '#38bdf8'),
		data5: cssVar('--data-5', '#ec4899'),
		data6: cssVar('--data-6', '#a855f7'),
		data7: cssVar('--data-7', '#14b8a6'),
		data1Subtle: cssVar('--data-1-subtle', 'rgba(99,102,241,0.18)'),
		data2Subtle: cssVar('--data-2-subtle', 'rgba(34,197,94,0.18)'),
		data3Subtle: cssVar('--data-3-subtle', 'rgba(245,158,11,0.18)'),
		data4Subtle: cssVar('--data-4-subtle', 'rgba(56,189,248,0.18)'),
		data5Subtle: cssVar('--data-5-subtle', 'rgba(236,72,153,0.18)'),
		data6Subtle: cssVar('--data-6-subtle', 'rgba(168,85,247,0.18)'),
		data7Subtle: cssVar('--data-7-subtle', 'rgba(20,184,166,0.18)')
	};
}

export type ChartTokens = ReturnType<typeof chartTokens>;

/**
 * Per-metric default color mapping per design-system/MASTER.md §8.1.
 * The Sparkline component (and any future chart) reads this so changing
 * a metric's color is one line, not a sweep through every component.
 *
 * Returns the *base* var name (without `-subtle`). Subtle variants are
 * derived by appending `-subtle` when needed.
 */
export const METRIC_COLOR_VAR: Record<string, string> = {
	weight: '--data-1',
	body_fat: '--data-1',
	protein: '--data-2',
	steps: '--data-2',
	water: '--data-2',
	calories: '--data-3',
	sleep: '--data-4',
	workouts: '--data-5',
	hr: '--data-6'
};
