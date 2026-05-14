<script lang="ts" module>
	export type SegmentedItem<T extends string = string> = {
		value: T;
		label: string;
	};

	export type SegmentedControlProps<T extends string = string> = {
		items: ReadonlyArray<SegmentedItem<T>>;
		value: T;
		onValueChange?: (value: T) => void;
		/** Aria label for the radiogroup as a whole. */
		label?: string;
		class?: string;
	};
</script>

<script lang="ts" generics="T extends string">
	import { cn } from '$lib/utils';

	let {
		items,
		value = $bindable(),
		onValueChange,
		label = 'Segmented control',
		class: klass = ''
	}: SegmentedControlProps<T> = $props();

	function select(next: T) {
		value = next;
		onValueChange?.(next);
	}
</script>

<div
	role="radiogroup"
	aria-label={label}
	class={cn(
		'inline-flex items-center gap-0.5 rounded-md bg-surface-sunken p-1 text-sm',
		klass
	)}
>
	{#each items as item (item.value)}
		{@const selected = item.value === value}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			tabindex={selected ? 0 : -1}
			onclick={() => select(item.value)}
			class={cn(
				'rounded-sm px-3 py-1.5 font-medium transition-colors duration-(--dur-fast)',
				'focus-visible:outline-2 focus-visible:outline-(color:--border-focus) focus-visible:outline-offset-2',
				selected
					? 'bg-surface text-default shadow-[var(--elev-1)]'
					: 'text-muted hover:text-default'
			)}
		>
			{item.label}
		</button>
	{/each}
</div>
