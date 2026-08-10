<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { layout = 'feed' }: { layout?: 'feed' | 'magazine' } = $props();
</script>

{#if layout === 'magazine'}
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each Array(6) as _}
			<Card.Root class="overflow-hidden py-0 gap-0">
				<Skeleton class="aspect-[16/8] w-full rounded-none" />
				<Card.Content class="p-5">
					<div class="mb-3 flex items-center gap-2">
						<Skeleton class="h-5 w-20 rounded-full" />
						<Skeleton class="h-3 w-16" />
					</div>
					<Skeleton class="mb-2 h-5 w-full" />
					<Skeleton class="mb-3 h-5 w-2/3" />
					<Skeleton class="mb-1 h-3 w-full" />
					<Skeleton class="mb-4 h-3 w-4/5" />
					<div class="flex items-center gap-1">
						<Skeleton class="h-7 w-12" />
						<Skeleton class="h-7 w-12" />
						<Skeleton class="h-7 w-16" />
						<Skeleton class="ml-auto h-7 w-16" />
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{:else}
	<div class="space-y-3">
		{#each Array(6) as _}
			<Card.Root class="overflow-hidden py-0 gap-0">
				<div class="flex gap-3 p-3 sm:gap-4 sm:p-4">
					<Skeleton class="h-20 w-20 flex-shrink-0 rounded-lg sm:h-24 sm:w-24" />
					<div class="min-w-0 flex-1">
						<div class="mb-1.5 flex items-center gap-1.5">
							<Skeleton class="h-4 w-16 rounded-full" />
							<Skeleton class="h-3 w-12" />
						</div>
						<Skeleton class="mb-1 h-4 w-full" />
						<Skeleton class="mb-2 h-4 w-1/2" />
						<div class="flex items-center gap-1">
							<Skeleton class="h-6 w-10" />
							<Skeleton class="h-6 w-10" />
							<Skeleton class="h-6 w-12" />
						</div>
					</div>
				</div>
			</Card.Root>
		{/each}
	</div>
{/if}
