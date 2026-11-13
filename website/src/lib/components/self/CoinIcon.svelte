<script lang="ts">
	import { getPublicUrl } from '$lib/utils';

	let {
		icon,
		symbol,
		name = symbol,
		size = 6,
		class: className = ''
	} = $props<{
		icon?: string | null;
		symbol: string;
		name?: string;
		size?: number;
		class?: string;
	}>();

	let sizeClass = $derived(`h-${size} w-${size}`);
	let textClass = $derived(size <= 4 ? 'text-[7px]' : size <= 5 ? 'text-[9px]' : 'text-xs');
	let failedIcon = $state<string | null>(null);
</script>

{#if icon && icon !== failedIcon}
	<img
		src={getPublicUrl(icon)}
		alt={name}
		class="{sizeClass} shrink-0 rounded-full object-cover {className}"
		loading="lazy"
		decoding="async"
		onerror={() => (failedIcon = icon ?? null)}
	/>
{:else}
	<div
		class="{sizeClass} bg-primary flex shrink-0 items-center justify-center overflow-hidden rounded-full {className}"
	>
		<span class="{textClass} font-bold leading-none text-white">{symbol.slice(0, 2)}</span>
	</div>
{/if}
