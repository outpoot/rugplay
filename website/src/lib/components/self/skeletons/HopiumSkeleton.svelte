<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
	{#each Array(6) as _}
		<Card.Root class="flex flex-col">
			<Card.Header class="pb-4">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 space-y-3">
						<!-- Question title skeleton -->
						<Skeleton class="h-6 w-full" />
						<Skeleton class="h-6 w-3/4" />
					</div>

					<div class="flex flex-col items-end gap-2">
						<!-- Probability meter skeleton -->
						<div class="relative flex h-12 w-16 items-end justify-center">
							<Skeleton class="h-10 w-16 rounded-full" />
							<div class="absolute bottom-0">
								<Skeleton class="h-4 w-8" />
							</div>
						</div>
					</div>
				</div>

				<!-- Time and amount info skeleton -->
				<div class="flex items-center gap-2">
					<Skeleton class="h-4 w-24" />
					<Skeleton class="h-1 w-1 rounded-full" />
					<Skeleton class="h-4 w-16" />
				</div>

				<!-- Creator info skeleton -->
				<div class="mt-2 mb-2 flex items-center gap-2">
					<Skeleton class="h-5 w-5 rounded-full" />
					<Skeleton class="h-4 w-20" />
				</div>
			</Card.Header>
		</Card.Root>
	{/each}
</div>
