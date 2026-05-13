<script lang="ts">
	import { VisDonut, VisSingleContainer } from '@unovis/svelte';
	import { sleepStages } from '$lib/dev/chart-fixtures';

	type D = (typeof sleepStages)[number];
	const value = (d: unknown) => (d as D).minutes;
	const palette = ['var(--data-1)', 'var(--data-2)', 'var(--data-4)', 'var(--data-3)'];
</script>

<div class="h-[260px] w-full flex flex-col items-center gap-3">
	<VisSingleContainer data={sleepStages} height={210}>
		<VisDonut
			{value}
			arcWidth={28}
			cornerRadius={4}
			color={(_d: unknown, i: number) => palette[i]}
		/>
	</VisSingleContainer>
	<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(color:--fg-muted)">
		{#each sleepStages as s, i (s.stage)}
			<span class="inline-flex items-center gap-1.5">
				<span class="block size-2.5 rounded-xs" style:background-color={palette[i]}></span>
				{s.stage}
			</span>
		{/each}
	</div>
</div>
