<script lang="ts">
	import { onMount } from 'svelte';
	import { weight7d } from '$lib/dev/chart-fixtures';
	import { chartTokens } from '../css-vars';

	let container: HTMLDivElement;

	onMount(() => {
		let chart: { resize: () => void; dispose: () => void; setOption: (opts: object) => void } | null = null;
		let ro: ResizeObserver | null = null;

		(async () => {
			const echarts = await import('echarts/core');
			const { LineChart } = await import('echarts/charts');
			const { GridComponent } = await import('echarts/components');
			const { SVGRenderer } = await import('echarts/renderers');
			echarts.use([LineChart, GridComponent, SVGRenderer]);

			const t = chartTokens();
			chart = echarts.init(container, null, { renderer: 'svg' });
			chart!.setOption({
				grid: { left: 0, right: 0, top: 2, bottom: 2, containLabel: false },
				xAxis: { type: 'category', show: false, data: weight7d.map((_, i) => i) },
				yAxis: { type: 'value', show: false, scale: true },
				series: [
					{
						type: 'line',
						smooth: true,
						symbol: 'none',
						data: weight7d.map((d) => d.weight),
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

<div bind:this={container} class="h-[40px] w-full"></div>
