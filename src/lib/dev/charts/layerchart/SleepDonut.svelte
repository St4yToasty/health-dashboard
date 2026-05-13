<script lang="ts">
	import { PieChart } from 'layerchart';
	import { sleepStages } from '$lib/dev/chart-fixtures';

	const palette = ['var(--data-1)', 'var(--data-2)', 'var(--data-4)', 'var(--data-3)'];
</script>

<div class="h-[260px] w-full">
	<PieChart
		data={sleepStages}
		key="stage"
		value="minutes"
		label="stage"
		innerRadius={0.62}
		padAngle={0.02}
		cornerRadius={4}
		cRange={palette}
		legend
	/>
</div>
