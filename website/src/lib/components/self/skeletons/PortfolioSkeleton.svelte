<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="container mx-auto max-w-7xl">
	<!-- Portfolio Summary Cards -->
	<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 lg:grid-cols-3">
		{#each Array(3) as _, i}
			<Card.Root
				class="gap-1 overflow-hidden {i === 0 ? 'col-span-2 lg:col-span-1' : 'py-4 sm:py-6'}"
			>
				<Card.Header class={i === 0 ? '' : 'px-4 sm:px-6'}>
					<Card.Title class="flex items-center gap-2">
						<Skeleton class="h-4 w-4" />
						<Skeleton class="h-4 w-16" />
					</Card.Title>
				</Card.Header>
				<Card.Content class={i === 0 ? '' : 'px-4 sm:px-6'}>
					<Skeleton class="h-8 w-24 md:h-9 md:w-32" />
					<Skeleton class="mt-2 h-3 w-20 md:w-24" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Holdings Table -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="pb-3 md:pb-4">
			<Card.Title>
				<Skeleton class="h-5 w-32 md:h-6 md:w-40" />
			</Card.Title>
			<Card.Description>
				<Skeleton class="h-3 w-48 md:h-4 md:w-64" />
			</Card.Description>
		</Card.Header>
		<Card.Content class="p-3 pt-0 md:p-6 md:pt-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[30%] min-w-[120px] md:w-[12%]">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
						<Table.Head class="w-[20%] min-w-[80px] md:w-[12%]">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
						<Table.Head class="w-[15%] min-w-[70px] md:w-[12%]">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
						<Table.Head class="w-[20%] min-w-[80px] md:w-[12%]">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
						<Table.Head class="w-[15%] min-w-[70px] md:w-[12%]">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
						<Table.Head class="hidden md:table-cell md:w-[12%]">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each Array(4) as _}
						<Table.Row>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Skeleton class="h-6 w-6 rounded-full" />
									<div>
										<Skeleton class="h-4 w-16" />
										<Skeleton class="mt-1 h-3 w-12" />
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-16" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-12" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-5 w-14 rounded-md" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-16" />
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell">
								<Skeleton class="h-5 w-12 rounded-md" />
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>

	<!-- Recent Transactions -->
	<Card.Root class="mt-6 overflow-hidden md:mt-8">
		<Card.Header class="pb-3 md:pb-4">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="flex items-center gap-2">
						<Skeleton class="h-5 w-5" />
						<Skeleton class="h-5 w-32 md:h-6 md:w-40" />
					</Card.Title>
					<Card.Description class="mt-1">
						<Skeleton class="h-3 w-40 md:h-4 md:w-48" />
					</Card.Description>
				</div>
				<Skeleton class="h-8 w-16 rounded-md md:w-20" />
			</div>
		</Card.Header>
		<Card.Content class="p-3 pt-0 md:p-6 md:pt-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[15%] min-w-[60px] md:w-[10%]">
							<Skeleton class="h-4 w-12" />
						</Table.Head>
						<Table.Head class="w-[30%] min-w-[100px] md:w-[20%]">
							<Skeleton class="h-4 w-12" />
						</Table.Head>
						<Table.Head class="w-[20%] min-w-[80px] md:w-[15%]">
							<Skeleton class="h-4 w-16" />
						</Table.Head>
						<Table.Head class="w-[15%] min-w-[70px] md:w-[15%]">
							<Skeleton class="h-4 w-12" />
						</Table.Head>
						<Table.Head class="w-[20%] min-w-[70px] md:w-[15%]">
							<Skeleton class="h-4 w-12" />
						</Table.Head>
						<Table.Head class="hidden md:table-cell md:w-[25%]">
							<Skeleton class="h-4 w-12" />
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each Array(5) as _}
						<Table.Row>
							<Table.Cell>
								<Skeleton class="h-5 w-10 rounded-md" />
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Skeleton class="h-4 w-4 rounded-full" />
									<div>
										<Skeleton class="h-4 w-12" />
										<Skeleton class="mt-1 h-3 w-10" />
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-16 font-mono" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-16" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-16" />
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell">
								<Skeleton class="h-4 w-24" />
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
