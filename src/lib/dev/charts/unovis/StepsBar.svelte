<script lang="ts">
	import { VisAxis, VisGroupedBar, VisTooltip, VisXYContainer } from '@unovis/svelte';
	import { steps14d } from '$lib/dev/chart-fixtures';

	type D = (typeof steps14d)[number];
	const x = (_d: unknown, i: number) => i;
	const y = (d: unknown) => (d as D).steps;
</script>

<div class="h-[260px] w-full unovis-themed">
	<VisXYContainer data={steps14d} height={260}>
		<VisGroupedBar {x} {y} color="var(--data-2)" roundedCorners={4} />
		<VisAxis
			type="x"
			numTicks={steps14d.length}
			tickFormat={(_v: number | Date, i: number) =>
				steps14d[i]?.date.toLocaleDateString('en', { weekday: 'narrow' }) ?? ''}
		/>
		<VisAxis
			type="y"
			numTicks={4}
			tickFormat={(v: number | Date) => `${(v as number) / 1000}k`}
		/>
		<VisTooltip />
	</VisXYContainer>
</div>

<style>
	.unovis-themed :global(.vis-axis-tick-label) {
		fill: var(--fg-subtle);
		font-size: 11px;
	}
	.unovis-themed :global(.vis-axis-grid-line) {
		stroke: var(--border-default);
	}
</style>
