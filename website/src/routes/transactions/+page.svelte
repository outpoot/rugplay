<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Popover from '$lib/components/ui/popover';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import DataTable from '$lib/components/self/DataTable.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Search01Icon,
		Refresh01Icon,
		SlidersHorizontalIcon,
		ArrowLeft01Icon,
		ArrowRight01Icon,
		ReceiptDollarIcon,
		Invoice03Icon
	} from '@hugeicons/core-free-icons';
	import { formatPrice, formatValue, formatQuantity, formatDate, debounce } from '$lib/utils';
	import { MediaQuery } from 'svelte/reactivity';

	let transactions = $state<any[]>([]);
	let totalCount = $state(0);
	let loading = $state(true);
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let typeFilter = $state($page.url.searchParams.get('type') || 'all');
	let sortBy = $state($page.url.searchParams.get('sortBy') || 'timestamp');
	let sortOrder = $state($page.url.searchParams.get('sortOrder') || 'desc');
	let showFilterPopover = $state(false);
	let currentPage = $state(parseInt($page.url.searchParams.get('page') || '1'));

	const isDesktop = new MediaQuery('(min-width: 768px)');
	let perPage = $derived(isDesktop.current ? 20 : 15);
	let siblingCount = $derived(isDesktop.current ? 1 : 0);

	const typeFilterOptions = [
		{ value: 'all', label: 'All transactions' },
		{ value: 'BUY', label: 'Buys only' },
		{ value: 'SELL', label: 'Sells only' },
		{ value: 'TRANSFER_IN', label: 'Received transfers' },
		{ value: 'TRANSFER_OUT', label: 'Sent transfers' }
	];

	const sortOrderOptions = [
		{ value: 'desc', label: 'Newest first' },
		{ value: 'asc', label: 'Oldest first' }
	];

	const debouncedSearch = debounce(performSearch, 300);
	let previousSearchQueryForEffect = $state('');

	onMount(() => {
		fetchTransactions();
	});

	function updateURL() {
		const url = new URL($page.url);

		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}

		if (typeFilter !== 'all') {
			url.searchParams.set('type', typeFilter);
		} else {
			url.searchParams.delete('type');
		}

		if (sortBy !== 'timestamp') {
			url.searchParams.set('sortBy', sortBy);
		} else {
			url.searchParams.delete('sortBy');
		}

		if (sortOrder !== 'desc') {
			url.searchParams.set('sortOrder', sortOrder);
		} else {
			url.searchParams.delete('sortOrder');
		}

		if (currentPage !== 1) {
			url.searchParams.set('page', currentPage.toString());
		} else {
			url.searchParams.delete('page');
		}

		goto(url.toString(), { noScroll: true, replaceState: true });
	}

	async function fetchTransactions() {
		loading = true;
		try {
			const params = new URLSearchParams({
				search: searchQuery,
				type: typeFilter,
				sortBy,
				sortOrder,
				page: currentPage.toString(),
				limit: perPage.toString()
			});

			const response = await fetch(`/api/transactions?${params}`);
			if (response.ok) {
				const result = await response.json();
				transactions = result.transactions;
				totalCount = result.total;
			} else {
				toast.error('Failed to load transactions');
			}
		} catch (e) {
			console.error('Failed to fetch transactions:', e);
			toast.error('Failed to load transactions');
		} finally {
			loading = false;
		}
	}

	function performSearch() {
		currentPage = 1;
		fetchTransactions();
	}

	function updateSearchUrl() {
		updateURL();
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			updateSearchUrl();
		}
	}

	$effect(() => {
		if (searchQuery !== previousSearchQueryForEffect) {
			debouncedSearch();
			previousSearchQueryForEffect = searchQuery;
		}
	});

	function handleSortChange(newSortBy: string) {
		if (sortBy === newSortBy) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = newSortBy;
			sortOrder = newSortBy === 'timestamp' ? 'desc' : 'desc';
		}
		currentPage = 1;
		updateURL();
		fetchTransactions();
	}

	function handleTypeFilterChange() {
		currentPage = 1;
		updateURL();
		fetchTransactions();
	}

	function handleSortOrderChange() {
		currentPage = 1;
		updateURL();
		fetchTransactions();
	}

	function resetFilters() {
		searchQuery = '';
		typeFilter = 'all';
		sortBy = 'timestamp';
		sortOrder = 'desc';
		currentPage = 1;

		goto('/transactions', { noScroll: true, replaceState: true });
		fetchTransactions();
		showFilterPopover = false;
	}

	function applyFilters() {
		currentPage = 1;
		updateURL();
		fetchTransactions();
		showFilterPopover = false;
	}

	let hasActiveFilters = $derived(
		searchQuery !== '' || typeFilter !== 'all' || sortBy !== 'timestamp' || sortOrder !== 'desc'
	);

	let totalPages = $derived(Math.ceil(totalCount / perPage));
	let startIndex = $derived((currentPage - 1) * perPage + 1);
	let endIndex = $derived(Math.min(currentPage * perPage, totalCount));

	function handlePageChange(page: number) {
		currentPage = page;
		updateURL();
		fetchTransactions();
	}

	let currentTypeFilterLabel = $derived(
		typeFilterOptions.find((option) => option.value === typeFilter)?.label || 'All transactions'
	);
	let currentSortOrderLabel = $derived(
		sortOrderOptions.find((option) => option.value === sortOrder)?.label || 'Newest first'
	);

	// Column configurations for transactions table
	let transactionsColumns = $derived([
		{
			key: 'type',
			label: 'Type',
			class: 'w-[10%] min-w-[80px]',
			render: (value: any, row: any) => {
				if (row.isTransfer) {
					return {
						component: 'badge',
						variant: 'default',
						text: row.isIncoming ? 'Received' : 'Sent',
						class: 'text-xs'
					};
				}
				return {
					component: 'badge',
					variant: value === 'BUY' ? 'success' : 'destructive',
					text: value === 'BUY' ? 'Buy' : 'Sell',
					class: 'text-xs'
				};
			}
		},
		{
			key: 'coin',
			label: 'Asset',
			class: 'w-[20%] min-w-[120px]',
			render: (value: any, row: any) => {
				if (row.isTransfer) {
					if (row.isCoinTransfer && row.coin) {
						return {
							component: 'coin',
							icon: row.coin.icon,
							symbol: row.coin.symbol,
							name: `*${row.coin.symbol}`,
							size: 6
						};
					}
					return {
						component: 'text',
						text: 'Cash ($)',
						class: 'font-medium'
					};
				}
				return {
					component: 'coin',
					icon: row.coin.icon,
					symbol: row.coin.symbol,
					name: `*${row.coin.symbol}`,
					size: 6
				};
			}
		},
		{
			key: 'sender',
			label: 'Sender',
			class: 'w-[12%] min-w-[80px]',
			render: (value: any, row: any) => ({
				component: 'text',
				text: row.isTransfer ? row.sender || 'Unknown' : '-',
				class:
					row.isTransfer && row.sender && row.sender !== 'Unknown'
						? 'font-medium'
						: 'text-muted-foreground'
			})
		},
		{
			key: 'recipient',
			label: 'Receiver',
			class: 'w-[12%] min-w-[80px]',
			render: (value: any, row: any) => ({
				component: 'text',
				text: row.isTransfer ? row.recipient || 'Unknown' : '-',
				class:
					row.isTransfer && row.recipient && row.recipient !== 'Unknown'
						? 'font-medium'
						: 'text-muted-foreground'
			})
		},
		{
			key: 'quantity',
			label: 'Quantity',
			class: 'w-[15%] min-w-[100px] font-mono',
			render: (value: any, row: any) => {
				if (row.isTransfer && value === 0) {
					return '-';
				}
				return formatQuantity(value);
			}
		},
		{
			key: 'pricePerCoin',
			label: 'Price',
			class: 'w-[15%] min-w-[80px] font-mono',
			render: (value: any, row: any) => {
				if (row.isTransfer || value === 0) {
					return '-';
				}
				return `$${formatPrice(value)}`;
			}
		},
		{
			key: 'totalBaseCurrencyAmount',
			label: 'Total',
			class: 'w-[15%] min-w-[80px] font-mono font-medium',
			render: (value: any, row: any) => {
				const prefix = row.type === 'TRANSFER_IN' || row.type === 'BUY' ? '+' : '-';
				return `${prefix}${formatValue(value)}`;
			}
		},
		{
			key: 'timestamp',
			label: 'Date',
			class: 'w-[25%] min-w-[120px] text-muted-foreground',
			render: (value: any) => formatDate(value)
		}
	]);
