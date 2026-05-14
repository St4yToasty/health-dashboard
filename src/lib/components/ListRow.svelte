<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	// Use HTMLElement attrs (the LCA of div + button) so we can spread cleanly onto either tag.
	// Omit 'title' because we use that name for the primary-text snippet below.
	export type ListRowProps = Omit<HTMLAttributes<HTMLElement>, 'class' | 'title'> & {
		/** Whether to render a top divider. Set false on the first row. */
		dividerTop?: boolean;
		/** Click handler. When provided, the row renders as a <button>. */
		onclick?: (e: MouseEvent) => void;
		/** Slots. */
		leading?: Snippet;
		title: Snippet;
		subtitle?: Snippet;
		trailing?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';

	let {
		dividerTop = false,
		onclick,
		leading,
		title,
		subtitle,
		trailing,
		class: klass = '',
		...rest
	}: ListRowProps = $props();

	const interactive = $derived(Boolean(onclick));

	const inner = $derived(
		cn(
			'flex w-full items-center gap-3 px-4 py-3 min-h-14',
			interactive ? 'transition-colors duration-(--dur-fast) hover:bg-surface-sunken' : '',
			'focus-visible:outline-2 focus-visible:outline-(color:--border-focus) focus-visible:outline-offset-[-2px]',
			klass
		)
	);

	const wrapperClass = $derived(
		cn(dividerTop ? 'border-t border-(color:--border-default)' : '')
	);
</script>

<div class={wrapperClass}>
	{#if onclick}
		<button type="button" {onclick} class={cn(inner, 'text-left')} {...rest}>
			{#if leading}<span class="shrink-0">{@render leading()}</span>{/if}
			<span class="min-w-0 flex-1">
				<span class="block truncate text-base text-default">{@render title()}</span>
				{#if subtitle}
					<span class="block truncate text-sm text-muted">{@render subtitle()}</span>
				{/if}
			</span>
			{#if trailing}
				<span class="shrink-0 text-sm text-muted tabular-nums">{@render trailing()}</span>
			{/if}
			<ChevronRight class="size-4 shrink-0 text-subtle" aria-hidden="true" />
		</button>
	{:else}
		<div class={inner} {...rest}>
			{#if leading}<span class="shrink-0">{@render leading()}</span>{/if}
			<span class="min-w-0 flex-1">
				<span class="block truncate text-base text-default">{@render title()}</span>
				{#if subtitle}
					<span class="block truncate text-sm text-muted">{@render subtitle()}</span>
				{/if}
			</span>
			{#if trailing}
				<span class="shrink-0 text-sm text-muted tabular-nums">{@render trailing()}</span>
			{/if}
		</div>
	{/if}
</div>
