<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type BadgeVariant = 'tonal' | 'positive' | 'warning' | 'danger' | 'neutral';

	const VARIANT_CLASSES: Record<BadgeVariant, string> = {
		tonal: 'bg-accent-subtle text-accent',
		positive: 'bg-positive-subtle text-positive',
		warning: 'bg-warning-subtle text-warning',
		danger: 'bg-danger-subtle text-danger',
		neutral: 'bg-surface-sunken text-muted'
	};

	export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'class'> & {
		variant?: BadgeVariant;
		class?: string;
		children?: import('svelte').Snippet;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	let { variant = 'tonal', class: klass = '', children, ...rest }: BadgeProps = $props();

	const base = 'inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-medium';
</script>

<span class={cn(base, VARIANT_CLASSES[variant], klass)} {...rest}>
	{#if children}{@render children()}{/if}
</span>
