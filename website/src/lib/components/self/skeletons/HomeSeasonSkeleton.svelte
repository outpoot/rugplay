<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

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
