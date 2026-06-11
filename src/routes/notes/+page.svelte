<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	interface Directive {
		name: string;
		value: string;
		raw: string;
	}

	let index = $state(0);
	let total = $state(0);
	let notes = $state('');
	let directives = $state<Directive[]>([]);

	let html = $derived(
		notes
			? (marked.parse(notes) as string)
			: '<p class="empty">No presenter notes for this slide.</p>'
	);

	onMount(() => {
		const channel = new BroadcastChannel('md-present');

		channel.onmessage = (e) => {
			if (e.data?.type === 'slide') {
				index = e.data.index;
				total = e.data.total;
				notes = e.data.notes;
				directives = e.data.directives ?? [];
			}
		};

		channel.postMessage({ type: 'request-slide' });
		return () => channel.close();
	});

	const directiveDescriptions: Record<string, (v: string) => string> = {
		animate: (v) => `Transition: ${v}`
	};

	function describeDirective(d: Directive): string {
		const fn = directiveDescriptions[d.name];
		return fn ? fn(d.value) : `${d.name}: ${d.value}`;
	}
</script>

<svelte:head>
	<title>Presenter Notes</title>
</svelte:head>

<div class="notes-view">
	<header>
		<h2>Presenter Notes</h2>
		{#if total > 0}
			<span class="counter">Slide {index + 1} / {total}</span>
		{/if}
	</header>

	{#if directives.length > 0}
		<div class="directives-bar">
			{#each directives as d}
				<span class="directive" title={d.raw}>
					<span class="directive-icon">⚙</span>
					{describeDirective(d)}
				</span>
			{/each}
		</div>
	{/if}

	<div class="notes-content">
		{@html html}
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #0f0f23;
		color: #e0e0e0;
		font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
	}

	.notes-view {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: #16213e;
		border-bottom: 2px solid #e9456040;
	}

	header h2 {
		margin: 0;
		font-size: 1.2rem;
		color: #e94560;
	}

	.counter {
		font-size: 0.95rem;
		color: #888;
		font-variant-numeric: tabular-nums;
	}

	/* ── Directives bar ── */

	.directives-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.75rem 2rem;
		background: #1a1a2e;
		border-bottom: 1px solid #ffffff10;
	}

	.directive {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: #e9456020;
		border: 1px solid #e9456050;
		border-radius: 4px;
		padding: 0.3rem 0.7rem;
		font-size: 0.85rem;
		color: #e94560;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.directive-icon {
		font-size: 0.8rem;
	}

	/* ── Notes content ── */

	.notes-content {
		flex: 1;
		padding: 2rem 3rem;
		overflow-y: auto;
	}

	.notes-content :global(h1),
	.notes-content :global(h2),
	.notes-content :global(h3) {
		color: #e94560;
	}

	.notes-content :global(p) {
		font-size: 1.15rem;
		line-height: 1.7;
		margin: 0.5rem 0;
	}

	.notes-content :global(ul),
	.notes-content :global(ol) {
		font-size: 1.1rem;
		line-height: 1.8;
	}

	.notes-content :global(code) {
		background: #16213e;
		padding: 0.15em 0.4em;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.notes-content :global(pre) {
		background: #16213e;
		padding: 1.2rem;
		border-radius: 8px;
		overflow-x: auto;
	}

	.notes-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.notes-content :global(blockquote) {
		border-left: 4px solid #e94560;
		margin: 1rem 0;
		padding: 0.5rem 1.5rem;
		color: #b0b0b0;
		font-style: italic;
	}

	.notes-content :global(.empty) {
		color: #555;
		font-style: italic;
	}
</style>
