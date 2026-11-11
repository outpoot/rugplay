<script lang="ts">
	let {
		points,
		positive = true,
		class: className = ''
	}: { points: number[]; positive?: boolean; class?: string } = $props();

	const WIDTH = 100;
	const HEIGHT = 32;
	const PAD = 2;
	const uid = $props.id();

	let path = $derived.by(() => {
		if (points.length < 2) return null;
		const min = Math.min(...points);
		const max = Math.max(...points);
		const range = max - min || 1;
		const step = WIDTH / (points.length - 1);
		const coords = points.map((value, i) => {
			const x = i * step;
			// A flat series sits in the middle instead of on the floor.
			const y =
				max === min ? HEIGHT / 2 : PAD + (1 - (value - min) / range) * (HEIGHT - PAD * 2);
			return `${x.toFixed(2)},${y.toFixed(2)}`;
		});
		const line = `M${coords.join(' L')}`;
		return { line, area: `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z` };
	});
</script>

{#if path}
	<svg
		viewBox="0 0 {WIDTH} {HEIGHT}"
		preserveAspectRatio="none"
		class="{positive ? 'text-success' : 'text-destructive'} {className}"
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="{uid}-fill" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="currentColor" stop-opacity="0.25" />
				<stop offset="100%" stop-color="currentColor" stop-opacity="0" />
			</linearGradient>
		</defs>
		<path d={path.area} fill="url(#{uid}-fill)" />
		<path
			d={path.line}
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>
	</svg>
{/if}
