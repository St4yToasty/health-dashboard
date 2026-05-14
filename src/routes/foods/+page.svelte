<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from 'lucide-svelte/icons/plus';
	import Apple from 'lucide-svelte/icons/apple';
	import Archive from 'lucide-svelte/icons/archive';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Input from '$lib/components/Input.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import type { IconComponent } from '$lib/icons';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Food = (typeof data.foods)[number];

	let editing = $state<Food | null>(null);
	let sheetOpen = $state(false);
	let submitting = $state(false);

	let name = $state('');
	let brand = $state('');
	let servingGrams = $state<number | string>('');
	let kcal = $state<number | string>('');
	let proteinG = $state<number | string>('');

	function openCreate() {
		editing = null;
		name = '';
		brand = '';
		servingGrams = 100;
		kcal = '';
		proteinG = '';
		sheetOpen = true;
	}

	function openEdit(f: Food) {
		editing = f;
		name = f.name;
		brand = f.brand ?? '';
		servingGrams = f.servingGrams;
		kcal = f.kcal;
		proteinG = f.proteinG;
		sheetOpen = true;
	}

	const AppleIcon = Apple as unknown as IconComponent;
	const ArchiveIcon = Archive as unknown as IconComponent;

	const active = $derived(data.foods.filter((f) => !f.isArchived));
	const archived = $derived(data.foods.filter((f) => f.isArchived));
</script>

<svelte:head>
	<title>Foods · health-dashboard</title>
</svelte:head>

<Toaster />

<header
	class="sticky top-0 z-20 border-b border-(color:--border-default) bg-[color-mix(in_srgb,var(--bg-canvas)_88%,transparent)] backdrop-blur-xl"
	style:padding-top="env(safe-area-inset-top)"
>
	<div class="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:px-8">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="icon" onclick={() => history.back()} aria-label="Back">
				<ArrowLeft class="size-5" aria-hidden="true" />
			</Button>
			<h1 class="text-base font-semibold text-default">Food library</h1>
		</div>
		<Button onclick={openCreate} size="compact">
			<Plus class="size-4" aria-hidden="true" />
			Add food
		</Button>
	</div>
</header>

<main class="mx-auto max-w-4xl px-4 pt-4 pb-8 md:px-8 md:pt-6">
	{#if active.length === 0 && archived.length === 0}
		<Card class="!p-0">
			<EmptyState
				icon={AppleIcon}
				title="No foods yet"
				description="Add your first food to start building the library. Each entry stores macros per a canonical serving."
			>
				{#snippet action()}
					<Button onclick={openCreate} size="compact">
						<Plus class="size-4" aria-hidden="true" />
						Add food
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<Card class="!p-0">
			{#each active as f, i (f.id)}
				<ListRow dividerTop={i > 0} onclick={() => openEdit(f)}>
					{#snippet leading()}<AppleIcon class="size-5 text-muted" />{/snippet}
					{#snippet title()}
						<span class="flex items-center gap-2">
							{f.name}
							{#if f.brand}<span class="text-xs text-muted">· {f.brand}</span>{/if}
						</span>
					{/snippet}
					{#snippet subtitle()}
						{f.kcal} kcal · {f.proteinG} g protein · per {f.servingGrams} g
					{/snippet}
				</ListRow>
			{/each}
		</Card>

		{#if archived.length > 0}
			<details class="mt-6">
				<summary class="cursor-pointer text-sm font-medium text-muted hover:text-default">
					Archived ({archived.length})
				</summary>
				<Card class="mt-2 !p-0">
					{#each archived as f, i (f.id)}
						<ListRow dividerTop={i > 0} onclick={() => openEdit(f)}>
							{#snippet leading()}<ArchiveIcon class="size-5 text-subtle" />{/snippet}
							{#snippet title()}
								<span class="flex items-center gap-2 text-muted">
									{f.name}
									{#if f.brand}<span class="text-xs">· {f.brand}</span>{/if}
									<Badge variant="neutral">archived</Badge>
								</span>
							{/snippet}
							{#snippet subtitle()}
								{f.kcal} kcal · {f.proteinG} g protein · per {f.servingGrams} g
							{/snippet}
						</ListRow>
					{/each}
				</Card>
			</details>
		{/if}
	{/if}
</main>

<Sheet bind:open={sheetOpen} title={editing ? 'Edit food' : 'Add food'}>
	<form
		method="POST"
		action={editing ? '?/updateFood' : '?/createFood'}
		use:enhance={() => {
			submitting = true;
			return async ({ result }) => {
				submitting = false;
				if (result.type === 'success' || result.type === 'redirect') {
					toast.success(editing ? 'Food updated' : 'Food added');
					await invalidateAll();
					sheetOpen = false;
				} else if (result.type === 'failure') {
					toast.error('Could not save food');
				}
			};
		}}
		class="flex flex-col gap-4"
	>
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}
		<Input label="Name" name="name" bind:value={name} placeholder="e.g. Oatmeal" required />
		<Input label="Brand (optional)" name="brand" bind:value={brand} placeholder="e.g. Quaker" />
		<div class="grid grid-cols-3 gap-3">
			<Input
				label="Per"
				name="serving_grams"
				type="number"
				min="1"
				step="1"
				bind:value={servingGrams}
				unit="g"
				required
			/>
			<Input
				label="Kcal"
				name="kcal"
				type="number"
				min="0"
				step="1"
				bind:value={kcal}
				required
			/>
			<Input
				label="Protein"
				name="protein_g"
				type="number"
				min="0"
				step="0.1"
				bind:value={proteinG}
				unit="g"
				required
			/>
		</div>
		<Button type="submit" loading={submitting}>
			{editing ? 'Save changes' : 'Add to library'}
		</Button>
	</form>

	{#if editing}
		<form
			method="POST"
			action="?/archiveFood"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success' || result.type === 'redirect') {
						toast.success(editing!.isArchived ? 'Restored' : 'Archived');
						await invalidateAll();
						sheetOpen = false;
					}
				};
			}}
			class="mt-4 border-t border-(color:--border-default) pt-4"
		>
			<input type="hidden" name="id" value={editing.id} />
			<input type="hidden" name="is_archived" value={editing.isArchived ? 'false' : 'true'} />
			<Button type="submit" variant={editing.isArchived ? 'tonal' : 'ghost'} class="w-full">
				{#if editing.isArchived}
					<RotateCcw class="size-4" aria-hidden="true" />
					Restore food
				{:else}
					<Archive class="size-4" aria-hidden="true" />
					Archive food
				{/if}
			</Button>
		</form>
	{/if}
</Sheet>
