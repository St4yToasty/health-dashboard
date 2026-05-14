<script lang="ts" module>
	import type { IconComponent } from '$lib/icons';

	export type TabBarItem<T extends string = string> = {
		value: T;
		label: string;
		icon: IconComponent;
		badge?: number;
	};

	export type TabBarProps<T extends string = string> = {
		items: ReadonlyArray<TabBarItem<T>>;
		active: T;
		onSelect: (value: T) => void;
		class?: string;
	};
</script>

<script lang="ts" generics="T extends string">
	import { cn } from '$lib/utils';

	let { items, active, onSelect, class: klass = '' }: TabBarProps<T> = $props();
</script>

<nav
	class={cn(
		'fixed inset-x-0 bottom-0 z-30 border-t border-(color:--border-default)',
		'bg-[color-mix(in_srgb,var(--bg-canvas)_85%,transparent)] backdrop-blur-xl',
		'pb-[env(safe-area-inset-bottom)]',
		klass
	)}
	aria-label="Primary"
>
	<ul class="mx-auto flex h-14 max-w-md items-stretch justify-around">
		{#each items as item (item.value)}
			{@const selected = item.value === active}
			<li class="flex-1">
				<button
					type="button"
					aria-current={selected ? 'page' : undefined}
					onclick={() => onSelect(item.value)}
					class={cn(
						'relative flex h-full w-full flex-col items-center justify-center gap-0.5',
						'transition-colors duration-(--dur-fast) touch-manipulation',
						'focus-visible:outline-2 focus-visible:outline-(color:--border-focus) focus-visible:outline-offset-[-2px]',
						selected ? 'text-accent' : 'text-subtle hover:text-default'
					)}
				>
					{#if selected}
						<span
							class="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent"
							aria-hidden="true"
						></span>
					{/if}
					<item.icon class="size-6" aria-hidden="true" />
					<span class="text-[11px] font-medium">{item.label}</span>
					{#if item.badge}
						<span
							class={cn(
								'absolute top-1.5 right-1/2 translate-x-3 min-w-4 rounded-full bg-danger px-1',
								'text-[10px] font-semibold text-white tabular-nums num'
							)}
							aria-label="{item.badge} unread"
						>
							{item.badge}
						</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</nav>
