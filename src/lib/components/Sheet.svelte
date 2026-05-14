<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type SheetProps = {
		/** Two-way bound open state. */
		open: boolean;
		/** Title rendered in the header (and used as the a11y label). */
		title: string;
		/** Optional descriptive subtitle. */
		description?: string;
		/** Force desktop "centered modal" layout. By default: bottom sheet on mobile, modal on ≥md. */
		desktopModal?: boolean;
		children?: Snippet;
		/** Optional right-side header action snippet (e.g. a "Save" button). */
		headerAction?: Snippet;
	};
</script>

<script lang="ts">
	import { Dialog } from 'bits-ui';
	import X from 'lucide-svelte/icons/x';
	import { cn } from '$lib/utils';
	import type { IconComponent } from '$lib/icons';

	let {
		open = $bindable(false),
		title,
		description,
		desktopModal = false,
		children,
		headerAction
	}: SheetProps = $props();

	const CloseIcon = X as unknown as IconComponent;
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class={cn(
				'fixed inset-0 z-50 bg-[var(--scrim)] backdrop-blur-[2px]',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0'
			)}
		/>
		<Dialog.Content
			class={cn(
				'fixed z-50 flex flex-col bg-(color:--bg-surface-elevated)',
				'shadow-[var(--elev-3)] outline-hidden',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				// Mobile-default: bottom sheet.
				'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl border-t border-(color:--border-default)',
				'pb-[env(safe-area-inset-bottom)]',
				'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
				// Desktop: centered modal.
				desktopModal &&
					'md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[80dvh] md:w-full md:max-w-[480px]',
				desktopModal && 'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border',
				desktopModal &&
					'md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95',
				desktopModal &&
					'md:data-[state=open]:slide-in-from-top-0 md:data-[state=closed]:slide-out-to-top-0'
			)}
		>
			<!-- Drag handle (mobile only) -->
			<div
				class="mx-auto mt-2 h-1 w-8 rounded-full bg-(color:--fg-subtle) md:hidden"
				aria-hidden="true"
			></div>

			<header class="flex items-start justify-between gap-4 px-5 pt-3 pb-2">
				<div class="min-w-0">
					<Dialog.Title class="text-md font-semibold text-default">{title}</Dialog.Title>
					{#if description}
						<Dialog.Description class="text-sm text-muted">{description}</Dialog.Description>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-2">
					{#if headerAction}{@render headerAction()}{/if}
					<Dialog.Close
						class={cn(
							'grid size-9 place-items-center rounded-md text-muted',
							'hover:bg-(color:--bg-surface-sunken) hover:text-default',
							'focus-visible:outline-2 focus-visible:outline-(color:--border-focus) focus-visible:outline-offset-2',
							'touch-manipulation'
						)}
						aria-label="Close"
					>
						<CloseIcon class="size-5" aria-hidden="true" />
					</Dialog.Close>
				</div>
			</header>

			<div class="flex-1 overflow-y-auto px-5 pt-2 pb-5">
				{#if children}{@render children()}{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
