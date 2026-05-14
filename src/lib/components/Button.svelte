<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'tonal';
	export type ButtonSize = 'default' | 'compact' | 'icon';

	const VARIANT_CLASSES: Record<ButtonVariant, string> = {
		primary: 'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active',
		secondary:
			'bg-surface-sunken text-default border border-(color:--border-strong) hover:bg-surface',
		ghost: 'bg-transparent text-default hover:bg-accent-subtle',
		destructive: 'bg-danger text-white hover:opacity-90 active:opacity-95',
		tonal: 'bg-accent-subtle text-accent hover:bg-accent-subtle/80'
	};

	const SIZE_CLASSES: Record<ButtonSize, string> = {
		default: 'h-11 px-4 text-base gap-2',
		compact: 'h-9 px-3 text-sm gap-1.5',
		icon: 'size-11 p-0'
	};

	export type ButtonProps = HTMLButtonAttributes & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		loading?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';

	let {
		variant = 'primary',
		size = 'default',
		loading = false,
		disabled,
		class: klass = '',
		children,
		type = 'button',
		...rest
	}: ButtonProps = $props();

	const base =
		'inline-flex items-center justify-center rounded-md font-medium select-none ' +
		'transition-colors duration-(--dur-fast) ' +
		'focus-visible:outline-2 focus-visible:outline-(color:--border-focus) focus-visible:outline-offset-2 ' +
		'disabled:opacity-40 disabled:pointer-events-none ' +
		'active:scale-[0.97] touch-manipulation';

	const finalClass = $derived(cn(base, VARIANT_CLASSES[variant], SIZE_CLASSES[size], klass));
</script>

<button
	{type}
	class={finalClass}
	disabled={loading || disabled}
	aria-busy={loading || undefined}
	{...rest}
>
	{#if loading}
		<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
	{:else if children}
		{@render children()}
	{/if}
</button>
