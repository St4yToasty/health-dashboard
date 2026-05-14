<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { IconComponent } from '$lib/icons';

	export type FabProps = HTMLButtonAttributes & {
		/** Lucide icon component. Default: Plus. */
		icon?: IconComponent;
		/** Accessible label for screen readers (required since icon-only). */
		label: string;
		/** Distance above the tab bar in px. Default 72 (matches TabBar height) + safe-area + 12. */
		bottomOffset?: number;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import Plus from 'lucide-svelte/icons/plus';

	let {
		icon: Icon = Plus as unknown as IconComponent,
		label,
		bottomOffset = 72,
		class: klass = '',
		...rest
	}: FabProps = $props();
</script>

<button
	type="button"
	aria-label={label}
	class={cn(
		'fixed right-4 z-40 grid size-14 place-items-center rounded-full',
		'bg-accent text-accent-fg shadow-[var(--elev-2)]',
		'transition-transform duration-(--dur-fast) ease-(--ease-emphasized)',
		'active:scale-[0.96] touch-manipulation',
		'focus-visible:outline-2 focus-visible:outline-(color:--border-focus) focus-visible:outline-offset-2',
		klass
	)}
	style:bottom="calc({bottomOffset}px + env(safe-area-inset-bottom) + 12px)"
	{...rest}
>
	<Icon class="size-6" aria-hidden="true" />
</button>
