<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import HomeSeasonSkeleton from './HomeSeasonSkeleton.svelte';

	let { showSeason = true }: { showSeason?: boolean } = $props();
</script>

<div class="container mx-auto">
	<div class="grid grid-cols-1 gap-5 lg:grid-cols-4">
		<div class="flex flex-col gap-5 {showSeason ? 'lg:col-span-3' : 'lg:col-span-4'}">
			<div>
				<Skeleton class="mb-2 h-5 w-28" />
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{#each Array(6) as _}
						<div class="bg-card flex flex-col gap-2 rounded-xl border p-3">
							<div class="flex items-center gap-2.5">
								<Skeleton class="h-8 w-8 shrink-0 rounded-full" />
								<div class="min-w-0 flex-1 space-y-1">
									<Skeleton class="h-4 w-3/4" />
									<Skeleton class="h-3 w-12" />
								</div>
								<Skeleton class="h-5 w-14 rounded-full" />
							</div>
							<div class="flex items-center justify-between gap-3">
								<Skeleton class="h-7 w-24" />
								<Skeleton class="h-9 w-28" />
							</div>
							<div class="flex justify-between gap-2">
								<Skeleton class="h-3 w-20" />
								<Skeleton class="h-3 w-16" />
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
				{#each Array(3) as _}
					<div class="bg-card rounded-xl border p-3">
						<Skeleton class="mb-2.5 h-5 w-24" />
						{#each Array(5) as _}
							<div class="flex items-center gap-2 py-1.5">
								<Skeleton class="h-5 w-5 shrink-0 rounded-full" />
								<Skeleton class="h-4 flex-1" />
								<Skeleton class="h-4 w-12" />
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		{#if showSeason}
			<div class="lg:col-span-1">
				<HomeSeasonSkeleton />
			</div>
		{/if}
	</div>

	<!-- Market Overview Skeleton -->
	<div class="mt-6">
		<Skeleton class="mb-2 h-5 w-32" />
		<Card.Root class="py-2">
			<Card.Content class="p-0">
				<div class="px-3 py-2">
					<div class="mb-3 grid grid-cols-[minmax(180px,2fr)_repeat(4,minmax(80px,1fr))] gap-4">
						{#each Array(5) as _}
							<Skeleton class="h-4 w-16" />
						{/each}
					</div>
					{#each Array(10) as _}
						<div class="grid grid-cols-[minmax(180px,2fr)_repeat(4,minmax(80px,1fr))] items-center gap-4 border-b py-3 last:border-b-0">
							<div class="flex items-center gap-2">
								<Skeleton class="h-5 w-5 shrink-0 rounded-full" />
								<Skeleton class="h-4 w-24" />
							</div>
							{#each Array(4) as _}
								<Skeleton class="h-4 w-16" />
							{/each}
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
