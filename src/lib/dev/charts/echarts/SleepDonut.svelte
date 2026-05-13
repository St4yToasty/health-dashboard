<script lang="ts">
	import { onMount } from 'svelte';
	import { sleepStages } from '$lib/dev/chart-fixtures';
	import { chartTokens } from '../css-vars';

	let container: HTMLDivElement;

	onMount(() => {
		let chart: { resize: () => void; dispose: () => void; setOption: (opts: object) => void } | null = null;
		let ro: ResizeObserver | null = null;

		(async () => {
			const echarts = await import('echarts/core');
			const { PieChart } = await import('echarts/charts');
			const { LegendComponent, TooltipComponent } = await import('echarts/components');
			const { SVGRenderer } = await import('echarts/renderers');
			echarts.use([PieChart, LegendComponent, TooltipComponent, SVGRenderer]);

			const t = chartTokens();
			const palette = [t.data1, t.data2, t.data4, t.data3];
			chart = echarts.init(container, null, { renderer: 'svg' });
			chart!.setOption({
				tooltip: {
					backgroundColor: t.surfaceElevated,
					borderColor: t.border,
					textStyle: { color: t.fg, fontSize: 12 }
				},
				legend: {
					bottom: 0,
					textStyle: { color: t.fgMuted, fontSize: 11 },
					itemWidth: 10,
					itemHeight: 10
				},
				series: [
					{
						type: 'pie',
						radius: ['52%', '78%'],
						avoidLabelOverlap: false,
						itemStyle: { borderColor: t.surface, borderWidth: 2 },
						label: { show: false },
						data: sleepStages.map((s, i) => ({
							name: s.stage,
							value: s.minutes,
							itemStyle: { color: palette[i] }
						}))
					}
				]
			});

			ro = new ResizeObserver(() => chart?.resize());
			ro.observe(container);
		})();

		return () => {
			ro?.disconnect();
			chart?.dispose();
		};
	});
</script>

<div bind:this={container} class="h-[260px] w-full"></div>
