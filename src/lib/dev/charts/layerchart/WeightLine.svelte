<script lang="ts">
	import { Area, Axis, Chart, Grid, Highlight, Svg } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { weight30d } from '$lib/dev/chart-fixtures';
</script>

<div class="h-[260px] w-full">
	<Chart
		data={weight30d}
		x="date"
		y="weight"
		xScale={scaleTime()}
		yNice
		padding={{ left: 32, right: 8, top: 8, bottom: 24 }}
		tooltip={{ mode: 'bisect-x' }}
	>
		<Svg>
			<Grid y class="stroke-(color:--border-default)" />
			<Axis
				placement="bottom"
				format={(v) =>
					new Date(v as number).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
				ticks={4}
				tickLabelProps={{ class: 'fill-(color:--fg-subtle) text-[11px]' }}
				rule={false}
			/>
			<Axis
				placement="left"
				ticks={4}
				tickLabelProps={{ class: 'fill-(color:--fg-subtle) text-[11px]' }}
				rule={false}
			/>
			<Area
				curve={curveMonotoneX}
				class="fill-(color:--data-1)/15"
				line={{ class: 'stroke-(color:--data-1) stroke-2' }}
			/>
			<Highlight lines points />
		</Svg>
	</Chart>
</div>
