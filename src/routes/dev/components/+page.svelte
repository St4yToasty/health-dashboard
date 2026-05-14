<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Input from '$lib/components/Input.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import FAB from '$lib/components/FAB.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import type { IconComponent } from '$lib/icons';

	import { toast } from 'svelte-sonner';
	import Plus from 'lucide-svelte/icons/plus';
	import Home from 'lucide-svelte/icons/home';
	import LineChart from 'lucide-svelte/icons/line-chart';
	import PlusSquare from 'lucide-svelte/icons/plus-square';
	import Settings from 'lucide-svelte/icons/settings';
	import Apple from 'lucide-svelte/icons/apple';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	// Form state.
	let weightValue = $state(82.4);
	let waterValue = $state('');
	let errorValue = $state('abc');

	// Segmented control state.
	type Range = 'D' | 'W' | 'M' | 'Y' | 'All';
	let range = $state<Range>('W');

	// Sparkline fixture.
	const today = new Date();
	const day = (offset: number) => {
		const d = new Date(today);
		d.setDate(today.getDate() + offset);
		return d;
	};
	const weight7 = Array.from({ length: 7 }, (_, i) => ({
		date: day(i - 6),
		value: 84 - i * 0.2 + Math.sin(i * 1.3) * 0.3
	}));

	// Tab bar state.
	type Tab = 'home' | 'log' | 'trends' | 'settings';
	let activeTab = $state<Tab>('home');
	const tabs = [
		{ value: 'home' as const, label: 'Home', icon: Home as unknown as IconComponent },
		{ value: 'log' as const, label: 'Log', icon: PlusSquare as unknown as IconComponent },
		{ value: 'trends' as const, label: 'Trends', icon: LineChart as unknown as IconComponent },
		{
			value: 'settings' as const,
			label: 'Settings',
			icon: Settings as unknown as IconComponent,
			badge: 2
		}
	];

	// Sheet state.
	let sheetOpen = $state(false);

	const TrashIcon = Trash2 as unknown as IconComponent;
	const AppleIcon = Apple as unknown as IconComponent;
</script>

<svelte:head>
	<title>Components · health-dashboard</title>
</svelte:head>

<Toaster />

<main
	class="min-h-dvh px-4 pt-6 md:px-8 md:pt-10"
	style:padding-bottom="calc(56px + 56px + env(safe-area-inset-bottom) + 32px)"
