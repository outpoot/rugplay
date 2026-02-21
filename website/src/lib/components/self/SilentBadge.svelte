<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	interface Props {
		icon: any;
		text: string;
		class?: string;
	}

	let { icon: Icon, text, class: className }: Props = $props();

	const isImagePath = $derived(typeof Icon === 'string');
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		<div class="cursor-pointer rounded-full p-1 opacity-80 hover:opacity-100 {className}">
			{#if isImagePath}
				<img src={Icon} alt={text} class="h-4 w-4" />
			{:else}
				<HugeiconsIcon icon={Icon} class="h-4 w-4" />
			{/if}
		</div>
	</Tooltip.Trigger>
	<Tooltip.Content
		class="bg-secondary text-secondary-foreground ring-border ring-1"
		arrowClasses="bg-secondary"
	>
		<p>{text}</p>
	</Tooltip.Content>
</Tooltip.Root>
