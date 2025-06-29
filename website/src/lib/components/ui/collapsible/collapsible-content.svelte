<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from "bits-ui";
	import { browser } from "$app/environment";

	let { 
		ref = $bindable(null), 
		children,
		...restProps 
	}: CollapsiblePrimitive.ContentProps = $props();
</script>

{#if browser}
	<CollapsiblePrimitive.Content bind:ref data-slot="collapsible-content" {...restProps}>
		{@render children?.()}
	</CollapsiblePrimitive.Content>
{:else}
	<div data-slot="collapsible-content" {...restProps}>
		{@render children?.()}
	</div>
{/if}
