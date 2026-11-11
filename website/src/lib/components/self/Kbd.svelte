<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	// One shortcut hint style for the whole app. Browsers render <kbd> in a
	// monospace font with its own line box, which left the label sitting high and
	// off-centre inside the border; a fixed-height flex box centres it both ways.
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<kbd
	class={cn(
		'inline-flex h-5 min-w-5 select-none items-center justify-center gap-0.5 rounded border px-1.5 font-sans text-[10px] font-medium leading-none',
		className
	)}
>
	{@render children?.()}
</kbd>
