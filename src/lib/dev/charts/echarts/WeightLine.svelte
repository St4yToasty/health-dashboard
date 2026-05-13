<script lang="ts">
	import { onMount } from 'svelte';
	import { weight30d } from '$lib/dev/chart-fixtures';
	import { chartTokens } from '../css-vars';

	let container: HTMLDivElement;

	onMount(() => {
		let chart: { resize: () => void; dispose: () => void; setOption: (opts: object) => void } | null = null;
		let ro: ResizeObserver | null = null;

		(async () => {
			const echarts = await import('echarts/core');
			const { LineChart } = await import('echarts/charts');
			const { GridComponent, TooltipComponent } = await import('echarts/components');
			const { SVGRenderer } = await import('echarts/renderers');
			echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);

			const t = chartTokens();
			chart = echarts.init(container, null, { renderer: 'svg' });
			chart!.setOption({
				grid: { left: 36, right: 12, top: 12, bottom: 28 },
				tooltip: {
					trigger: 'axis',
					backgroundColor: t.surfaceElevated,
					borderColor: t.border,
					textStyle: { color: t.fg, fontSize: 12 }
				},
				xAxis: {
					type: 'time',
					axisLine: { lineStyle: { color: t.border } },
					axisLabel: { color: t.fgSubtle, fontSize: 11 },
					axisTick: { show: false }
				},
				yAxis: {
					scale: true,
					axisLine: { show: false },
					axisLabel: { color: t.fgSubtle, fontSize: 11 },
					splitLine: { lineStyle: { color: t.border } }
				},
				series: [
					{
						type: 'line',
						smooth: true,
						symbol: 'none',
						data: weight30d.map((d) => [d.date.getTime(), d.weight]),
						lineStyle: { color: t.data1, width: 2 },
						areaStyle: { color: t.data1Subtle }
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
