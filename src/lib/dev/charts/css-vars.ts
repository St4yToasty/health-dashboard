/**
 * Reads CSS custom properties from :root at runtime.
 * Used by chart libraries (ECharts, Unovis) that take resolved color
 * strings, not Tailwind classes.
 *
 * Spike-only — when we commit to a final library, we'll wire theme-aware
 * color resolution properly. For now this snapshots at mount and ignores
 * runtime theme switches.
 */
export function cssVar(name: string, fallback = '#888'): string {
	if (typeof window === 'undefined') return fallback;
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
}

/** Snapshot every token the chart shootout needs in one call. */
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
		data1Subtle: cssVar('--data-1-subtle', 'rgba(99,102,241,0.18)'),
		data2Subtle: cssVar('--data-2-subtle', 'rgba(34,197,94,0.18)')
	};
}
