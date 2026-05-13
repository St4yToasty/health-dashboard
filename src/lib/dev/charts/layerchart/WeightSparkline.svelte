<script lang="ts">
	import { Area, Chart, Svg } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { weight7d } from '$lib/dev/chart-fixtures';
</script>

<div class="h-[40px] w-full">
	<Chart
		data={weight7d}
		x="date"
		y="weight"
		xScale={scaleTime()}
		yNice
		padding={{ left: 0, right: 0, top: 2, bottom: 2 }}
	>
		<Svg>
			<Area
				curve={curveMonotoneX}
				class="fill-(color:--data-1)/20"
				line={{ class: 'stroke-(color:--data-1) stroke-2' }}
			/>
		</Svg>
	</Chart>
</div>
