<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { IconComponent } from '$lib/icons';

	export type EmptyStateProps = {
		/** Lucide icon component. */
		icon?: IconComponent;
		title: string;
		description?: string;
		/** Optional CTA snippet (typically a Button). */
		action?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	let { icon: Icon, title, description, action, class: klass = '' }: EmptyStateProps = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
		klass
	)}
>
	{#if Icon}
		<Icon class="size-8 text-subtle" aria-hidden="true" />
	{/if}
	<div class="space-y-1">
		<p class="text-md font-semibold text-default">{title}</p>
		{#if description}
			<p class="text-sm text-muted">{description}</p>
		{/if}
	</div>
	{#if action}
		<div class="mt-2">{@render action()}</div>
	{/if}
</div>
