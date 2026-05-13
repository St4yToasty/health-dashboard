<script lang="ts">
	import { onMount } from 'svelte';
	import { steps14d } from '$lib/dev/chart-fixtures';
	import { chartTokens } from '../css-vars';

	let container: HTMLDivElement;

	onMount(() => {
		let chart: { resize: () => void; dispose: () => void; setOption: (opts: object) => void } | null = null;
		let ro: ResizeObserver | null = null;

		(async () => {
			const echarts = await import('echarts/core');
			const { BarChart } = await import('echarts/charts');
			const { GridComponent, TooltipComponent } = await import('echarts/components');
			const { SVGRenderer } = await import('echarts/renderers');
			echarts.use([BarChart, GridComponent, TooltipComponent, SVGRenderer]);

			const t = chartTokens();
			chart = echarts.init(container, null, { renderer: 'svg' });
			chart!.setOption({
				grid: { left: 40, right: 8, top: 8, bottom: 28 },
				tooltip: {
					trigger: 'axis',
					backgroundColor: t.surfaceElevated,
					borderColor: t.border,
					textStyle: { color: t.fg, fontSize: 12 }
				},
				xAxis: {
					type: 'category',
					data: steps14d.map((d) => d.date.toLocaleDateString('en', { weekday: 'narrow' })),
					axisLine: { show: false },
					axisTick: { show: false },
					axisLabel: { color: t.fgSubtle, fontSize: 11 }
				},
				yAxis: {
					type: 'value',
					axisLine: { show: false },
					axisLabel: {
						color: t.fgSubtle,
						fontSize: 11,
						formatter: (v: number) => `${v / 1000}k`
					},
					splitLine: { lineStyle: { color: t.border } }
				},
				series: [
					{
						type: 'bar',
						data: steps14d.map((d) => d.steps),
						itemStyle: { color: t.data2, borderRadius: [4, 4, 0, 0] }
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
