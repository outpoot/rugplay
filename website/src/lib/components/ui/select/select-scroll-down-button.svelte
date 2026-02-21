<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props();
</script>

<SelectPrimitive.ScrollDownButton
	bind:ref
	data-slot="select-scroll-down-button"
	class={cn("flex cursor-default items-center justify-center py-1", className)}
	{...restProps}
>
	<HugeiconsIcon icon={ArrowDown01Icon} class="size-4" />
</SelectPrimitive.ScrollDownButton>
