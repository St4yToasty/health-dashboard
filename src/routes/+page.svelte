<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Bell from 'lucide-svelte/icons/bell';
	import Settings from 'lucide-svelte/icons/settings';
	import Home from 'lucide-svelte/icons/home';
	import LineChart from 'lucide-svelte/icons/line-chart';
	import PlusSquare from 'lucide-svelte/icons/plus-square';
	import Utensils from 'lucide-svelte/icons/utensils';
	import Droplets from 'lucide-svelte/icons/droplets';
	import Scale from 'lucide-svelte/icons/scale';
	import Ruler from 'lucide-svelte/icons/ruler';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';

	import MetricCard from '$lib/components/MetricCard.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import FAB from '$lib/components/FAB.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import WaterForm from '$lib/components/forms/WaterForm.svelte';
	import WeightForm from '$lib/components/forms/WeightForm.svelte';
	import BodyMeasurementForm from '$lib/components/forms/BodyMeasurementForm.svelte';
	import type { IconComponent } from '$lib/icons';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Tab bar state — only Home is real for now; Phase 5/6 add the rest.
	type Tab = 'home' | 'log' | 'trends' | 'settings';
	let activeTab = $state<Tab>('home');
	const tabs = [
		{ value: 'home' as const, label: 'Home', icon: Home as unknown as IconComponent },
		{ value: 'log' as const, label: 'Log', icon: PlusSquare as unknown as IconComponent },
		{ value: 'trends' as const, label: 'Trends', icon: LineChart as unknown as IconComponent },
		{
			value: 'settings' as const,
			label: 'Settings',
			icon: Settings as unknown as IconComponent
		}
	];

	// Quick-log sheet state. logMode === null shows the chooser; otherwise the matching form.
	type LogMode = 'water' | 'weight' | 'measurement' | 'meal';
	let sheetOpen = $state(false);
	let logMode = $state<LogMode | null>(null);

	// Reset the mode when the sheet closes so reopening lands on the chooser.
	$effect(() => {
		if (!sheetOpen) logMode = null;
	});

	function closeSheet() {
		sheetOpen = false;
	}

	// Greeting based on local hour.
	const hour = new Date().getHours();
	const greeting =
		hour < 6
			? 'Up early'
			: hour < 12
				? 'Good morning'
				: hour < 18
					? 'Good afternoon'
					: 'Good evening';

	// Formatters.
	const fmt = (n: number) => new Intl.NumberFormat('en').format(Math.round(n));
	const dateRelative = (iso: Date | string) => {
		const d = typeof iso === 'string' ? new Date(iso) : iso;
		const days = Math.round((Date.now() - d.getTime()) / 86400000);
		if (days <= 0) return 'today';
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days}d ago`;
		return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
	};

	// Derived display values.
	const weightDelta = $derived.by(() => {
		if (data.weightSparkline.length < 2) return null;
		const first = data.weightSparkline[0].value;
		const last = data.weightSparkline[data.weightSparkline.length - 1].value;
		const diff = last - first;
		return {
			value: Number(diff.toFixed(1)),
			positive: diff < 0, // loss is "positive" for weight-loss goal
			suffix: 'kg'
		};
	});

	const sleepDuration = $derived.by(() => {
		if (!data.sleep || !data.sleep.asleepMin) return null;
		const h = Math.floor(data.sleep.asleepMin / 60);
		const m = data.sleep.asleepMin % 60;
		return `${h}h ${String(m).padStart(2, '0')}m`;
	});

	// Goal fallbacks (used when no goal row exists yet).
	const calGoal = $derived(data.goals.daily_calories ?? 1800);
	const waterGoal = $derived(data.goals.daily_water_ml ?? 2500);
	const stepsGoal = $derived(data.goals.daily_steps ?? 8000);
</script>

<svelte:head>
	<title>Today · health-dashboard</title>
</svelte:head>

<Toaster />

<!-- Sticky header -->
<header
	class="sticky top-0 z-20 border-b border-(color:--border-default) bg-[color-mix(in_srgb,var(--bg-canvas)_88%,transparent)] backdrop-blur-xl"
	style:padding-top="env(safe-area-inset-top)"
>
	<div class="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:px-8">
		<div>
			<p class="text-xs tracking-[0.04em] uppercase text-subtle">{data.today}</p>
			<p class="text-base font-semibold text-default">{greeting}</p>
		</div>
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="icon" aria-label="Notifications">
				<Bell class="size-5" aria-hidden="true" />
			</Button>
			<Button variant="ghost" size="icon" aria-label="Settings">
				<Settings class="size-5" aria-hidden="true" />
			</Button>
		</div>
	</div>
</header>

<main
	class="mx-auto max-w-4xl px-4 pt-4 md:px-8 md:pt-6"
	style:padding-bottom="calc(56px + 56px + env(safe-area-inset-bottom) + 32px)"
>
	<!-- Bento grid -->
	<div class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
		<!-- Weight -->
		{#if data.weight}
			{@const w = data.weight}
			<MetricCard
				label="WEIGHT"
				value={w.kg.toFixed(1)}
				unit="kg"
				delta={weightDelta ?? undefined}
			>
				{#snippet footer()}
					{#if data.weightSparkline.length > 1}
						<Sparkline data={data.weightSparkline} colorVar="--data-1" />
					{:else}
						<p class="text-xs text-subtle">{dateRelative(w.recordedAt)}</p>
					{/if}
				{/snippet}
			</MetricCard>
		{:else}
			<Card>
				<p class="text-xs tracking-[0.04em] uppercase text-muted">WEIGHT</p>
				<p class="mt-2 text-sm text-subtle">No data yet.</p>
			</Card>
		{/if}

		<!-- Calories -->
		<MetricCard label="CALORIES" value={fmt(data.nutrition.kcal)} unit="kcal">
			{#snippet footer()}
				<ProgressBar
					value={data.nutrition.kcal}
					goal={calGoal}
					showLabel={false}
					ceiling
					label="Calories goal"
				/>
				<p class="mt-1 text-xs text-muted tabular-nums">
					{fmt(Math.max(0, calGoal - data.nutrition.kcal))} left
				</p>
			{/snippet}
		</MetricCard>

		<!-- Steps (2-span on mobile) -->
		<MetricCard
			label="STEPS"
			value={fmt(data.activity?.steps ?? 0)}
			class="col-span-2 md:col-span-1"
		>
			{#snippet footer()}
				<ProgressBar
					value={data.activity?.steps ?? 0}
					goal={stepsGoal}
					showLabel={false}
					label="Steps goal"
				/>
				<p class="mt-1 text-xs text-muted tabular-nums">goal {fmt(stepsGoal)}</p>
			{/snippet}
		</MetricCard>

		<!-- Water -->
		<MetricCard label="WATER" value={fmt(data.waterMl)} unit="ml">
			{#snippet footer()}
				<ProgressBar
					value={data.waterMl}
					goal={waterGoal}
					showLabel={false}
					label="Water goal"
				/>
			{/snippet}
		</MetricCard>
	</div>

	<!-- Quick-log row -->
	<section class="mt-6 space-y-2">
		<p class="text-xs tracking-[0.04em] uppercase text-muted">Quick log</p>
		<div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
			<form
				method="POST"
				action="?/addWater"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							toast.success('+250 ml water');
							await invalidateAll();
						} else {
							toast.error('Could not log water');
						}
					};
				}}
			>
				<input type="hidden" name="amount_ml" value="250" />
				<Button
					variant="secondary"
					size="default"
					class="shrink-0 whitespace-nowrap"
					type="submit"
				>
					<Droplets class="size-4" aria-hidden="true" />
					+250 ml
				</Button>
			</form>
			<form
				method="POST"
				action="?/addWater"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							toast.success('+500 ml water');
							await invalidateAll();
						} else {
							toast.error('Could not log water');
						}
					};
				}}
			>
				<input type="hidden" name="amount_ml" value="500" />
				<Button
					variant="secondary"
					size="default"
					class="shrink-0 whitespace-nowrap"
					type="submit"
				>
					<Droplets class="size-4" aria-hidden="true" />
					+500 ml
				</Button>
			</form>
			<Button
				variant="secondary"
				size="default"
				class="shrink-0 whitespace-nowrap"
				onclick={() => toast.message('Meal logging comes in Phase 5')}
			>
				<Utensils class="size-4" aria-hidden="true" />
				Log meal
			</Button>
		</div>
	</section>

	<!-- Protein + Sleep + This-week trend -->
	<div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
		<MetricCard label="PROTEIN" value={fmt(data.nutrition.proteinG)} unit="g">
			{#snippet footer()}
				<p class="text-xs text-muted tabular-nums">today</p>
			{/snippet}
		</MetricCard>

		{#if sleepDuration}
			<MetricCard label="SLEEP" value={sleepDuration}>
				{#snippet footer()}
					<p class="text-xs text-muted tabular-nums">
						{data.sleep?.startedAt
							? dateRelative(new Date(data.sleep.startedAt).toISOString().slice(0, 10))
							: ''}
					</p>
				{/snippet}
			</MetricCard>
		{:else}
			<Card>
				<p class="text-xs tracking-[0.04em] uppercase text-muted">SLEEP</p>
				<p class="mt-2 text-sm text-subtle">No data yet.</p>
			</Card>
		{/if}

		{#if data.weightSparkline.length > 1}
			<MetricCard
				hero
				label="THIS WEEK"
				value={data.weight ? data.weight.kg.toFixed(1) : '—'}
				unit="kg"
				delta={weightDelta ?? undefined}
				class="col-span-2"
			>
				{#snippet footer()}
					<Sparkline data={data.weightSparkline} colorVar="--data-1" height={48} />
				{/snippet}
			</MetricCard>
		{/if}
	</div>
</main>

<!--
  Quick-log Sheet — multi-mode shell.
  No mode: 4 buttons. With a mode: that form fills the body, with a back chevron.
  Closing the sheet resets the mode so reopening starts fresh at the chooser.
-->
<Sheet
	bind:open={sheetOpen}
	title={logMode === null
		? 'Quick log'
		: logMode === 'water'
			? 'Log water'
			: logMode === 'weight'
				? 'Log weight'
				: logMode === 'measurement'
					? 'Body measurements'
					: 'Log meal'}
	description={logMode === null ? 'What do you want to log?' : undefined}
>
	{#snippet headerAction()}
		{#if logMode !== null}
			<Button
				type="button"
				variant="ghost"
				size="compact"
				onclick={() => (logMode = null)}
				aria-label="Back to choices"
			>
				<ChevronLeft class="size-4" aria-hidden="true" />
				Back
			</Button>
		{/if}
	{/snippet}

	{#if logMode === null}
		<div class="grid grid-cols-2 gap-3 py-2">
			<Button variant="secondary" class="h-20 w-full flex-col" onclick={() => (logMode = 'water')}>
				<Droplets class="size-5" aria-hidden="true" />
				<span>Water</span>
			</Button>
			<Button
				variant="secondary"
				class="h-20 w-full flex-col"
				onclick={() => (logMode = 'weight')}
			>
				<Scale class="size-5" aria-hidden="true" />
				<span>Weight</span>
			</Button>
			<Button variant="secondary" class="h-20 w-full flex-col" onclick={() => (logMode = 'meal')}>
				<Utensils class="size-5" aria-hidden="true" />
				<span>Meal</span>
			</Button>
			<Button
				variant="secondary"
				class="h-20 w-full flex-col"
				onclick={() => (logMode = 'measurement')}
			>
				<Ruler class="size-5" aria-hidden="true" />
				<span>Measurements</span>
			</Button>
		</div>
	{:else if logMode === 'water'}
		<WaterForm onSubmitted={closeSheet} />
	{:else if logMode === 'weight'}
		<WeightForm onSubmitted={closeSheet} />
	{:else if logMode === 'measurement'}
		<BodyMeasurementForm onSubmitted={closeSheet} />
	{:else if logMode === 'meal'}
		<div class="rounded-md border border-(color:--border-default) bg-surface-sunken p-4 text-sm text-muted">
			Meal flow lands in the next commit of Phase 5 — needs the food library route to come with it.
		</div>
	{/if}
</Sheet>

<FAB label="Quick log" onclick={() => (sheetOpen = true)} />
<TabBar
	items={tabs}
	active={activeTab}
	onSelect={(t) => {
		if (t === 'home') return;
		toast.message(`${t} page comes in a later phase`);
	}}
/>
