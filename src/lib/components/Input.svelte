<script lang="ts" module>
	import type { HTMLInputAttributes } from 'svelte/elements';

	export type InputProps = Omit<HTMLInputAttributes, 'class' | 'value'> & {
		value?: string | number | null;
		label?: string;
		helperText?: string;
		error?: string;
		/** Inline unit shown at the right edge of the field, e.g. 'kg', 'ml'. */
		unit?: string;
		/** Tighten height on desktop. iOS mobile still gets ≥48px / ≥16px font. */
		compact?: boolean;
		class?: string;
		wrapperClass?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		value = $bindable(),
		label,
		helperText,
		error,
		unit,
		compact = false,
		class: klass = '',
		wrapperClass = '',
		id,
		name,
		type = 'text',
		...rest
	}: InputProps = $props();

	const autoId = $props.id();
	const inputId = $derived(id ?? `inp-${autoId}`);
	const helperId = $derived(helperText || error ? `${inputId}-help` : undefined);

	const heightClass = $derived(compact ? 'h-10 md:h-10' : 'h-12 md:h-10');

	// Numeric inputs get a softer keyboard + autoselect on focus by default.
	const isNumeric = $derived(type === 'number');
</script>

<div class={cn('flex flex-col gap-1.5', wrapperClass)}>
	{#if label}
		<label for={inputId} class="text-sm font-medium text-default">
			{label}
		</label>
	{/if}
	<div class="relative">
		<input
			id={inputId}
			{name}
			{type}
			bind:value
			inputmode={isNumeric ? 'decimal' : undefined}
			aria-invalid={error ? true : undefined}
			aria-describedby={helperId}
			class={cn(
				heightClass,
				'w-full rounded-sm bg-surface-sunken px-4 text-md text-default',
				'border transition-colors duration-(--dur-fast)',
				error
					? 'border-(color:--danger)'
					: 'border-(color:--border-default) focus-visible:border-(color:--accent)',
				'focus-visible:outline-2 focus-visible:outline-(color:--border-focus) focus-visible:outline-offset-2',
				'disabled:opacity-40 disabled:pointer-events-none',
				'placeholder:text-(color:--fg-subtle)',
				unit ? 'pr-12' : '',
				klass
			)}
			{...rest}
		/>
		{#if unit}
			<span
				class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted"
				aria-hidden="true"
			>
				{unit}
			</span>
		{/if}
	</div>
	{#if error}
		<p id={helperId} class="text-sm text-danger" role="alert">{error}</p>
	{:else if helperText}
		<p id={helperId} class="text-sm text-subtle">{helperText}</p>
	{/if}
</div>
