<script lang="ts">
	import { Toaster as SonnerToaster } from 'svelte-sonner';

	/**
	 * Toast container — drop once in the root layout. Other code emits
	 * toasts by importing `toast` from `svelte-sonner` and calling
	 * `toast.success(...)` / `toast.error(...)` / `toast.message(...)`.
	 *
	 * Themed against the Cinema Slate tokens via inline style vars; Sonner
	 * reads those at runtime so theme switches Just Work.
	 */
</script>

<SonnerToaster
	position="bottom-center"
	duration={4000}
	closeButton
	expand={false}
	richColors={false}
	toastOptions={{
		classes: {
			toast:
				'rounded-md border border-(color:--border-default) bg-(color:--bg-surface-elevated) text-(color:--fg-default) shadow-[var(--elev-2)]',
			description: 'text-(color:--fg-muted)',
			actionButton: 'bg-(color:--accent) text-(color:--accent-fg) rounded-md px-2 py-1 text-xs',
			cancelButton: 'text-(color:--fg-muted) text-xs',
			success: 'border-(color:--positive-subtle)',
			error: 'border-(color:--danger-subtle)',
			warning: 'border-(color:--warning-subtle)',
			info: 'border-(color:--info-subtle)'
		}
	}}
/>
