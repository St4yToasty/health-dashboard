<script lang="ts">
	import { VisArea, VisLine, VisXYContainer } from '@unovis/svelte';
	import { CurveType } from '@unovis/ts';
	import { weight7d } from '$lib/dev/chart-fixtures';

	type D = (typeof weight7d)[number];
	const x = (d: unknown) => (d as D).date.getTime();
	const y = (d: unknown) => (d as D).weight;
</script>

<div class="h-[40px] w-full">
	<VisXYContainer data={weight7d} height={40} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
		<VisArea {x} {y} curveType={CurveType.MonotoneX} color="var(--data-1-subtle)" />
		<VisLine {x} {y} curveType={CurveType.MonotoneX} color="var(--data-1)" lineWidth={2} />
	</VisXYContainer>
</div>
