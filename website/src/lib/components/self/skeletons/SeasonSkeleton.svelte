<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div>
	<header class="mb-6">
		<div class="flex items-start justify-between gap-4">
			<div class="flex min-w-0 items-center gap-2">
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-6 w-14 rounded-full" />
			</div>
			<div class="shrink-0 space-y-1">
				<Skeleton class="h-8 w-32" />
				<Skeleton class="ml-auto h-3 w-16" />
			</div>
		</div>
		<Skeleton class="mt-2 h-4 w-full" />
	</header>

	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="min-w-0 flex-1 space-y-2">
					<Skeleton class="h-5 w-52" />
					<Skeleton class="h-4 w-full max-w-lg" />
					<Skeleton class="h-4 w-2/3 max-w-sm" />
				</div>
				<Skeleton class="h-9 w-full shrink-0 sm:w-32" />
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Skeleton class="h-6 w-28" />
		</Card.Header>
		<Card.Content>
			<div class="space-y-1">
				{#each Array(10) as _}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton class="h-4 w-4 shrink-0 rounded-full" />
						<Skeleton class="h-7 w-7 shrink-0 rounded-full" />
						<Skeleton class="h-4 min-w-0 flex-1 max-w-[220px]" />
						<Skeleton class="h-4 w-14 shrink-0" />
						<Skeleton class="h-4 w-20 shrink-0" />
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-6">
		<Card.Header>
			<Skeleton class="h-6 w-32" />
		</Card.Header>
		<Card.Content class="space-y-2">
			{#each Array(3) as _}
				<div class="flex items-center gap-3 px-2 py-1.5">
					<Skeleton class="h-4 w-4 shrink-0 rounded-full" />
					<Skeleton class="h-4 flex-1 max-w-[180px]" />
					<Skeleton class="h-3 w-20 shrink-0" />
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
