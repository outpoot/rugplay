<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<!-- Header Section -->
<div class="flex items-center gap-3">
	<div class="bg-muted rounded-lg p-4">
		<Skeleton class="h-14 w-14" />
	</div>
	<div class="flex-1">
		<Skeleton class="mb-2 h-8 w-3/4" />
		<Skeleton class="h-4 w-1/3" />
	</div>
</div>

<!-- Creator Info -->
<div class="mt-3 mb-4 flex flex-wrap items-center gap-1.5">
	<Skeleton class="h-3 w-16" />
	<Skeleton class="h-4 w-4 rounded-full" />
	<Skeleton class="h-4 w-32" />
</div>

<div class="grid gap-8">
	<!-- Main content grid -->
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Left: Chart (2/3 width) -->
		<div class="lg:col-span-2">
			<Card.Root class="shadow-sm">
				<Card.Header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<Skeleton class="h-6 w-6" />
							<Skeleton class="h-6 w-16" />
						</div>
						<div class="text-right">
							<Skeleton class="mb-1 h-10 w-20" />
							<Skeleton class="h-4 w-16" />
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<Skeleton class="h-[400px] w-full rounded-lg" />
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right: Trading Controls (1/3 width) -->
		<div class="space-y-6 lg:col-span-1">
			<!-- Trading Card -->
			<Card.Root>
				<Card.Header>
					<Skeleton class="h-6 w-20" />
				</Card.Header>
				<Card.Content class="space-y-6">
					<!-- YES/NO Buttons -->
					<div class="grid grid-cols-2 gap-4">
						<Skeleton class="h-12 w-full rounded-md" />
						<Skeleton class="h-12 w-full rounded-md" />
					</div>

					<!-- Amount Input -->
					<Skeleton class="h-10 w-full rounded-md" />

					<!-- Quick Amount Buttons -->
					<div class="flex gap-2">
						<Skeleton class="h-9 flex-1 rounded-md" />
						<Skeleton class="h-9 flex-1 rounded-md" />
						<Skeleton class="h-9 flex-1 rounded-md" />
						<Skeleton class="h-9 flex-1 rounded-md" />
					</div>

					<!-- Win Estimation -->
					<div class="space-y-2">
						<div class="flex justify-between">
							<Skeleton class="h-4 w-16" />
							<Skeleton class="h-4 w-12" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-4 w-16" />
							<Skeleton class="h-4 w-12" />
						</div>
					</div>

					<!-- Pay Button -->
					<Skeleton class="h-12 w-full rounded-md" />
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Position and Stats Cards below chart -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Position Card -->
		<Card.Root class="gap-1">
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="bg-muted rounded-full p-2">
						<Skeleton class="h-5 w-5" />
					</div>
					<Skeleton class="h-6 w-32" />
				</div>
			</Card.Header>
			<Card.Content class="pb-4">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<Skeleton class="mb-1 h-4 w-16" />
							<Skeleton class="h-3 w-20" />
						</div>
						<Skeleton class="h-6 w-16" />
					</div>
					<div class="flex items-center justify-between">
						<div>
							<Skeleton class="mb-1 h-4 w-14" />
							<Skeleton class="h-3 w-20" />
						</div>
						<Skeleton class="h-6 w-16" />
					</div>
					<Separator />
					<div class="flex items-center justify-between">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="h-6 w-16" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Market Stats Card -->
		<Card.Root class="gap-1">
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="bg-muted rounded-full p-2">
						<Skeleton class="h-5 w-5" />
					</div>
					<Skeleton class="h-6 w-28" />
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					<div class="flex justify-between">
						<Skeleton class="h-4 w-20" />
						<Skeleton class="h-4 w-16" />
					</div>
					<div class="flex justify-between">
						<Skeleton class="h-4 w-16" />
						<Skeleton class="h-4 w-8" />
					</div>
					<div class="flex justify-between">
						<Skeleton class="h-4 w-14" />
						<Skeleton class="h-4 w-20" />
					</div>
					<div class="flex justify-between">
						<Skeleton class="h-4 w-16" />
						<Skeleton class="h-4 w-20" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Recent Activity Section -->
	<Card.Root class="shadow-sm">
		<Card.Header>
			<div class="flex items-center gap-3">
				<div class="bg-muted rounded-full p-2">
					<Skeleton class="h-6 w-6" />
				</div>
				<Skeleton class="h-6 w-32" />
			</div>
		</Card.Header>
		<Card.Content class="pb-6">
			<div class="space-y-4">
				{#each Array(3) as _}
					<div class="flex items-center justify-between rounded-xl border p-4">
						<div class="flex items-center gap-4">
							<Skeleton class="h-10 w-10 rounded-full" />
							<div>
								<Skeleton class="mb-1 h-4 w-24" />
								<Skeleton class="h-3 w-16" />
							</div>
							<Skeleton class="h-5 w-8 rounded-full" />
						</div>
						<div class="text-right">
							<Skeleton class="mb-1 h-5 w-12" />
							<Skeleton class="h-3 w-16" />
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</div>