</script>

<SEO
	title="Transactions - Rugplay"
	description="View your complete trading history and transaction records in the Rugplay cryptocurrency simulation game."
	noindex={true}
	keywords="trading history game, transaction records simulator, crypto trading log, virtual trading history"
/>

<div class="container mx-auto max-w-7xl p-6">
	<header class="mb-8">
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold">Transactions</h1>
			<p class="text-muted-foreground mb-6">
				Complete record of your trading activity and transactions
			</p>

			<div class="mx-auto flex max-w-2xl items-center justify-center gap-2">
				<div class="relative flex-1">
					<HugeiconsIcon icon={Search01Icon} class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
					<Input
						bind:value={searchQuery}
						placeholder="Search by coin name or symbol..."
						class="pl-10 pr-4"
						onblur={updateSearchUrl}
						onkeydown={handleSearchKeydown}
					/>
				</div>

				<Popover.Root bind:open={showFilterPopover}>
					<Popover.Trigger>
						<Button variant="outline" size="default" class="flex items-center gap-2">
							<HugeiconsIcon icon={SlidersHorizontalIcon} class="h-4 w-4" />
							Filters
							{#if hasActiveFilters}
								<Badge variant="secondary" class="h-5 w-5 rounded-full p-0 text-xs">•</Badge>
							{/if}
						</Button>
					</Popover.Trigger>
					<Popover.Content class="w-80 p-4" align="end">
						<div class="space-y-4">
							<div class="space-y-2">
								<Label class="text-sm font-medium">Sort By</Label>
								<div class="grid grid-cols-2 gap-2">
									<Button
										variant={sortBy === 'timestamp' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('timestamp')}
									>
										Date
									</Button>
									<Button
										variant={sortBy === 'totalBaseCurrencyAmount' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('totalBaseCurrencyAmount')}
									>
										Amount
									</Button>
									<Button
										variant={sortBy === 'quantity' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('quantity')}
									>
										Quantity
									</Button>
									<Button
										variant={sortBy === 'pricePerCoin' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('pricePerCoin')}
									>
										Price
									</Button>
								</div>
							</div>

							<div class="space-y-2">
								<Label class="text-sm font-medium">Sort Order</Label>
								<Select.Root
									type="single"
									bind:value={sortOrder}
									onValueChange={handleSortOrderChange}
								>
									<Select.Trigger class="w-full">
										{currentSortOrderLabel}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each sortOrderOptions as option}
												<Select.Item value={option.value} label={option.label}>
													{option.label}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>

							<div class="space-y-2">
								<Label class="text-sm font-medium">Transaction Type</Label>
								<Select.Root
									type="single"
									bind:value={typeFilter}
									onValueChange={handleTypeFilterChange}
								>
									<Select.Trigger class="w-full">
										{currentTypeFilterLabel}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each typeFilterOptions as option}
												<Select.Item value={option.value} label={option.label}>
													{option.label}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>

							<div class="flex gap-2 pt-2">
								<Button variant="outline" size="sm" onclick={resetFilters} class="flex-1">
									Reset
								</Button>
								<Button size="sm" onclick={applyFilters} class="flex-1">Apply</Button>
							</div>
						</div>
					</Popover.Content>
				</Popover.Root>

				<Button variant="outline" size="default" onclick={fetchTransactions} disabled={loading}>
					<HugeiconsIcon icon={Refresh01Icon} class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</header>

	<!-- Pagination Info -->
	{#if !loading && totalCount > 0}
		<div class="mb-4 flex items-center justify-between">
			<div class="text-muted-foreground text-sm">
				Showing {startIndex}-{endIndex} of {totalCount} transactions
			</div>
			{#if hasActiveFilters}
				<Button variant="link" size="sm" onclick={resetFilters} class="h-auto p-0">
					Clear all filters
				</Button>
			{/if}
		</div>
	{/if}

	<!-- Transactions Table -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<HugeiconsIcon icon={ReceiptDollarIcon} class="h-5 w-5" />
				History
			</Card.Title>
			<Card.Description>Complete record of your trading activity and transfers</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if loading}
				<div class="space-y-4">
					{#each Array(10) as _}
						<div class="bg-muted h-16 animate-pulse rounded-lg"></div>
					{/each}
				</div>
			{:else}
				<DataTable
					columns={transactionsColumns}
					data={transactions}
					onRowClick={(tx) => {
						if (tx.coin) {
							goto(`/coin/${tx.coin.symbol}`);
						}
					}}
					emptyIcon={Invoice03Icon}
					emptyTitle="No transactions found"
					emptyDescription={hasActiveFilters
						? 'No transactions match your current filters. Try adjusting your search criteria.'
						: "You haven't made any trades or transfers yet. Start by buying coins or sending money to other users."}
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Pagination -->
	{#if !loading && totalPages > 1}
		<div class="mt-8 flex justify-center">
			<Pagination.Root
				count={totalCount}
				{perPage}
				{siblingCount}
				page={currentPage}
				onPageChange={handlePageChange}
			>
				{#snippet children({ pages, currentPage: paginationCurrentPage })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton>
								<HugeiconsIcon icon={ArrowLeft01Icon} class="h-4 w-4" />
								<span class="hidden sm:block">Previous</span>
							</Pagination.PrevButton>
						</Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link {page} isActive={paginationCurrentPage === page.value}>
										{page.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item>
							<Pagination.NextButton>
								<span class="hidden sm:block">Next</span>
								<HugeiconsIcon icon={ArrowRight01Icon} class="h-4 w-4" />
							</Pagination.NextButton>
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>
	{/if}
</div>
