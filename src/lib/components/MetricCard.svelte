<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type MetricCardProps = {
		/** Uppercase short label (e.g. 'WEIGHT', 'CALORIES'). */
		label: string;
		/** Big number rendered with tabular-nums. */
		value: string;
		/** Optional unit shown next to the value, e.g. 'kg'. */
		unit?: string;
		/** Optional delta vs previous period. `positive` toggles icon direction + color. */
		delta?: { value: number; positive?: boolean; suffix?: string };
		/** Hero size — value uses text-3xl instead of text-2xl. */
		hero?: boolean;
		/** Footer slot for a sparkline or progress bar. */
		footer?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import TrendingDown from 'lucide-svelte/icons/trending-down';
	import TrendingUp from 'lucide-svelte/icons/trending-up';

	let { label, value, unit, delta, hero = false, footer, class: klass = '' }: MetricCardProps =
		$props();

	const valueClass = $derived(
		hero ? 'text-3xl leading-(--leading-3xl)' : 'text-2xl leading-(--leading-2xl)'
	);

	const deltaPositive = $derived(delta?.positive ?? false);
	const deltaText = $derived(
		delta
			? `${delta.value > 0 ? '+' : ''}${delta.value}${delta.suffix ? ' ' + delta.suffix : ''}`
			: ''
	);
	const deltaSrText = $derived(
		delta
			? `${deltaPositive ? 'improving' : 'declining'} by ${Math.abs(delta.value)}${delta.suffix ? ' ' + delta.suffix : ''}`
			: ''
	);

	const cardClass = $derived(
		cn(
			'flex flex-col gap-2 rounded-lg border border-(color:--border-default) bg-surface',
			'p-(--space-4) md:p-(--space-5) shadow-[var(--elev-1)]',
			klass
		)
	);
</script>

<div class={cardClass}>
	<p class="text-xs font-medium tracking-[0.04em] uppercase text-muted">{label}</p>
	<div class="flex items-baseline gap-1.5">
		<span class={cn('num font-semibold text-default tabular-nums', valueClass)}>{value}</span>
		{#if unit}<span class="text-md text-muted">{unit}</span>{/if}
	</div>
	{#if delta}
		<p
			class="flex items-center gap-1 text-sm font-medium"
			class:text-positive={deltaPositive}
			class:text-danger={!deltaPositive}
		>
			{#if deltaPositive}
				<TrendingDown class="size-4" aria-hidden="true" />
			{:else}
				<TrendingUp class="size-4" aria-hidden="true" />
			{/if}
			<span class="num tabular-nums">{deltaText}</span>
			<span class="sr-only">{deltaSrText}</span>
		</p>
	{/if}
	{#if footer}
		<div class="mt-auto pt-1">{@render footer()}</div>
	{/if}
</div>
