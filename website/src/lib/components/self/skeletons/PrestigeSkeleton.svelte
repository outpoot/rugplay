<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Star } from 'lucide-svelte';
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<!-- Main Content Column -->
	<div class="flex flex-col lg:col-span-2">
		<!-- How Card Skeleton -->
		<Card.Root class="mb-6 gap-1">
			<Card.Header class="pb-2">
				<Card.Title class="text-base">How</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each Array(3) as _, i}
						<div class="flex gap-3">
							<div
								class="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium"
							>
								{i + 1}
							</div>
							<div class="flex-1 space-y-2">
								<Skeleton class="h-4 w-24" />
								<Skeleton class="h-3 w-full" />
								<Skeleton class="h-3 w-3/4" />
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Progress Card Skeleton -->
		<Card.Root class="flex flex-1 flex-col gap-1">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Star class="h-5 w-5" />
					Progress
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-1 flex-col space-y-6">
				<!-- Progress Section -->
				<div class="space-y-6">
					<div class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<Skeleton class="h-4 w-32" />
							<Skeleton class="h-4 w-12" />
						</div>
						<Skeleton class="h-2 w-full rounded-full" />
					</div>

					<!-- Financial Details Table Skeleton -->
					<div class="overflow-hidden rounded-xl border">
						<table class="w-full text-sm">
							<tbody class="divide-y">
								{#each Array(3) as _}
									<tr>
										<td class="px-3 py-2">
											<Skeleton class="h-4 w-20" />
										</td>
										<td class="px-3 py-2 text-right">
											<Skeleton class="ml-auto h-4 w-24" />
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<Skeleton class="h-4 w-40" />

				<!-- Prestige Button Skeleton -->
				<Skeleton class="h-12 w-full rounded-lg" />
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Right Column - Info -->
	<div class="flex flex-col space-y-4">
		<!-- Profile Preview Card Skeleton -->
		<Card.Root class="flex-1 gap-1">
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Preview</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Current Profile -->
				<div class="space-y-2">
					<Skeleton class="h-3 w-12" />
					<div class="flex items-center gap-3 rounded-lg border p-3">
						<Avatar.Root class="h-10 w-10 shrink-0">
							<Avatar.Fallback>
								<Skeleton class="h-full w-full rounded-full" />
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="min-w-0 flex-1 space-y-1">
							<div class="flex min-w-0 items-center gap-2">
								<Skeleton class="h-4 w-20" />
								<Skeleton class="h-4 w-16" />
							</div>
							<Skeleton class="h-3 w-16" />
						</div>
					</div>
				</div>

				<!-- Prestige Preview -->
				<div class="space-y-2">
					<Skeleton class="h-3 w-10" />
					<div
						class="flex items-center gap-3 rounded-lg border-2 border-yellow-500/30 bg-yellow-50/50 p-3 dark:bg-yellow-950/20"
					>
						<Avatar.Root class="h-10 w-10 shrink-0">
							<Avatar.Fallback>
								<Skeleton class="h-full w-full rounded-full" />
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="min-w-0 flex-1 space-y-1">
							<div class="flex min-w-0 items-center gap-2">
								<Skeleton class="h-4 w-20" />
								<Skeleton class="h-4 w-20" />
							</div>
							<Skeleton class="h-3 w-16" />
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- All Prestige Levels Skeleton -->
		<Card.Root class="flex-1 gap-1">
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Levels</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-1">
				{#each Array(5) as _}
					<div class="flex items-center justify-between py-1">
						<div class="flex items-center gap-2">
							<Skeleton class="h-4 w-4" />
							<Skeleton class="h-4 w-20" />
						</div>
						<Skeleton class="h-3 w-16" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
