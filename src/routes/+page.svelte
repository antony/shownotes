<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	let { data } = $props();
	let current = $state(0);
	let direction = $state<'fwd' | 'bwd'>('fwd');
	const total = data.slides.length;

	let channel: BroadcastChannel;

	onMount(() => {
		channel = new BroadcastChannel('md-present');
		channel.onmessage = (e) => {
			if (e.data?.type === 'request-slide') broadcast();
		};
		broadcast();
		return () => channel.close();
	});

	function broadcast() {
		const slide = data.slides[current];
		channel?.postMessage({
			type: 'slide',
			index: current,
			notes: slide.notes,
			directives: slide.directives,
			total
		});
	}

	function goTo(i: number) {
		if (i < 0 || i >= total || i === current) return;
		direction = i > current ? 'fwd' : 'bwd';
		current = i;
		broadcast();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.code === 'KeyT' && e.altKey && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			window.open('/notes', 'md-present-notes', 'popup');
			return;
		}

		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown':
			case ' ':
				e.preventDefault();
				goTo(current + 1);
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
			case 'Backspace':
				e.preventDefault();
				goTo(current - 1);
				break;
			case 'Home':
				e.preventDefault();
				goTo(0);
				break;
			case 'End':
				e.preventDefault();
				goTo(total - 1);
				break;
		}
	}

	let slide = $derived(data.slides[current]);
	let html = $derived(marked.parse(slide.content) as string);
	let animation = $derived(
		slide.directives.find((d) => d.name === 'animate')?.value ?? 'none'
	);
</script>

<svelte:window onkeydown={onKeydown} />

<div class="presentation">
	{#key current}
		<div
			class="slide"
			class:anim-fade={animation === 'fade'}
			class:anim-slide-fwd={animation === 'slide-in' && direction === 'fwd'}
			class:anim-slide-bwd={animation === 'slide-in' && direction === 'bwd'}
			class:anim-zoom={animation === 'zoom'}
			class:anim-flip={animation === 'flip'}
			class:anim-drop={animation === 'drop'}
		>
			{@html html}
		</div>
	{/key}
	<footer>
		<button onclick={() => goTo(current - 1)} disabled={current === 0}>←</button>
		<span class="counter">{current + 1} / {total}</span>
		<button onclick={() => goTo(current + 1)} disabled={current === total - 1}>→</button>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #1a1a2e;
		color: #e0e0e0;
		font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
	}

	.presentation {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.slide {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 4rem 8rem;
		overflow-y: auto;
	}

	/* ── Animations ── */

	.anim-fade {
		animation: fade-in 0.7s ease-out;
	}
	.anim-slide-fwd {
		animation: slide-from-right 0.7s ease-out;
	}
	.anim-slide-bwd {
		animation: slide-from-left 0.7s ease-out;
	}
	.anim-zoom {
		animation: zoom-in 0.7s ease-out;
	}
	.anim-flip {
		animation: flip-in 0.8s ease-out;
	}
	.anim-drop {
		animation: drop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
	@keyframes slide-from-right {
		from { transform: translateX(60px); opacity: 0; }
		to   { transform: translateX(0);    opacity: 1; }
	}
	@keyframes slide-from-left {
		from { transform: translateX(-60px); opacity: 0; }
		to   { transform: translateX(0);     opacity: 1; }
	}
	@keyframes zoom-in {
		from { transform: scale(0.85); opacity: 0; }
		to   { transform: scale(1);    opacity: 1; }
	}
	@keyframes flip-in {
		from { transform: perspective(800px) rotateX(-90deg); opacity: 0; }
		to   { transform: perspective(800px) rotateX(0);      opacity: 1; }
	}
	@keyframes drop-in {
		from { transform: translateY(-80px); opacity: 0; }
		to   { transform: translateY(0);     opacity: 1; }
	}

	/* ── Slide content ── */

	.slide :global(h1) {
		font-size: 3rem;
		margin: 0 0 1.5rem;
		color: #e94560;
		border-bottom: 2px solid #e9456040;
		padding-bottom: 0.5rem;
	}

	.slide :global(p) {
		font-size: 1.4rem;
		line-height: 1.8;
		margin: 0.5rem 0;
	}

	.slide :global(ul),
	.slide :global(ol) {
		font-size: 1.3rem;
		line-height: 2;
	}

	.slide :global(code) {
		background: #16213e;
		padding: 0.15em 0.4em;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.slide :global(pre) {
		background: #16213e;
		padding: 1.5rem;
		border-radius: 8px;
		overflow-x: auto;
	}

	.slide :global(pre code) {
		background: none;
		padding: 0;
		font-size: 1.1rem;
	}

	.slide :global(blockquote) {
		border-left: 4px solid #e94560;
		margin: 1rem 0;
		padding: 0.5rem 1.5rem;
		color: #b0b0b0;
		font-style: italic;
	}

	/* ── Footer ── */

	footer {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		padding: 1rem;
		background: #16213e;
	}

	footer button {
		background: #e94560;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1.2rem;
		font-size: 1.2rem;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	footer button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	footer button:not(:disabled):hover {
		opacity: 0.85;
	}

	.counter {
		font-size: 1rem;
		color: #888;
		font-variant-numeric: tabular-nums;
	}
</style>
