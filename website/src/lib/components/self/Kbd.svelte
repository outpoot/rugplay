<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

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
