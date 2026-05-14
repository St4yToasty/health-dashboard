<script lang="ts" module>
	export type WeightFormProps = {
		onSubmitted: () => void;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';

	let { onSubmitted }: WeightFormProps = $props();

	let weight = $state<number | string>('');
	let bodyFat = $state<number | string>('');
	let muscleMass = $state<number | string>('');
	let showMore = $state(false);
	let submitting = $state(false);
</script>

<form
	method="POST"
	action="?/addWeight"
	use:enhance={() => {
		submitting = true;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success' || result.type === 'redirect') {
				toast.success(`Logged ${weight} kg`);
				weight = '';
				bodyFat = '';
				muscleMass = '';
				showMore = false;
				await invalidateAll();
				onSubmitted();
			} else if (result.type === 'failure') {
				toast.error('Could not log weight');
			}
		};
	}}
	class="flex flex-col gap-4"
>
	<Input
		label="Weight"
		name="weight_kg"
		type="number"
		min="20"
		max="300"
		step="0.1"
		bind:value={weight}
		unit="kg"
		placeholder="e.g. 82.4"
		required
		autofocus
	/>

	<button
		type="button"
		onclick={() => (showMore = !showMore)}
		class="flex items-center justify-between text-sm font-medium text-muted hover:text-default transition-colors"
	>
		<span>More fields</span>
		<ChevronDown
			class="size-4 transition-transform"
			style="transform: rotate({showMore ? 180 : 0}deg)"
			aria-hidden="true"
		/>
	</button>

	{#if showMore}
		<div class="flex flex-col gap-4">
			<Input
				label="Body fat"
				name="body_fat_pct"
				type="number"
				min="3"
				max="60"
				step="0.1"
				bind:value={bodyFat}
				unit="%"
				placeholder="e.g. 21.5"
			/>
			<Input
				label="Muscle mass"
				name="muscle_mass_kg"
				type="number"
				min="10"
				max="200"
				step="0.1"
				bind:value={muscleMass}
				unit="kg"
				placeholder="e.g. 35.6"
			/>
		</div>
	{/if}

	<Button type="submit" loading={submitting} disabled={!weight}>
		Log weight
	</Button>
</form>
