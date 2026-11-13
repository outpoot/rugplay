<script lang="ts">
	import { getColorByKey } from '$lib/data/shop-catalog';

	interface Props {
		name: string;
		nameColor?: string | null;
		founderBadge?: boolean;
		class?: string;
		truncate?: boolean;
	}

	let {
		name,
		nameColor = null,
		founderBadge = false,
		class: className = '',
		truncate = true
	}: Props = $props();

	let clipClass = $derived(truncate ? 'min-w-0 truncate' : 'min-w-0 break-words');

	let colorItem = $derived(nameColor ? getColorByKey(nameColor) : null);
</script>

<span class="inline-flex max-w-full items-center gap-1">
	{#if colorItem}
		<span
			class="{clipClass} {colorItem.classes} {className}"
			style={colorItem.style ?? ''}
		>
			{name}
		</span>
	{:else}
		<span class="{clipClass} {className}">{name}</span>
	{/if}
	{#if founderBadge}
		<span title="Founder" class="shrink-0 text-xs text-cyan-400">💎</span>
	{/if}
</span>
