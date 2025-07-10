<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import { browser } from '$app/environment';

	let { ref = $bindable(null), disabled = false, ...restProps }: TooltipPrimitive.TriggerProps = $props();
</script>

{#if browser}
	<TooltipPrimitive.Trigger bind:ref {disabled} data-slot="tooltip-trigger" {...restProps} />
{:else}
	<!-- SSR fallback -->
	<div
		bind:this={ref}
		data-slot="tooltip-trigger"
		{...Object.fromEntries(
			Object.entries(restProps).filter(
				([key]) => !key.startsWith('on:') // Remove Svelte event handlers
			)
		)}
	></div>
{/if}
