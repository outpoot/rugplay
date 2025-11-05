<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { Badge } from '$lib/components/ui/badge';
	import CoinIcon from './CoinIcon.svelte';
	import UserProfilePreview from './UserProfilePreview.svelte';
	import { getPublicUrl } from '$lib/utils';
	import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-svelte';

	interface Column {
		key: string;
		label: string;
		class?: string;
		sortable?: boolean;
		defaultSort?: boolean | 'asc' | 'desc';
		render?: (value: any, row: any, index: number) => any;
	}

	let {
		columns,
		data,
		onRowClick,
		emptyMessage = 'No data available',
		emptyIcon,
		emptyTitle = 'No data',
		emptyDescription = '',
		enableUserPreview = false
	}: {
		columns: Column[];
		data: any[];
		onRowClick?: (row: any) => void;
		emptyMessage?: string;
		emptyIcon?: any;
		emptyTitle?: string;
		emptyDescription?: string;
		enableUserPreview?: boolean;
	} = $props();

	const defaultSortColumn = columns.find((col) => col.defaultSort);
	let sortColumn = $state<string | null>(defaultSortColumn?.key || null);
	let sortDirection = $state<'asc' | 'desc'>(
		defaultSortColumn?.defaultSort === 'asc' ? 'asc' : 'desc'
	);

	let sortedData = $derived.by(() => {
		if (!sortColumn) return data;

		return [...data].sort((a, b) => {
			let aValue = a[sortColumn!];
			let bValue = b[sortColumn!];

			// Handle numeric values
			if (typeof aValue === 'string' && !isNaN(Number(aValue))) {
				aValue = Number(aValue);
			}
			if (typeof bValue === 'string' && !isNaN(Number(bValue))) {
				bValue = Number(bValue);
			}

			// Handle null/undefined values
			if (aValue == null && bValue == null) return 0;
			if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
			if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

			// Compare values
			if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	});

	function handleSort(columnKey: string) {
		if (sortColumn === columnKey) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = columnKey;
			sortDirection = 'desc';
		}
	}

	function renderCell(column: any, row: any, value: any, index: number) {
		if (column.render) {
			const rendered = column.render(value, row, index);
			if (rendered?.component === 'badge') {
				return {
					type: 'badge',
					variant: rendered.variant || 'default',
					text: rendered.text,
					icon: rendered.icon,
					class: rendered.class || ''
				};
			}
			if (rendered?.component === 'coin') {
				return {
					type: 'coin',
					icon: rendered.icon,
					symbol: rendered.symbol,
					name: rendered.name,
					size: rendered.size || 6
				};
			}
			if (rendered?.component === 'text') {
				return {
					type: 'text',
					text: rendered.text,
					class: rendered.class || ''
				};
			}
			if (rendered?.component === 'rank') {
				return {
					type: 'rank',
					icon: rendered.icon,
					color: rendered.color,
					number: rendered.number
				};
			}
			if (rendered?.component === 'user') {
				return {
					type: 'user',
					image: rendered.image,
					name: rendered.name,
					username: rendered.username
				};
			}
			if (typeof rendered === 'string') {
				return { type: 'text', text: rendered };
			}
		}
		return { type: 'text', text: value };
	}
</script>

{#if data.length === 0}
	<div class="py-12 text-center">
		{#if emptyIcon}
			<div class="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
				<emptyIcon class="text-muted-foreground h-6 w-6"></emptyIcon>
			</div>
		{/if}
		<h3 class="mb-2 text-lg font-semibold">{emptyTitle}</h3>
		<p class="text-muted-foreground">{emptyDescription || emptyMessage}</p>
	</div>
{:else}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				{#each columns as column (column.key)}
					<Table.Head class={column.class || 'min-w-[80px]'}>
						{#if column.sortable}
							<button
								onclick={() => handleSort(column.key)}
								class="hover:text-foreground flex items-center gap-1 transition-colors"
							>
								{column.label}
								{#if sortColumn === column.key}
									{#if sortDirection === 'asc'}
										<ArrowUp class="text-primary h-4 w-4" />
									{:else}
										<ArrowDown class="text-primary h-4 w-4" />
									{/if}
								{:else}
									<ArrowUpDown class="h-4 w-4 opacity-50" />
								{/if}
							</button>
						{:else}
							{column.label}
						{/if}
					</Table.Head>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each sortedData as row, index (row.symbol || row.id || index)}
				<Table.Row
					class={onRowClick ? 'hover:bg-muted/50 cursor-pointer transition-colors' : ''}
					onclick={onRowClick ? () => onRowClick(row) : undefined}
				>
					{#each columns as column (column.key)}
						<Table.Cell class={column.class}>
							{@const cellData = renderCell(column, row, row[column.key], index)}
							{#if cellData.type === 'badge'}
								<Badge variant={cellData.variant} class={cellData.class}>
									{#if cellData.icon === 'arrow-up'}
										<ArrowUp class="mr-1 h-3 w-3" />
									{:else if cellData.icon === 'arrow-down'}
										<ArrowDown class="mr-1 h-3 w-3" />
									{/if}
									{cellData.text}
								</Badge>
							{:else if cellData.type === 'coin'}
								<div class="flex items-center gap-2">
									<CoinIcon icon={cellData.icon} symbol={cellData.symbol} size={cellData.size} />
									<span class="font-medium max-w-44 truncate">{cellData.name}</span>
								</div>
							{:else if cellData.type === 'rank'}
								<div class="flex items-center gap-2">
									<div
										class={`${cellData.color} flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium`}
									>
										<cellData.icon class="h-3.5 w-3.5" />
									</div>
									<span class="text-sm font-medium">#{cellData.number}</span>
								</div>
							{:else if cellData.type === 'user'}
								{#if enableUserPreview}
									<HoverCard.Root>
										<HoverCard.Trigger>
											<div class="flex items-center gap-2">
												<Avatar.Root class="h-7 w-7">
													<Avatar.Image src={getPublicUrl(cellData.image)} alt={cellData.name} />
													<Avatar.Fallback class="text-xs">
														{cellData.name?.charAt(0) || '?'}
													</Avatar.Fallback>
												</Avatar.Root>
												<div class="flex flex-col items-start">
													<span class="text-sm font-medium">{cellData.name}</span>
													<span class="text-muted-foreground text-xs">@{cellData.username}</span>
												</div>
											</div>
										</HoverCard.Trigger>
										<HoverCard.Content class="w-80">
											<UserProfilePreview userId={row.userId} />
										</HoverCard.Content>
									</HoverCard.Root>
								{:else}
									<div class="flex items-center gap-2">
										<Avatar.Root class="h-7 w-7">
											<Avatar.Image src={getPublicUrl(cellData.image)} alt={cellData.name} />
											<Avatar.Fallback class="text-xs"
												>{cellData.name?.charAt(0) || '?'}</Avatar.Fallback
											>
										</Avatar.Root>
										<div class="flex flex-col items-start">
											<span class="text-sm font-medium">{cellData.name}</span>
											<span class="text-muted-foreground text-xs">@{cellData.username}</span>
										</div>
									</div>
								{/if}
							{:else if cellData.type === 'text'}
								<span class={cellData.class}>{cellData.text}</span>
							{/if}
						</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
