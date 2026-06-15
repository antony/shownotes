<script lang="ts">
	import { marked } from 'marked';
	import markedFootnote from 'marked-footnote';

	marked.use(markedFootnote());
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
	let content = $state('');
	let prevContent = $state<string | null>(null);
	let nextContent = $state<string | null>(null);

	let html = $derived(
		notes
			? (marked.parse(notes) as string)
			: '<p class="empty">No presenter notes for this slide.</p>'
	);

	let title = $derived(
		content.match(/^#\s+(.+)$/m)?.[1] ?? `Slide ${index + 1}`
	);
	let slideHtml = $derived(marked.parse(content) as string);
	let prevHtml = $derived(prevContent ? (marked.parse(prevContent) as string) : null);
	let nextHtml = $derived(nextContent ? (marked.parse(nextContent) as string) : null);

	let channel: BroadcastChannel;

	onMount(() => {
		channel = new BroadcastChannel('md-present');

		channel.onmessage = (e) => {
			if (e.data?.type === 'slide') {
				index = e.data.index;
				total = e.data.total;
				notes = e.data.notes;
				directives = e.data.directives ?? [];
				content = e.data.content ?? '';
				prevContent = e.data.prevContent ?? null;
				nextContent = e.data.nextContent ?? null;
			}
		};

		channel.postMessage({ type: 'request-slide' });
		return () => channel.close();
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			channel?.postMessage({ type: 'toggle-crawl' });
			return;
		}

		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown':
			case ' ':
				e.preventDefault();
				channel?.postMessage({ type: 'nav', to: 'next' });
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
			case 'Backspace':
				e.preventDefault();
				channel?.postMessage({ type: 'nav', to: 'prev' });
				break;
			case 'Home':
				e.preventDefault();
				channel?.postMessage({ type: 'nav', to: 'first' });
				break;
			case 'End':
				e.preventDefault();
				channel?.postMessage({ type: 'nav', to: 'last' });
				break;
		}
	}

	const directiveDescriptions: Record<string, (v: string) => string> = {
		animate: (v) => `Transition: ${v}`
	};

	function describeDirective(d: Directive): string {
		const fn = directiveDescriptions[d.name];
		return fn ? fn(d.value) : `${d.name}: ${d.value}`;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>Presenter Notes</title>
</svelte:head>

<div class="notes-view">
	<header>
		<h2>{title}</h2>
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

	<div class="slide-previews">
		<div class="preview prev" class:empty={!prevHtml}>
			{#if prevHtml}
				<span class="preview-label">Previous</span>
				<div class="preview-slide"><div class="preview-slide-inner">{@html prevHtml}</div></div>
			{/if}
		</div>
		<div class="preview current">
			<span class="preview-label">Current</span>
			<div class="preview-slide"><div class="preview-slide-inner">{@html slideHtml}</div></div>
		</div>
		<div class="preview next" class:empty={!nextHtml}>
			{#if nextHtml}
				<span class="preview-label">Next</span>
				<div class="preview-slide"><div class="preview-slide-inner">{@html nextHtml}</div></div>
			{/if}
		</div>
	</div>

	<div class="notes-content">
		{@html html}
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f5f0e8;
		color: #3a3a3a;
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
		background: #ebe5d9;
		border-bottom: 2px solid #c8c0b0;
	}

	header h2 {
		margin: 0;
		font-size: 1.2rem;
		color: #4a4a4a;
	}

	.counter {
		font-size: 0.95rem;
		color: #777;
		font-variant-numeric: tabular-nums;
	}

	/* ── Directives bar ── */

	.directives-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.75rem 2rem;
		background: #efe9dd;
		border-bottom: 1px solid #d5cfc3;
	}

	.directive {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(90, 80, 65, 0.1);
		border: 1px solid #c8c0b0;
		border-radius: 4px;
		padding: 0.3rem 0.7rem;
		font-size: 0.85rem;
		color: #5a5045;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.directive-icon {
		font-size: 0.8rem;
	}

	/* ── Slide previews ── */

	.slide-previews {
		display: flex;
		gap: 1rem;
		padding: 1rem 2rem;
		background: #ebe5d9;
		border-bottom: 1px solid #d5cfc3;
		align-items: flex-start;
		flex-shrink: 0;
	}

	.preview {
		flex: 1;
		min-width: 0;
	}

	.preview.current {
		flex: 1.5;
	}

	.preview.empty {
		visibility: hidden;
	}

	.preview-label {
		display: block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #999;
		margin-bottom: 0.4rem;
	}

	.preview-slide {
		background: #1a1a2e;
		color: #e0e0e0;
		border-radius: 6px;
		overflow: hidden;
		aspect-ratio: 16 / 9;
		position: relative;
	}

	.preview-slide-inner {
		position: absolute;
		top: 0;
		left: 0;
		width: 133%;
		height: 133%;
		transform: scale(0.75);
		transform-origin: top left;
		padding: 2rem 2.5rem;
		font-size: 1.4rem;
		line-height: 1.6;
	}

	.preview.current .preview-slide {
		box-shadow: 0 0 0 2px #32B0A2;
	}

	.preview-slide-inner :global(h1) {
		font-size: 2.8rem;
		margin: 0 0 0.3rem;
		color: #32B0A2;
		border-bottom: 1px solid rgba(50, 176, 162, 0.3);
		padding-bottom: 0.2rem;
	}

	.preview-slide-inner :global(h2),
	.preview-slide-inner :global(h3) {
		font-size: 2rem;
		color: #32B0A2;
	}

	.preview-slide-inner :global(p) {
		font-size: 1.4rem;
		margin: 0.2rem 0;
	}

	.preview-slide-inner :global(ul),
	.preview-slide-inner :global(ol) {
		font-size: 1.4rem;
		padding-left: 1em;
	}

	.preview-slide-inner :global(pre) {
		background: #16213e;
		padding: 1rem;
		border-radius: 6px;
		font-size: 1.2rem;
	}

	.preview-slide-inner :global(code) {
		font-size: 1.2rem;
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
		color: #4a4a4a;
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
		background: #e8e2d6;
		padding: 0.15em 0.4em;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.notes-content :global(pre) {
		background: #e8e2d6;
		padding: 1.2rem;
		border-radius: 8px;
		overflow-x: auto;
	}

	.notes-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.notes-content :global(blockquote) {
		border-left: 4px solid #c8c0b0;
		margin: 1rem 0;
		padding: 0.5rem 1.5rem;
		color: #666;
		font-style: italic;
	}

	.notes-content :global(.empty) {
		color: #999;
		font-style: italic;
	}
</style>
