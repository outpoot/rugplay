<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from "bits-ui";
	import { browser } from "$app/environment";

	let {
		ref = $bindable(null),
		open = $bindable(false),
		children,
		...restProps
	}: CollapsiblePrimitive.RootProps = $props();
</script>

{#if browser}
	<CollapsiblePrimitive.Root bind:ref bind:open data-slot="collapsible" {...restProps}>
		{@render children?.()}
	</CollapsiblePrimitive.Root>
{:else}
	<div data-slot="collapsible">
		{@render children?.()}
	</div>
{/if}
