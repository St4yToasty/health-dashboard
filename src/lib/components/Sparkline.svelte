<script lang="ts">
	import { onMount } from 'svelte';
	import { cssVar } from '$lib/charts/css-vars';

	/**
	 * Sparkline — per design-system/MASTER.md §7.6.
	 *
	 * - 36px tall, fills available width.
	 * - Stroke 2px in `colorVar`, area fills with `${colorVar}-subtle`.
	 * - Monotone curve. Last-point dot when `showLastPoint` is true.
	 * - No axes, no grid, no tooltip.
	 * - Respects prefers-reduced-motion (instant render).
	 */
	type SparklineData = ReadonlyArray<{ date: Date; value: number } | number>;

	interface Props {
		data: SparklineData;
		/** CSS var name for the stroke color, e.g. '--data-1'. Default '--data-1'. */
		colorVar?: string;
		/** Height in px. Default 36 per MASTER §7.6. */
		height?: number;
		/** Render a 4px dot on the last data point. Default true. */
		showLastPoint?: boolean;
		/** Optional class for the wrapping <div>. */
		class?: string;
	}

	let {
		data,
		colorVar = '--data-1',
		height = 36,
		showLastPoint = true,
		class: klass = ''
	}: Props = $props();

	let container: HTMLDivElement;

	// Normalise both shapes — `{date, value}[]` and `number[]` — into ECharts-friendly arrays.
	const series = $derived(
		data.map((d, i) => (typeof d === 'number' ? [i, d] : [d.date.getTime(), d.value]))
	);
	const isTime = $derived(data.length > 0 && typeof data[0] !== 'number');

	onMount(() => {
		let chart: {
			resize: () => void;
			dispose: () => void;
			setOption: (opts: object) => void;
		} | null = null;
		let ro: ResizeObserver | null = null;

		(async () => {
			const echarts = await import('echarts/core');
			const { LineChart } = await import('echarts/charts');
			const { GridComponent } = await import('echarts/components');
			const { SVGRenderer } = await import('echarts/renderers');
			echarts.use([LineChart, GridComponent, SVGRenderer]);

			const stroke = cssVar(colorVar, '#6366f1');
			const fill = cssVar(`${colorVar}-subtle`, 'rgba(99,102,241,0.18)');
			const reduceMotion =
				typeof window !== 'undefined' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;

			chart = echarts.init(container, null, { renderer: 'svg' });
			chart!.setOption({
				animation: !reduceMotion,
				animationDuration: 320,
				grid: { left: 0, right: 0, top: 2, bottom: 2, containLabel: false },
				xAxis: { type: isTime ? 'time' : 'category', show: false },
				yAxis: { type: 'value', show: false, scale: true },
				series: [
					{
						type: 'line',
						smooth: true,
						symbol: 'none',
						data: series,
						lineStyle: { color: stroke, width: 2 },
						areaStyle: { color: fill },
						// Last-point dot — emphasises "current" without showing every marker.
						markPoint:
							showLastPoint && series.length > 0
								? {
										symbol: 'circle',
										symbolSize: 6,
										label: { show: false },
										itemStyle: { color: stroke },
										data: [{ coord: series[series.length - 1] }]
									}
								: undefined
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

<div
	bind:this={container}
	class={klass}
	style:height="{height}px"
	style:width="100%"
	aria-hidden="true"
></div>
