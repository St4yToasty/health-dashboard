<script lang="ts" module>
	export type WaterFormProps = {
		onSubmitted: () => void;
	};

	const QUICK_AMOUNTS = [100, 250, 330, 500, 750] as const;
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';

	let { onSubmitted }: WaterFormProps = $props();

	let amount = $state<number | string>('');
	let submitting = $state(false);

	function selectQuick(ml: number) {
		amount = ml;
	}
</script>

<form
	method="POST"
	action="?/addWater"
	use:enhance={() => {
		submitting = true;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success' || result.type === 'redirect') {
				toast.success(`+${amount} ml water`);
				amount = '';
				await invalidateAll();
				onSubmitted();
			} else if (result.type === 'failure') {
				toast.error('Could not log water');
			}
		};
	}}
	class="flex flex-col gap-4"
>
	<div class="flex flex-wrap gap-2">
		{#each QUICK_AMOUNTS as ml (ml)}
			<Button
				type="button"
				variant={amount === ml ? 'tonal' : 'secondary'}
				size="compact"
				onclick={() => selectQuick(ml)}
				class="min-w-[64px]"
			>
				{ml} ml
			</Button>
		{/each}
	</div>

	<Input
		label="Custom amount"
		name="amount_ml"
		type="number"
		min="1"
		max="5000"
		step="50"
		bind:value={amount}
		unit="ml"
		placeholder="e.g. 400"
		required
	/>

	<Button type="submit" loading={submitting} disabled={!amount}>
		Log water
	</Button>
</form>
