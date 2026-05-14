<script lang="ts" module>
	export type ProgressBarProps = {
		/** Current value, 0..goal. Values above goal trigger the "over" treatment. */
		value: number;
		/** Target value. */
		goal: number;
		/** CSS var name for fill color when under-goal. Default '--accent'. */
		colorVar?: string;
		/** CSS var name for fill color when meeting/exceeding goal but still "good". Default '--positive'. */
		metColorVar?: string;
		/** When true, "over" treatment uses --danger (e.g. calorie ceiling). When false (default), it uses --positive (e.g. step floor — exceeding is fine). */
		ceiling?: boolean;
		/** Show the "X / Y" label above. Default true. */
		showLabel?: boolean;
		/** Optional unit suffix (e.g. 'kcal', 'ml'). */
		unit?: string;
		/** Aria label for screen readers. */
		label?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		value,
		goal,
		colorVar = '--accent',
		metColorVar = '--positive',
		ceiling = false,
		showLabel = true,
		unit,
		label,
		class: klass = ''
	}: ProgressBarProps = $props();

	const pct = $derived(goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0);
	const isOver = $derived(value > goal);
	const fillVar = $derived(
		isOver ? (ceiling ? '--danger' : metColorVar) : pct >= 100 ? metColorVar : colorVar
	);
	const fmt = (n: number) => new Intl.NumberFormat('en').format(Math.round(n));
</script>

<div class={cn('flex flex-col gap-1.5', klass)}>
	{#if showLabel}
		<div class="flex items-baseline justify-between text-sm">
			<span class="num text-default tabular-nums">
				{fmt(value)} / {fmt(goal)}{#if unit}<span class="ml-1 text-muted">{unit}</span>{/if}
			</span>
			<span class="num text-muted tabular-nums">{Math.round(pct)}%</span>
		</div>
	{/if}
	<div
		role="progressbar"
		aria-label={label ?? `${fmt(value)} of ${fmt(goal)}`}
		aria-valuenow={value}
		aria-valuemin={0}
		aria-valuemax={goal}
		class="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
	>
		<div
			class="h-full rounded-full transition-[width] duration-(--dur-base) ease-(--ease-standard)"
			style:width="{pct}%"
			style:background-color="var({fillVar})"
		></div>
	</div>
	{#if isOver && ceiling}
		<span class="self-end text-xs font-medium text-danger" aria-hidden="true">
			over by {fmt(value - goal)}{unit ? ` ${unit}` : ''}
		</span>
	{/if}
</div>
