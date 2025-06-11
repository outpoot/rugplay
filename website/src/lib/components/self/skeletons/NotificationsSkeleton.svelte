<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="space-y-1">
	{#each Array(8) as _, i}
		<div class="flex items-start gap-4 rounded-md p-3">
			<Skeleton class="h-8 w-8 flex-shrink-0 rounded-full" />
			<div class="min-w-0 flex-1 space-y-2">
				<Skeleton class="h-4 w-48" />
				<Skeleton class="h-3 w-full max-w-md" />
			</div>
			<div class="flex flex-shrink-0 flex-col items-end gap-1">
				<Skeleton class="h-3 w-16" />
			</div>
		</div>
		{#if i < 7}
			<div class="border-border border-t"></div>
		{/if}
	{/each}
</div>
