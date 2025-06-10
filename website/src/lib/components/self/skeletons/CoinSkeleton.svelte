<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import HoldersSkeleton from './HoldersSkeleton.svelte';
</script>

<header class="mb-8">
	<div class="mb-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex items-center gap-3 sm:gap-4">
			<Skeleton class="h-12 w-12 rounded-lg sm:h-16 sm:w-16" />
			<div class="min-w-0 flex-1">
				<Skeleton class="mb-2 h-6 w-40 sm:h-10 sm:w-48" />
				<div class="mt-1 flex flex-wrap items-center gap-2">
					<Skeleton class="h-5 w-12 sm:h-6 sm:w-24" />
				</div>
			</div>
		</div>
		<div class="flex flex-col items-start gap-2 sm:items-end sm:text-right">
			<Skeleton class="h-6 w-28 sm:h-8 sm:w-32" />
			<div class="flex items-center gap-2">
				<Skeleton class="h-5 w-12 sm:h-6 sm:w-24" />
			</div>
		</div>
	</div>

	<!-- Creator Info Skeleton -->
	<div class="text-muted-foreground mt-6 flex flex-wrap items-center gap-2 text-sm">
		<Skeleton class="h-4 w-20" />
		<Skeleton class="h-4 w-4 rounded-full" />
		<Skeleton class="h-4 w-40" />
	</div>
</header>

<div class="grid gap-6">
	<!-- Price Chart with Trading Actions -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Chart (2/3 width) -->
		<div class="lg:col-span-2">
			<Card.Root class="flex h-full flex-col">
				<Card.Header class="pb-4">
					<div class="flex items-center justify-between">
						<Card.Title class="flex items-center gap-2">
							<Skeleton class="h-5 w-5" />
							<Skeleton class="h-6 w-32" />
						</Card.Title>
						<div class="w-24">
							<Skeleton class="h-10 w-full" />
						</div>
					</div>
				</Card.Header>
				<Card.Content class="flex-1 pt-0">
					<Skeleton class="h-full min-h-[500px] w-full" />
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right side - Trading Actions + Liquidity Pool + Top Holders (1/3 width) -->
		<div class="space-y-6 lg:col-span-1">
			<!-- Trading Actions Skeleton -->
			<Card.Root class="gap-3">
				<Card.Header>
					<Card.Title>
						<Skeleton class="h-6 w-24" />
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						<Skeleton class="h-11 w-full" />
						<Skeleton class="h-11 w-full" />
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Liquidity Pool Skeleton -->
			<Card.Root>
				<Card.Content>
					<div class="space-y-5">
						<div>
							<Skeleton class="mb-3 h-5 w-32" />
							<div class="mt-4 space-y-3">
								<div class="flex justify-between">
									<Skeleton class="h-4 w-16" />
									<Skeleton class="h-4 w-20" />
								</div>
								<div class="flex justify-between">
									<Skeleton class="h-4 w-24" />
									<Skeleton class="h-4 w-20" />
								</div>
							</div>
						</div>
						<div>
							<Skeleton class="mb-3 h-5 w-20" />
							<div class="mt-4 space-y-3">
								<div class="flex justify-between">
									<Skeleton class="h-4 w-24" />
									<Skeleton class="h-4 w-20" />
								</div>
								<div class="flex justify-between">
									<Skeleton class="h-4 w-20" />
									<Skeleton class="h-4 w-20" />
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Top Holders Section Skeleton -->
			<Card.Root class="gap-2">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">Top Holders</Card.Title>
				</Card.Header>
				<Card.Content class="relative">
					<HoldersSkeleton />
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Statistics Grid Skeleton -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each Array(4) as _}
			<Card.Root class="gap-1">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-sm font-medium">
						<Skeleton class="h-4 w-4" />
						<Skeleton class="h-4 w-20" />
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<Skeleton class="mb-1 h-6 w-24" />
					<Skeleton class="h-3 w-16" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Comments Section Skeleton -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Skeleton class="h-5 w-5" />
				<Skeleton class="h-6 w-20" />
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				{#each Array(3) as _}
					<div class="flex gap-3 border-b pb-4 last:border-b-0">
						<Skeleton class="h-8 w-8 rounded-full" />
						<div class="flex-1">
							<div class="mb-2 flex items-center gap-2">
								<Skeleton class="h-4 w-24" />
								<Skeleton class="h-3 w-16" />
							</div>
							<Skeleton class="h-4 w-full" />
							<Skeleton class="mt-1 h-4 w-3/4" />
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</div>
