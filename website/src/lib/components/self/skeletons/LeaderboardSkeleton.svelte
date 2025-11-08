<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="grid gap-4 md:gap-6 xl:grid-cols-2">
	{#each Array(4) as _}
		<Card.Root class="overflow-hidden">
			<Card.Header class="pb-3 md:pb-4">
				<Card.Title class="flex items-center gap-2">
					<Skeleton class="h-5 w-5 md:h-6 md:w-6" />
					<Skeleton class="h-5 w-32 md:h-6 md:w-40" />
				</Card.Title>
				<Card.Description>
					<Skeleton class="h-3 w-48 md:h-4 md:w-64" />
				</Card.Description>
			</Card.Header>
			<Card.Content class="p-3 pt-0 md:p-6 md:pt-0">
				<div class="space-y-3 md:space-y-4">
					{#each Array(5) as _}
						<div class="flex items-center gap-2 border-b pb-3 last:border-b-0 md:gap-4 md:pb-4">
							<Skeleton class="h-5 w-6 md:h-6 md:w-8" />
							<Skeleton class="h-6 w-6 rounded-full md:h-8 md:w-8" />
							<div class="min-w-0 flex-1">
								<Skeleton class="h-3 w-16 md:h-4 md:w-24" />
								<Skeleton class="mt-1 h-2 w-12 md:h-3 md:w-16" />
							</div>
							<Skeleton class="h-3 w-12 md:h-4 md:w-20" />
							<Skeleton class="h-4 w-12 md:h-5 md:w-16" />
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
