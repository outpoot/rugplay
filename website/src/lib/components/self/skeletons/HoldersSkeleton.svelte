<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="space-y-4">
	{#each Array(3) as _}
		<div class="flex items-center gap-2">
			<div class="flex min-w-0 flex-1 items-center gap-3">
				<Skeleton class="h-8 w-8 flex-shrink-0 rounded-full" />
				<div class="min-w-0 flex-1 space-y-1">
					<Skeleton class="h-4 w-24" />
					<Skeleton class="h-3 w-16" />
				</div>
			</div>

			<div class="flex flex-shrink-0 items-center gap-1.5">
				<div class="hidden sm:block">
					<Skeleton class="h-5 w-12 rounded-full" />
				</div>
				<div class="flex flex-col items-end gap-0.5">
					<Skeleton class="h-3 w-16" />
					<Skeleton class="h-3 w-12" />
				</div>
			</div>
		</div>
	{/each}
</div>
