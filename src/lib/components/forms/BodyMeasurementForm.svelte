<script lang="ts" module>
	export type BodyMeasurementFormProps = {
		onSubmitted: () => void;
	};

	const FIELDS = [
		{ name: 'waist_cm', label: 'Waist', placeholder: '85' },
		{ name: 'chest_cm', label: 'Chest', placeholder: '102' },
		{ name: 'hips_cm', label: 'Hips', placeholder: '98' },
		{ name: 'thigh_cm', label: 'Thigh', placeholder: '58' },
		{ name: 'arm_cm', label: 'Arm', placeholder: '34' },
		{ name: 'neck_cm', label: 'Neck', placeholder: '38' }
	] as const;
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';

	let { onSubmitted }: BodyMeasurementFormProps = $props();

	// One state slot per field. Indexed by field name.
	let values = $state<Record<string, number | string>>({});
	let submitting = $state(false);

	const hasAny = $derived(
		FIELDS.some(({ name }) => values[name] !== undefined && values[name] !== '')
	);
</script>

<form
	method="POST"
	action="?/addBodyMeasurement"
	use:enhance={() => {
		submitting = true;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Measurements saved');
				values = {};
				await invalidateAll();
				onSubmitted();
			} else if (result.type === 'failure') {
				toast.error('Could not save measurements');
			}
		};
	}}
	class="flex flex-col gap-4"
>
	<p class="text-sm text-muted">Fill in just the ones you measured today.</p>

	<div class="grid grid-cols-2 gap-3">
		{#each FIELDS as field (field.name)}
			<Input
				label={field.label}
				name={field.name}
				type="number"
				min="10"
				max="300"
				step="0.1"
				bind:value={values[field.name]}
				unit="cm"
				placeholder={field.placeholder}
			/>
		{/each}
	</div>

	<Button type="submit" loading={submitting} disabled={!hasAny}>
		Save measurements
	</Button>
</form>