>
	<div class="mx-auto max-w-4xl space-y-10">
		<header class="space-y-2">
			<p class="text-xs tracking-[0.04em] uppercase text-muted">Phase 3 · components</p>
			<h1 class="text-2xl font-semibold text-default">Showcase</h1>
			<p class="text-base text-muted">
				Every component from <code>design-system/MASTER.md §7</code>. Open in both themes —
				switch with the buttons on <code>/</code>.
			</p>
		</header>

		<!-- ───────── Buttons ───────── -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-default">Button</h2>
			<Card>
				<div class="space-y-4">
					<div class="flex flex-wrap items-center gap-3">
						<Button variant="primary">Primary</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="destructive">Destructive</Button>
						<Button variant="tonal">Tonal accent</Button>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<Button size="default">Default</Button>
						<Button size="compact">Compact</Button>
						<Button size="icon" aria-label="Add">
							<Plus class="size-5" aria-hidden="true" />
						</Button>
						<Button loading>Loading</Button>
						<Button disabled>Disabled</Button>
					</div>
				</div>
			</Card>
		</section>

		<!-- ───────── Cards & Badges ───────── -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-default">Card &amp; Badge</h2>
			<div class="grid gap-3 md:grid-cols-2">
				<Card>
					<p class="text-sm text-default">A plain card.</p>
				</Card>
				<Card interactive>
					<p class="text-sm text-default">An interactive card (hover/press).</p>
				</Card>
			</div>
			<Card>
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="tonal">tonal</Badge>
					<Badge variant="positive">▼ on track</Badge>
					<Badge variant="warning">approaching cap</Badge>
					<Badge variant="danger">over by 120</Badge>
					<Badge variant="neutral">neutral</Badge>
				</div>
			</Card>
		</section>

		<!-- ───────── Inputs ───────── -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-default">Input</h2>
			<Card>
				<div class="grid gap-4 md:grid-cols-2">
					<Input label="Weight" type="number" bind:value={weightValue} unit="kg" />
					<Input
						label="Water"
						type="number"
						bind:value={waterValue}
						unit="ml"
						placeholder="e.g. 250"
						helperText="Quick-add buttons cover the common amounts."
					/>
					<Input label="Disabled" value="—" disabled />
					<Input
						label="With error"
						type="text"
						bind:value={errorValue}
						error="Must be a number"
					/>
				</div>
			</Card>
		</section>

		<!-- ───────── Progress + segmented ───────── -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-default">ProgressBar &amp; SegmentedControl</h2>
			<Card>
				<div class="space-y-5">
					<ProgressBar value={1240} goal={1800} unit="kcal" ceiling />
					<ProgressBar value={6800} goal={8000} unit="steps" />
					<ProgressBar value={2750} goal={2500} unit="ml" />
					<ProgressBar value={2100} goal={1800} unit="kcal" ceiling />

					<div>
						<p class="mb-2 text-xs tracking-[0.04em] uppercase text-muted">Range</p>
						<SegmentedControl
							items={[
								{ value: 'D', label: 'D' },
								{ value: 'W', label: 'W' },
								{ value: 'M', label: 'M' },
								{ value: 'Y', label: 'Y' },
								{ value: 'All', label: 'All' }
							] as const}
							bind:value={range}
							label="Time range"
						/>
						<p class="mt-2 text-sm text-muted">
							Active: <span class="text-default">{range}</span>
						</p>
					</div>
				</div>
			</Card>
		</section>

		<!-- ───────── ListRow + EmptyState ───────── -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-default">ListRow &amp; EmptyState</h2>
			<div class="grid gap-3 md:grid-cols-2">
				<Card class="!p-0">
					<ListRow onclick={() => toast.message('Oatmeal tapped')}>
						{#snippet leading()}<AppleIcon class="size-5 text-muted" />{/snippet}
						{#snippet title()}Oatmeal{/snippet}
						{#snippet subtitle()}breakfast · 50 g{/snippet}
						{#snippet trailing()}190 kcal{/snippet}
					</ListRow>
					<ListRow dividerTop onclick={() => toast.message('Chicken tapped')}>
						{#snippet leading()}<AppleIcon class="size-5 text-muted" />{/snippet}
						{#snippet title()}Chicken breast{/snippet}
						{#snippet subtitle()}lunch · 150 g{/snippet}
						{#snippet trailing()}247 kcal{/snippet}
					</ListRow>
					<ListRow dividerTop>
						{#snippet leading()}<AppleIcon class="size-5 text-muted" />{/snippet}
						{#snippet title()}Greek yogurt 0%{/snippet}
						{#snippet subtitle()}dinner · 170 g{/snippet}
						{#snippet trailing()}100 kcal{/snippet}
					</ListRow>
				</Card>

				<Card>
					<EmptyState
						icon={TrashIcon}
						title="No meals logged today"
						description="Tap the + button to add your first meal."
					>
						{#snippet action()}
							<Button variant="primary" size="compact">Log a meal</Button>
						{/snippet}
					</EmptyState>
				</Card>
			</div>
		</section>

		<!-- ───────── MetricCard ───────── -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-default">MetricCard</h2>
			<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
				<MetricCard
					label="WEIGHT"
					value="82.4"
					unit="kg"
					delta={{ value: -1.2, positive: true, suffix: 'kg' }}
				>
					{#snippet footer()}<Sparkline data={weight7} colorVar="--data-1" />{/snippet}
				</MetricCard>

				<MetricCard label="CALORIES" value="1240" unit="kcal">
					{#snippet footer()}
						<ProgressBar value={1240} goal={1800} showLabel={false} ceiling />
					{/snippet}
				</MetricCard>

				<MetricCard label="STEPS" value="7,432">
					{#snippet footer()}
						<Sparkline data={weight7} colorVar="--data-2" />
					{/snippet}
				</MetricCard>

				<MetricCard
					hero
					label="THIS WEEK"
					value="-1.2"
					unit="kg"
					delta={{ value: -0.4, positive: true, suffix: 'kg/wk' }}
					class="col-span-2"
				>
					{#snippet footer()}<Sparkline data={weight7} colorVar="--data-1" height={48} />{/snippet}
				</MetricCard>

				<MetricCard label="SLEEP" value="7h 12m">
					{#snippet footer()}<Sparkline data={weight7} colorVar="--data-4" />{/snippet}
				</MetricCard>
			</div>
		</section>

		<!-- ───────── Sheet + Toast ───────── -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-default">Sheet &amp; Toast</h2>
			<Card>
				<div class="flex flex-wrap items-center gap-3">
					<Button onclick={() => (sheetOpen = true)}>Open Sheet</Button>
					<Button variant="tonal" onclick={() => toast.success('Logged 250 ml of water')}>
						toast.success
					</Button>
					<Button variant="secondary" onclick={() => toast.error('Could not reach Postgres')}>
						toast.error
					</Button>
					<Button variant="ghost" onclick={() => toast.message('Synced 12 entries from HAE')}>
						toast.message
					</Button>
				</div>
			</Card>
		</section>
	</div>
</main>

<Sheet bind:open={sheetOpen} title="Quick log" description="Pick something to log right now.">
	<div class="grid grid-cols-2 gap-3 py-2">
		<Button
			variant="secondary"
			onclick={() => {
				toast.success('+250 ml water');
				sheetOpen = false;
			}}
		>
			+250 ml water
		</Button>
		<Button
			variant="secondary"
			onclick={() => {
				toast.success('+500 ml water');
				sheetOpen = false;
			}}
		>
			+500 ml water
		</Button>
		<Button
			variant="secondary"
			onclick={() => {
				toast.message('Weight form would open');
				sheetOpen = false;
			}}
		>
			Weight
		</Button>
		<Button
			variant="secondary"
			onclick={() => {
				toast.message('Meal form would open');
				sheetOpen = false;
			}}
		>
			Meal
		</Button>
	</div>
</Sheet>

<FAB label="Quick log" onclick={() => (sheetOpen = true)} />
<TabBar items={tabs} active={activeTab} onSelect={(t) => (activeTab = t)} />
