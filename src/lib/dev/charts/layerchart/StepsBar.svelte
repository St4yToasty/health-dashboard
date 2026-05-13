<script lang="ts">
	import { Axis, Bars, Chart, Grid, Highlight, Svg } from 'layerchart';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { steps14d } from '$lib/dev/chart-fixtures';
</script>

<div class="h-[260px] w-full">
	<Chart
		data={steps14d}
		x="date"
		y="steps"
		xScale={scaleBand().padding(0.25)}
		yScale={scaleLinear()}
		yBaseline={0}
		yNice
		padding={{ left: 36, right: 8, top: 8, bottom: 24 }}
		tooltip={{ mode: 'band' }}
	>
		<Svg>
			<Grid y class="stroke-(color:--border-default)" />
			<Axis
				placement="bottom"
				format={(v) =>
					(v as Date).toLocaleDateString('en', { weekday: 'narrow' })}
				tickLabelProps={{ class: 'fill-(color:--fg-subtle) text-[11px]' }}
				rule={false}
			/>
			<Axis
				placement="left"
				ticks={4}
				format={(v) => `${(v as number) / 1000}k`}
				tickLabelProps={{ class: 'fill-(color:--fg-subtle) text-[11px]' }}
				rule={false}
			/>
			<Bars radius={4} radiusEdges={['top']} class="fill-(color:--data-2)" />
			<Highlight area />
		</Svg>
	</Chart>
</div>
