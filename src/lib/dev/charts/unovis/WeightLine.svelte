<script lang="ts">
	import { VisArea, VisAxis, VisCrosshair, VisLine, VisTooltip, VisXYContainer } from '@unovis/svelte';
	import { CurveType } from '@unovis/ts';
	import { weight30d } from '$lib/dev/chart-fixtures';

	type D = (typeof weight30d)[number];
	const x = (d: unknown) => (d as D).date.getTime();
	const y = (d: unknown) => (d as D).weight;
</script>

<div class="h-[260px] w-full unovis-themed">
	<VisXYContainer data={weight30d} height={260}>
		<VisArea {x} {y} curveType={CurveType.MonotoneX} color="var(--data-1-subtle)" />
		<VisLine {x} {y} curveType={CurveType.MonotoneX} color="var(--data-1)" lineWidth={2} />
		<VisAxis
			type="x"
			numTicks={4}
			tickFormat={(v: number | Date) =>
				new Date(v as number).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
		/>
		<VisAxis type="y" numTicks={4} />
		<VisCrosshair {x} {y} template={(d: unknown) => `${(d as D).weight} kg`} />
		<VisTooltip />
	</VisXYContainer>
</div>

<style>
	.unovis-themed :global(.vis-axis-tick-label),
	.unovis-themed :global(.vis-axis-domain-line),
	.unovis-themed :global(.vis-axis-tick-line) {
		fill: var(--fg-subtle);
		stroke: var(--border-default);
		font-size: 11px;
	}
	.unovis-themed :global(.vis-axis-grid-line) {
		stroke: var(--border-default);
	}
	.unovis-themed :global(.vis-tooltip) {
		background: var(--bg-surface-elevated);
		border: 1px solid var(--border-default);
		color: var(--fg-default);
		font-size: 12px;
		border-radius: 8px;
	}
</style>
