<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { browser } from '$app/environment';

	let { ref = $bindable(null), ...restProps }: DropdownMenuPrimitive.TriggerProps = $props();
</script>

{#if browser}
	<DropdownMenuPrimitive.Trigger bind:ref data-slot="dropdown-menu-trigger" {...restProps}>
		{@render restProps.children?.()}
	</DropdownMenuPrimitive.Trigger>
{:else}
	<!-- SSR fallback -->
	<button bind:this={ref} data-slot="dropdown-menu-trigger" type="button" {...restProps}>
		{@render restProps.children?.()}
	</button>
{/if}
