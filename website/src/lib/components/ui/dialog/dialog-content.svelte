<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import * as Dialog from "./index.js";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import { swipeToDismiss } from '$lib/utils/swipe-dismiss';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		sheet = true,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: DialogPrimitive.PortalProps;
		children: Snippet;
		sheet?: boolean;
	} = $props();

	let closeButton = $state<HTMLButtonElement | null>(null);

	$effect(() => {
		if (!ref || !sheet) return;
		return swipeToDismiss(ref, {
			direction: 'down',
			enabled: () => window.matchMedia('(max-width: 639px)').matches,
			onDismiss: () => closeButton?.click(),
			getBackdrop: () =>
				document.querySelector<HTMLElement>('[data-slot="dialog-overlay"][data-state="open"]')
		});
	});
</script>

<Dialog.Portal {...portalProps}>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
			sheet &&
				"max-sm:data-[state=open]:slide-in-from-bottom-1/4 max-sm:data-[state=closed]:slide-out-to-bottom-1/4 max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:zoom-in-100 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[90dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
			className
		)}
		{...restProps}
	>
		{#if sheet}
			<div
				aria-hidden="true"
				class="bg-muted-foreground/30 -mb-2 -mt-3 h-1.5 w-10 self-center justify-self-center rounded-full sm:hidden"
			></div>
		{/if}
		{@render children?.()}
		<DialogPrimitive.Close
			bind:ref={closeButton}
			class="ring-offset-background focus:ring-ring rounded-xs focus:outline-hidden absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
		>
			<HugeiconsIcon icon={Cancel01Icon} />
			<span class="sr-only">Close</span>
		</DialogPrimitive.Close>
	</DialogPrimitive.Content>
</Dialog.Portal>
