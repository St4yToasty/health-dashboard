<script lang="ts">
	import { onMount } from 'svelte';

	type Theme = 'auto' | 'light' | 'dark';

	let theme = $state<Theme>('auto');

	onMount(() => {
		const stored = (localStorage.getItem('theme') as Theme | null) ?? 'auto';
		theme = stored;
	});

	function applyTheme(next: Theme) {
		theme = next;
		try {
			localStorage.setItem('theme', next);
		} catch (_) {
			/* ignore */
		}
		const resolved =
			next === 'auto'
				? window.matchMedia('(prefers-color-scheme: light)').matches
					? 'light'
					: 'dark'
				: next;
		if (resolved === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	}
</script>

<svelte:head>
	<title>Health Dashboard</title>
</svelte:head>

<main class="min-h-dvh px-4 py-8 md:px-8 md:py-12">
	<div class="mx-auto max-w-2xl space-y-8">
		<header class="space-y-2">
			<p class="text-xs tracking-[0.04em] text-muted uppercase">Health dashboard</p>
			<h1 class="text-2xl font-semibold text-default">Phase 0 — foundations</h1>
			<p class="text-base text-muted">
				SvelteKit scaffolded, Tailwind v4 + design tokens wired, both themes working. The real
				bento home lands in Phase 4.
			</p>
		</header>

		<section
			class="rounded-lg border border-(color:--border-default) bg-surface p-5 shadow-[var(--elev-1)]"
		>
			<h2 class="text-md mb-3 font-semibold text-default">Theme</h2>
			<div class="flex gap-2">
				{#each ['auto', 'light', 'dark'] as const as option (option)}
					<button
						type="button"
						onclick={() => applyTheme(option)}
						class="rounded-md border border-(color:--border-default) px-3 py-1.5 text-sm transition-colors"
						class:bg-accent={theme === option}
						class:text-accent-fg={theme === option}
						class:text-default={theme !== option}
					>
						{option}
					</button>
				{/each}
			</div>
			<p class="text-sm text-subtle mt-3">Active: <span class="text-default">{theme}</span></p>
		</section>

		<section
			class="rounded-lg border border-(color:--border-default) bg-surface p-5 shadow-[var(--elev-1)]"
		>
			<h2 class="text-md mb-3 font-semibold text-default">Token sanity check</h2>
			<dl class="grid grid-cols-2 gap-3 text-sm">
				<dt class="text-muted">Big number (tabular)</dt>
				<dd class="num text-2xl font-semibold text-default">82.4</dd>
				<dt class="text-muted">Accent</dt>
				<dd class="text-accent font-medium">indigo lead</dd>
				<dt class="text-muted">Positive signal</dt>
				<dd class="text-positive font-medium">▼ -1.2 kg</dd>
				<dt class="text-muted">Warning signal</dt>
				<dd class="text-warning font-medium">approaching cap</dd>
				<dt class="text-muted">Danger signal</dt>
				<dd class="text-danger font-medium">exceeded</dd>
			</dl>
		</section>
	</div>
</main>
