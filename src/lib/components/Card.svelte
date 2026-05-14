<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type CardProps = Omit<HTMLAttributes<HTMLDivElement>, 'class'> & {
		/** Adds hover/press affordance for whole-card click targets. */
		interactive?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	let { interactive = false, class: klass = '', children, ...rest }: CardProps = $props();

	const base =
		'rounded-lg border border-(color:--border-default) bg-surface ' +
		'p-(--space-4) md:p-(--space-5) shadow-[var(--elev-1)]';

	const interactiveClasses = $derived(
		interactive
			? 'transition-colors duration-(--dur-fast) cursor-pointer ' +
					'hover:border-(color:--border-strong) active:scale-[0.99] touch-manipulation'
			: ''
	);
</script>

<div class={cn(base, interactiveClasses, klass)} {...rest}>
	{#if children}{@render children()}{/if}
</div>
