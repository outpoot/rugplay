<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { showSeason = true }: { showSeason?: boolean } = $props();
</script>

<div class="container mx-auto">
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#if showSeason}
			<div class="order-last md:col-span-2 lg:order-none lg:col-span-1 lg:col-start-4 lg:row-span-2 lg:row-start-1">
				<Card.Root class="flex h-full min-h-[212px] flex-col gap-0">
					<Card.Header class="pb-4">
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 items-center gap-2">
								<Skeleton class="h-6 w-24" />
								<Skeleton class="h-5 w-10 rounded-full" />
							</div>
							<div class="shrink-0 space-y-1">
								<Skeleton class="h-7 w-20" />
								<Skeleton class="ml-auto h-3 w-14" />
							</div>
						</div>
						<div class="mt-4 space-y-2">
							<Skeleton class="h-4 w-full" />
							<Skeleton class="h-4 w-11/12" />
							<Skeleton class="h-4 w-3/5" />
						</div>
					</Card.Header>
					<Card.Content class="flex flex-1 flex-col gap-4">
						<div class="flex-1 space-y-0.5">
							{#each Array(5) as _}
								<div class="flex items-center gap-2 px-2 py-1.5">
									<Skeleton class="h-4 w-4 shrink-0 rounded-full" />
									<Skeleton class="h-6 w-6 shrink-0 rounded-full" />
									<Skeleton class="h-4 flex-1" />
									<div class="space-y-1">
										<Skeleton class="ml-auto h-4 w-14" />
										<Skeleton class="ml-auto h-3 w-8" />
									</div>
								</div>
							{/each}
						</div>
						<Skeleton class="h-9 w-full" />
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		{#each Array(6) as _}
			<Card.Root class="flex h-full min-h-[212px] flex-col gap-0">
				<Card.Header class="pb-4">
					<Card.Title class="flex min-w-0 items-center gap-3">
						<Skeleton class="h-10 w-10 shrink-0 rounded-full" />
						<div class="min-w-0 flex-1 space-y-1.5">
							<Skeleton class="h-4 w-3/4" />
							<Skeleton class="h-4 w-12 rounded-full" />
						</div>
					</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-1 flex-col justify-center gap-2 py-2">
					<Skeleton class="h-3 w-9" />
					<div class="flex items-center gap-3">
						<Skeleton class="h-9 w-24" />
						<Skeleton class="h-6 w-16 rounded-full" />
					</div>
				</Card.Content>
				<Card.Footer class="mt-4 border-t pt-4">
					<div class="grid w-full grid-cols-2 gap-3">
						<div class="space-y-1.5">
							<Skeleton class="h-3 w-14" />
							<Skeleton class="h-4 w-16" />
						</div>
						<div class="flex flex-col items-end space-y-1.5">
							<Skeleton class="h-3 w-16" />
							<Skeleton class="h-4 w-14" />
						</div>
					</div>
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>

	<!-- Market Overview Skeleton -->
	<div class="mt-12">
		<Skeleton class="mb-4 h-8 w-40" />
		<Card.Root>
			<Card.Content class="p-0">
				<div class="p-6">
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
