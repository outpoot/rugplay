<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Refresh01Icon } from '@hugeicons/core-free-icons';
	import { haptic } from '$lib/stores/haptics';

	let { onRefresh }: { onRefresh: () => Promise<unknown> | unknown } = $props();

	const THRESHOLD = 72;
	const MAX_PULL = 120;
	const HOLD_AT = 56;

	let pull = $state(0);
	let refreshing = $state(false);
	let releasing = $state(false);
	let armed = $state(false);

	$effect(() => {
		const coarse = window.matchMedia('(pointer: coarse) and (max-width: 767px)');
		if (!coarse.matches) return;

		let startY = 0;
		let startX = 0;
		let tracking = false;
		let pulling = false;

		const sheetOpen = () => !!document.querySelector('[role="dialog"][data-state="open"]');

		function onStart(event: TouchEvent) {
			if (refreshing || event.touches.length !== 1 || window.scrollY > 0 || sheetOpen()) return;
			startY = event.touches[0].clientY;
			startX = event.touches[0].clientX;
			tracking = true;
			pulling = false;
		}

		function onMove(event: TouchEvent) {
			if (!tracking) return;
			const dy = event.touches[0].clientY - startY;
			const dx = event.touches[0].clientX - startX;
			if (!pulling) {
				if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
				if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) {
					tracking = false;
					return;
				}
				pulling = true;
				releasing = false;
			}
			event.preventDefault();
			pull = Math.min(MAX_PULL, dy * 0.5);
			const nowArmed = pull >= THRESHOLD;
			if (nowArmed && !armed) haptic.trigger('light');
			armed = nowArmed;
		}

		async function onEnd() {
			if (!tracking) return;
			tracking = false;
			if (!pulling) return;
			pulling = false;
			releasing = true;
			if (!armed) {
				pull = 0;
				return;
			}
			armed = false;
			refreshing = true;
			pull = HOLD_AT;
			const minimum = new Promise((resolve) => setTimeout(resolve, 600));
			try {
				await Promise.all([onRefresh(), minimum]);
				haptic.trigger('success');
			} finally {
				refreshing = false;
				pull = 0;
			}
		}

		// Disable the browser's own pull-to-refresh, which reloads the whole page
		const html = document.documentElement;
		const previous = html.style.overscrollBehaviorY;
		html.style.overscrollBehaviorY = 'contain';

		document.addEventListener('touchstart', onStart, { passive: true });
		document.addEventListener('touchmove', onMove, { passive: false });
		document.addEventListener('touchend', onEnd);
		document.addEventListener('touchcancel', onEnd);
		return () => {
			html.style.overscrollBehaviorY = previous;
			document.removeEventListener('touchstart', onStart);
			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onEnd);
			document.removeEventListener('touchcancel', onEnd);
		};
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 top-[calc(3rem+env(safe-area-inset-top))] z-20 flex justify-center md:hidden"
	aria-hidden={!refreshing}
>
	<div
		role="status"
		aria-live="polite"
		class="bg-background flex h-10 w-10 items-center justify-center rounded-full border shadow-md {releasing
			? 'transition-[transform,opacity] duration-300'
			: ''}"
		style="transform: translateY({pull - 48}px); opacity: {pull > 4 || refreshing ? 1 : 0};"
	>
		<span class="sr-only">{refreshing ? 'Refreshing' : ''}</span>
		<span
			class="inline-flex {refreshing ? 'animate-spin' : ''}"
			style={refreshing ? undefined : `transform: rotate(${pull * 3}deg)`}
		>
			<HugeiconsIcon
				icon={Refresh01Icon}
				class="h-5 w-5 {armed || refreshing ? 'text-primary' : 'text-muted-foreground'}"
			/>
		</span>
	</div>
</div>
