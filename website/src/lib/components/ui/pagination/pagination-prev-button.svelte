<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import { buttonVariants } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
	<HugeiconsIcon icon={ArrowLeft01Icon} class="size-4" />
	<span>Previous</span>
{/snippet}

<PaginationPrimitive.PrevButton
	bind:ref
	aria-label="Go to previous page"
	class={cn(
		buttonVariants({
			size: "default",
			variant: "ghost",
			class: "gap-1 px-2.5 sm:pl-2.5",
		}),
		className
	)}
	children={children || Fallback}
	{...restProps}
/>
