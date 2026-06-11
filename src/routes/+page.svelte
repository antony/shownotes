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
			else if (e.data?.type === 'nav') {
				if (e.data.to === 'next') goTo(current + 1);
				else if (e.data.to === 'prev') goTo(current - 1);
				else if (e.data.to === 'first') goTo(0);
				else if (e.data.to === 'last') goTo(total - 1);
				else if (typeof e.data.index === 'number') goTo(e.data.index);
			}
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

	const corners = ['top left', 'top right', 'bottom left', 'bottom right'];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let gradient = $derived(
		(() => {
			void current;
			const corner = corners[Math.floor(Math.random() * corners.length)];
			return `linear-gradient(to ${corner}, rgb(0, 0, 0), rgb(10, 10, 10))`;
		})()
	);
</script>

<svelte:window onkeydown={onKeydown} />

<div class="presentation">
	{#key current}
		<div
			class="slide"
			style:background={gradient}
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
	<div class="progress-bar">
		<div class="progress-fill" style:width="{((current + 1) / total) * 100}%"></div>
	</div>
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
		color: rgb(51, 167, 181);
		border-bottom: 2px solid rgba(51, 167, 181, 0.3);
		padding-bottom: 0.5rem;
	}

	.slide :global(h2),
	.slide :global(h3) {
		color: rgb(51, 167, 181);
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
		border-left: 4px solid rgb(51, 167, 181);
		margin: 1rem 0;
		padding: 0.5rem 1.5rem;
		color: #d8d8d8;
		font-style: italic;
	}

	/* ── Footer ── */

	.progress-bar {
		height: 8px;
		background: rgba(181, 65, 51, 0.15);
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(to right, rgb(181, 65, 51), rgb(232, 138, 124));
		transition: width 0.4s ease;
	}
</style>
