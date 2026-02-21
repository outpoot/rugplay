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
</script>

<span class="inline-flex items-center gap-1">
	{#if colorItem}
		<span
			class="{colorItem.classes} {className}"
			style={colorItem.style ?? ''}
		>
			{name}
		</span>
	{:else}
		<span class={className}>{name}</span>
	{/if}
	{#if founderBadge}
		<span title="Founder" class="text-cyan-400 text-xs">💎</span>
	{/if}
</span>
