<script lang="ts">
	import { getColorByKey } from '$lib/data/shop-catalog';

	interface Props {
		name: string;
		nameColor?: string | null;
		founderBadge?: boolean;
		class?: string;
	}

	let { name, nameColor = null, founderBadge = false, class: className = '' }: Props = $props();

	let colorItem = $derived(nameColor ? getColorByKey(nameColor) : null);
	let isMythical = $derived(colorItem?.rarity === 'mythical');

	// Fixed, deliberately-hand-placed sparkle positions/timings rather than
	// random per-render — keeps it visually consistent instead of jittering
	// every time the component re-mounts.
	//
	// Kept strictly inside the 0–100% box (nothing negative, nothing at
	// exactly 100%) on purpose: UserName renders inside all kinds of
	// containers across the app (comment rows, leaderboard cells, hover
	// card triggers, etc), many of which use `truncate`/`overflow-hidden`
	// for layout. Sparkles that poke outside their own bounding box get
	// silently clipped by any such ancestor — moving them inward instead
	// of relying on ancestors to allow overflow fixes that everywhere at
	// once instead of patching each call site.
	const SPARKLES = [
		{ top: '2%', left: '2%', size: '9px', delay: '0s', duration: '2.2s' },
		{ top: '8%', left: '88%', size: '8px', delay: '0.6s', duration: '2.6s' },
		{ top: '78%', left: '18%', size: '7px', delay: '1.1s', duration: '2.1s' },
		{ top: '65%', left: '82%', size: '8px', delay: '1.6s', duration: '2.4s' }
	];
</script>

<span class="inline-flex items-center gap-1">
	{#if colorItem}
		<span class="relative inline-block">
			<span
				class="{colorItem.classes} {className}"
				style={colorItem.style ?? ''}
			>
				{name}
			</span>
			{#if isMythical}
				{#each SPARKLES as s, i (i)}
					<span
						class="mythical-sparkle"
						style="top: {s.top}; left: {s.left}; font-size: {s.size}; animation-delay: {s.delay}; animation-duration: {s.duration};"
						aria-hidden="true"
					>
						✦
					</span>
				{/each}
			{/if}
		</span>
	{:else}
		<span class={className}>{name}</span>
	{/if}
	{#if founderBadge}
		<span title="Founder" class="text-cyan-400 text-xs">💎</span>
	{/if}
</span>

