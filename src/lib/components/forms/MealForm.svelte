<script lang="ts" module>
	export type MealFormProps = {
		onSubmitted: () => void;
	};

	const KINDS = [
		{ value: 'breakfast', label: 'Breakfast' },
		{ value: 'lunch', label: 'Lunch' },
		{ value: 'dinner', label: 'Dinner' },
		{ value: 'snack', label: 'Snack' }
	] as const;

	type Food = {
		id: number;
		name: string;
		brand: string | null;
		servingGrams: number;
		kcal: number;
		proteinG: number;
	};

	type Item = { food: Food; grams: number };
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from 'lucide-svelte/icons/plus';
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';

	let { onSubmitted }: MealFormProps = $props();

	type Kind = (typeof KINDS)[number]['value'];

	function nowLocalDatetime(): string {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	let kind = $state<Kind>('lunch');
	let eatenAt = $state(nowLocalDatetime());
	let items = $state<Item[]>([]);

	let query = $state('');
	let results = $state<Food[]>([]);
	let searching = $state(false);
	let submitting = $state(false);

	// Debounced search against /api/foods. Effect tracks `query` so this runs
	// both on initial mount (empty query → returns all active foods) and on
	// every keystroke after that.
	let searchToken = 0;
	async function runSearch(q: string) {
		const token = ++searchToken;
		searching = true;
		try {
			const r = await fetch(`/api/foods?q=${encodeURIComponent(q)}&limit=20`);
			if (token !== searchToken) return; // stale
			const j = await r.json();
			results = j.results as Food[];
		} finally {
			if (token === searchToken) searching = false;
		}
	}

	let debounceHandle: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const q = query;
		clearTimeout(debounceHandle);
		debounceHandle = setTimeout(() => {
			void runSearch(q);
		}, 180);
		return () => clearTimeout(debounceHandle);
	});

	function addItem(food: Food) {
		items.push({ food, grams: food.servingGrams });
		query = '';
	}

	function removeItem(i: number) {
		items.splice(i, 1);
	}

	const totals = $derived.by(() => {
		let kcal = 0;
		let protein = 0;
		for (const it of items) {
			const ratio = it.grams / it.food.servingGrams;
			kcal += it.food.kcal * ratio;
			protein += it.food.proteinG * ratio;
		}
		return { kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10 };
	});

	const payload = $derived(
		JSON.stringify({
			kind,
			eaten_at: eatenAt,
			items: items.map((it) => ({ foodId: it.food.id, grams: it.grams }))
		})
	);
</script>

<form
	method="POST"
	action="?/addMeal"
	use:enhance={() => {
		submitting = true;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success' || result.type === 'redirect') {
				toast.success(`Logged ${totals.kcal} kcal`);
				items = [];
				query = '';
				await invalidateAll();
				onSubmitted();
			} else if (result.type === 'failure') {
				toast.error('Could not save meal');
			}
		};
	}}
	class="flex flex-col gap-4"
>
	<input type="hidden" name="payload" value={payload} />

	<div class="flex flex-col gap-2">
		<p class="text-xs tracking-[0.04em] uppercase text-muted">Meal kind</p>
		<SegmentedControl items={KINDS} bind:value={kind} label="Meal kind" />
	</div>

	<Input label="When" name="eaten_at_display" type="datetime-local" bind:value={eatenAt} />

	<!-- Items list -->
	<div class="flex flex-col gap-2">
		<p class="text-xs tracking-[0.04em] uppercase text-muted">Items ({items.length})</p>
		{#if items.length === 0}
			<p class="text-sm text-subtle">No items yet. Search below to add foods.</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each items as it, i (i + '-' + it.food.id)}
					<li
						class="flex items-center gap-2 rounded-md border border-(color:--border-default) bg-surface-sunken p-2"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-default">{it.food.name}</p>
							<p class="text-xs text-muted tabular-nums">
								{Math.round(it.food.kcal * (it.grams / it.food.servingGrams))} kcal ·
								{(it.food.proteinG * (it.grams / it.food.servingGrams)).toFixed(1)} g protein
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<input
								type="number"
								min="1"
								max="5000"
								step="1"
								bind:value={items[i].grams}
								class="h-9 w-20 rounded-sm border border-(color:--border-default) bg-surface px-2 text-right text-sm tabular-nums text-default focus-visible:outline-2 focus-visible:outline-(color:--border-focus)"
								aria-label="grams"
							/>
							<span class="text-xs text-muted">g</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Remove"
								onclick={() => removeItem(i)}
								class="!size-9"
							>
								<X class="size-4" aria-hidden="true" />
							</Button>
						</div>
					</li>
				{/each}
			</ul>
			<p class="text-xs text-muted tabular-nums">
				Total: <span class="text-default">{totals.kcal} kcal · {totals.protein} g protein</span>
			</p>
		{/if}
	</div>

	<!-- Search -->
	<div class="flex flex-col gap-2">
		<div class="relative">
			<Search
				class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
				aria-hidden="true"
			/>
			<Input
				label=""
				name="food_query"
				bind:value={query}
				placeholder="Search foods…"
				wrapperClass="!gap-0"
				class="pl-10"
			/>
		</div>
		<div
			class="max-h-48 overflow-y-auto rounded-md border border-(color:--border-default) bg-surface"
		>
			{#if searching && results.length === 0}
				<p class="px-3 py-2 text-sm text-subtle">Searching…</p>
			{:else if results.length === 0}
				<p class="px-3 py-2 text-sm text-subtle">No matches. Add foods at <a class="text-accent underline" href="/foods">/foods</a>.</p>
			{:else}
				<ul>
					{#each results as f (f.id)}
						<li>
							<button
								type="button"
								onclick={() => addItem(f)}
								class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-sunken"
							>
								<span class="min-w-0">
									<span class="block truncate font-medium text-default">{f.name}</span>
									<span class="block text-xs text-muted">
										{f.kcal} kcal · {f.proteinG} g protein · per {f.servingGrams} g
									</span>
								</span>
								<Plus class="size-4 shrink-0 text-muted" aria-hidden="true" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<Button type="submit" loading={submitting} disabled={items.length === 0}>
		{items.length === 0 ? 'Add items first' : `Save meal (${totals.kcal} kcal)`}
	</Button>
</form>
