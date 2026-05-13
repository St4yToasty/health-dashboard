<script lang="ts">
	import LcWeight from '$lib/dev/charts/layerchart/WeightLine.svelte';
	import LcSteps from '$lib/dev/charts/layerchart/StepsBar.svelte';
	import LcSpark from '$lib/dev/charts/layerchart/WeightSparkline.svelte';
	import LcDonut from '$lib/dev/charts/layerchart/SleepDonut.svelte';

	import EcWeight from '$lib/dev/charts/echarts/WeightLine.svelte';
	import EcSteps from '$lib/dev/charts/echarts/StepsBar.svelte';
	import EcSpark from '$lib/dev/charts/echarts/WeightSparkline.svelte';
	import EcDonut from '$lib/dev/charts/echarts/SleepDonut.svelte';

	import UnWeight from '$lib/dev/charts/unovis/WeightLine.svelte';
	import UnSteps from '$lib/dev/charts/unovis/StepsBar.svelte';
	import UnSpark from '$lib/dev/charts/unovis/WeightSparkline.svelte';
	import UnDonut from '$lib/dev/charts/unovis/SleepDonut.svelte';

	import { libraryNotes } from '$lib/dev/chart-fixtures';

	const ROWS = [
		{
			title: 'Weight — 30-day trend',
			subtitle: 'Smooth line + gradient area. Tests axis, tooltip, hover.',
			cells: [LcWeight, EcWeight, UnWeight]
		},
		{
			title: 'Steps — 14-day bars',
			subtitle: 'Bar chart, narrow weekday labels, rounded top corners.',
			cells: [LcSteps, EcSteps, UnSteps]
		},
		{
			title: 'Weight sparkline — 7 days',
			subtitle: 'No axes, no labels. The KPI-card use case.',
			cells: [LcSpark, EcSpark, UnSpark]
		},
		{
			title: 'Sleep stages — donut',
			subtitle: '4-slice donut, centred legend, custom colors per slice.',
			cells: [LcDonut, EcDonut, UnDonut]
		}
	];
</script>

<svelte:head>
	<title>Chart shootout · health-dashboard</title>
</svelte:head>

<main class="min-h-dvh px-4 py-6 md:px-8 md:py-10">
	<div class="mx-auto max-w-6xl space-y-8">
		<header class="space-y-2">
			<p class="text-xs tracking-[0.04em] text-(color:--fg-muted) uppercase">
				Phase 3 · chart library shootout
			</p>
			<h1 class="text-2xl font-semibold text-(color:--fg-default)">Pick a chart library</h1>
			<p class="text-base text-(color:--fg-muted)">
				Same data, same dimensions, same color tokens. The only thing that varies is the
				rendering. Compare on aesthetics, mobile feel, and code shape (see notes per library
				below).
			</p>
		</header>

		<section class="grid gap-3 md:grid-cols-3">
			{#each libraryNotes as note (note.name)}
				<article
					class="rounded-lg border border-(color:--border-default) bg-(color:--bg-surface) p-4 shadow-[var(--elev-1)]"
				>
					<h3 class="text-md font-semibold text-(color:--fg-default)">{note.name}</h3>
					<dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
						<dt class="text-(color:--fg-muted)">Bundle</dt>
						<dd class="text-(color:--fg-default)">{note.bundle}</dd>
						<dt class="text-(color:--fg-muted)">API</dt>
						<dd class="text-(color:--fg-default)">{note.api}</dd>
						<dt class="text-(color:--fg-muted)">Theme</dt>
						<dd class="text-(color:--fg-default)">{note.theme}</dd>
					</dl>
				</article>
			{/each}
		</section>

		{#each ROWS as row (row.title)}
			<section class="space-y-3">
				<div>
					<h2 class="text-lg font-semibold text-(color:--fg-default)">{row.title}</h2>
					<p class="text-sm text-(color:--fg-muted)">{row.subtitle}</p>
				</div>
				<div class="grid gap-3 md:grid-cols-3">
					{#each row.cells as Cell, i (i)}
						<article
							class="rounded-lg border border-(color:--border-default) bg-(color:--bg-surface) p-4 shadow-[var(--elev-1)]"
						>
							<p class="mb-2 text-xs tracking-[0.04em] text-(color:--fg-subtle) uppercase">
								{libraryNotes[i].name}
							</p>
							<Cell />
						</article>
					{/each}
				</div>
			</section>
		{/each}

		<footer
			class="rounded-lg border border-(color:--border-default) bg-(color:--bg-surface-sunken) p-4 text-sm text-(color:--fg-muted)"
		>
			This page is for Phase 3 decision-making only. After you pick a winner, the other two
			libraries are uninstalled and this route is deleted.
		</footer>
	</div>
</main>
