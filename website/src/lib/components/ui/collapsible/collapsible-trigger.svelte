<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
	import { browser } from '$app/environment';

	let {
		ref = $bindable(null),
		children,
		...restProps
	}: CollapsiblePrimitive.TriggerProps = $props();
</script>

{#if browser}
	<CollapsiblePrimitive.Trigger bind:ref data-slot="collapsible-trigger" {...restProps}>
		{@render children?.()}
	</CollapsiblePrimitive.Trigger>
{:else}
	<button data-slot="collapsible-trigger" {...restProps}>
		{@render children?.()}
	</button>
{/if}
