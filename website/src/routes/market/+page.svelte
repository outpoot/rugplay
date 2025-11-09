<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Popover from '$lib/components/ui/popover';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import MarketSkeleton from '$lib/components/self/skeletons/MarketSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Search, RefreshCw, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { formatPrice, formatMarketCap, debounce, formatRelativeTime } from '$lib/utils';
	import { MediaQuery } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import type { CoinData, FilterOption, VolatilityBadge, MarketResponse } from '$lib/types/market';

	let { data } = $props();

	let coins = $state<CoinData[]>([]);
	let totalCount = $state(0);
	let loading = $state(true);
	let searchQuery = $state(data.filters.searchQuery);
	let sortBy = $state(data.filters.sortBy);
	let sortOrder = $state(data.filters.sortOrder);
	let priceFilter = $state(data.filters.priceFilter);
	let changeFilter = $state(data.filters.changeFilter);
	let showFilterPopover = $state(false);
	let currentPage = $state(data.filters.page);

	const isDesktop = new MediaQuery('(min-width: 768px)');
	let perPage = $derived(isDesktop.current ? 12 : 9);
	let siblingCount = $derived(isDesktop.current ? 1 : 0);
	const priceFilterOptions: FilterOption[] = [
		{ value: 'all', label: $_('market.priceRange.values.0') },
		{ value: 'under1', label: $_('market.priceRange.values.1') },
		{ value: '1to10', label: $_('market.priceRange.values.2') },
		{ value: '10to100', label: $_('market.priceRange.values.3') },
		{ value: 'over100', label: $_('market.priceRange.values.4') }
	];

	const changeFilterOptions: FilterOption[] = [
		{ value: 'all', label: $_('market.24hChange.values.0') },
		{ value: 'gainers', label: $_('market.24hChange.values.1') },
		{ value: 'losers', label: $_('market.24hChange.values.2') },
		{ value: 'hot', label: $_('market.24hChange.values.3') },
		{ value: 'wild', label: $_('market.24hChange.values.4') }
	];

	const sortOrderOptions: FilterOption[] = [
		{ value: 'desc', label: $_('market.sortOrder.values.0') },
		{ value: 'asc', label: $_('market.sortOrder.values.1') }
	];

	const debouncedSearch = debounce(performSearch, 300);
	let previousSearchQueryForEffect = $state(data.filters.searchQuery);

	onMount(() => {
		fetchMarketData();
	});

	function updateURL() {
		const url = new URL($page.url);

		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}

		if (sortBy !== 'marketCap') {
			url.searchParams.set('sortBy', sortBy);
		} else {
			url.searchParams.delete('sortBy');
		}

		if (sortOrder !== 'desc') {
			url.searchParams.set('sortOrder', sortOrder);
		} else {
			url.searchParams.delete('sortOrder');
		}

		if (priceFilter !== 'all') {
			url.searchParams.set('priceFilter', priceFilter);
		} else {
			url.searchParams.delete('priceFilter');
		}

		if (changeFilter !== 'all') {
			url.searchParams.set('changeFilter', changeFilter);
		} else {
			url.searchParams.delete('changeFilter');
		}

		if (currentPage !== 1) {
			url.searchParams.set('page', currentPage.toString());
		} else {
			url.searchParams.delete('page');
		}

		goto(url.toString(), { noScroll: true, replaceState: true });
	}
	async function fetchMarketData() {
		loading = true;
		try {
			const params = new URLSearchParams({
				search: searchQuery,
				sortBy,
				sortOrder,
				priceFilter,
				changeFilter,
				page: currentPage.toString(),
				limit: perPage.toString()
			});

			const response = await fetch(`/api/market?${params}`);
			if (response.ok) {
				const result: MarketResponse = await response.json();
				coins = result.coins;
				totalCount = result.total;
			} else {
				toast.error('Failed to load market data');
			}
		} catch (e) {
			console.error('Failed to fetch market data:', e);
			toast.error('Failed to load market data');
		} finally {
			loading = false;
		}
	}

	function performSearch() {
		currentPage = 1;
		fetchMarketData();
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
			sortOrder = 'desc';
		}
		currentPage = 1;
		updateURL();
		fetchMarketData();
	}

	function handleSortOrderChange() {
		currentPage = 1;
		updateURL();
		fetchMarketData();
	}

	function handlePriceFilterChange() {
		currentPage = 1;
		updateURL();
		fetchMarketData();
	}

	function handleChangeFilterChange() {
		currentPage = 1;
		updateURL();
		fetchMarketData();
	}

	function resetFilters() {
		searchQuery = '';
		sortBy = 'marketCap';
		sortOrder = 'desc';
		priceFilter = 'all';
		changeFilter = 'all';
		currentPage = 1;

		goto('/market', { noScroll: true, replaceState: true });
		fetchMarketData();
		showFilterPopover = false;
	}

	function applyFilters() {
		currentPage = 1;
		updateURL();
		fetchMarketData();
		showFilterPopover = false;
	}
	function getVolatilityBadge(change: number): VolatilityBadge | null {
		const absChange = Math.abs(change);
		if (absChange > 50) return { text: '🚀 WILD', variant: 'default' as const };
		if (absChange > 20) return { text: '📈 HOT', variant: 'secondary' as const };
		if (absChange > 10) return { text: '⚡ ACTIVE', variant: 'outline' as const };
		return null;
	}

	let hasActiveFilters = $derived(
		searchQuery !== '' ||
			priceFilter !== 'all' ||
			changeFilter !== 'all' ||
			sortBy !== 'marketCap' ||
			sortOrder !== 'desc'
	);

	let totalPages = $derived(Math.ceil(totalCount / perPage));
	let startIndex = $derived((currentPage - 1) * perPage + 1);
	let endIndex = $derived(Math.min(currentPage * perPage, totalCount));

	function handlePageChange(page: number) {
		currentPage = page;
		updateURL();
		fetchMarketData();
	}

	let currentPriceFilterLabel = $derived(
		priceFilterOptions.find((option) => option.value === priceFilter)?.label || 'All prices'
	);
	let currentChangeFilterLabel = $derived(
		changeFilterOptions.find((option) => option.value === changeFilter)?.label || 'All changes'
	);
	let currentSortOrderLabel = $derived(
		sortOrderOptions.find((option) => option.value === sortOrder)?.label || 'High to Low'
	);
</script>

<SEO
	title="Market - Rugplay"
	description="Discover and trade virtual cryptocurrencies in our simulation game. Browse all available simulated coins, filter by price and performance, and more."
	keywords="virtual cryptocurrency market, crypto trading game, coin discovery simulation, market analysis game, trading practice"
/>

<div class="container mx-auto max-w-7xl p-6">
	<header class="mb-8">
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold">{$_('market.title')}</h1>
			<p class="text-muted-foreground mb-6">
				{$_('market.description')}
			</p>

			<div class="mx-auto flex max-w-2xl items-center justify-center gap-2">
				<div class="relative flex-1">
					<Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						bind:value={searchQuery}
						placeholder={$_('market.input.placeholder')}
						class="pr-4 pl-10"
						onblur={updateSearchUrl}
						onkeydown={handleSearchKeydown}
					/>
				</div>

				<Popover.Root bind:open={showFilterPopover}>
					<Popover.Trigger>
						<Button variant="outline" size="default" class="flex items-center gap-2">
							<SlidersHorizontal class="h-4 w-4" />
							{$_('market.input.filters.title')}
							{#if hasActiveFilters}
								<Badge variant="secondary" class="h-5 w-5 rounded-full p-0 text-xs">•</Badge>
							{/if}
						</Button>
					</Popover.Trigger>
					<Popover.Content class="w-80 p-4" align="end">
						<div class="space-y-4">
							<div class="space-y-2">
								<Label class="text-sm font-medium">{$_('market.sortBy')}</Label>
								<div class="grid grid-cols-2 gap-2">
									<Button
										variant={sortBy === 'marketCap' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('marketCap')}
									>
										{$_('coin.marketCap')}
									</Button>
									<Button
										variant={sortBy === 'currentPrice' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('currentPrice')}
									>
										{$_('coin.price')}
									</Button>
									<Button
										variant={sortBy === 'change24h' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('change24h')}
									>
										{$_('coin.24hChange')}
									</Button>
									<Button
										variant={sortBy === 'volume24h' ? 'default' : 'outline'}
										size="sm"
										onclick={() => handleSortChange('volume24h')}
									>
										{$_('coin.volume')}
									</Button>
								</div>
							</div>

							<div class="space-y-2">
								<Label class="text-sm font-medium">{$_('market.sortOrder.title')}</Label>
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
								<Label class="text-sm font-medium">{$_('market.priceRange.title')}</Label>
								<Select.Root
									type="single"
									bind:value={priceFilter}
									onValueChange={handlePriceFilterChange}
								>
									<Select.Trigger class="w-full">
										{currentPriceFilterLabel}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each priceFilterOptions as option}
												<Select.Item value={option.value} label={option.label}>
													{option.label}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>

							<div class="space-y-2">
								<Label class="text-sm font-medium">{$_('market.24hChange.title')}</Label>
								<Select.Root
									type="single"
									bind:value={changeFilter}
									onValueChange={handleChangeFilterChange}
								>
									<Select.Trigger class="w-full">
										{currentChangeFilterLabel}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each changeFilterOptions as option}
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
									{$_('base.reset')}
								</Button>
								<Button size="sm" onclick={applyFilters} class="flex-1">{$_('market.apply')}</Button
								>
							</div>
						</div>
					</Popover.Content>
				</Popover.Root>

				<Button variant="outline" size="default" onclick={fetchMarketData} disabled={loading}>
					<RefreshCw class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</header>

	<!-- Pagination Info -->
	{#if !loading && totalCount > 0}
		<div class="mb-4 flex items-center justify-between">
			<div class="text-muted-foreground text-sm">
				{$_("market.showing").replace("{{val}}",startIndex.toLocaleString()).replace("{{total}}", endIndex.toLocaleString()).replace("{{coins}}", totalCount.toLocaleString())}
			</div>
			{#if hasActiveFilters}
				<Button variant="link" size="sm" onclick={resetFilters} class="h-auto p-0">
					Clear all filters
				</Button>
			{/if}
		</div>
	{/if}

	<!-- Market Grid -->
	{#if loading}
		<MarketSkeleton />
	{:else if coins.length === 0}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="mb-4 text-xl">{$_('market.noCoinsFound.title')}</div>
				<div class="text-muted-foreground mb-4">
					{#if searchQuery}
						{$_('market.input.noMatch').replace('{{query}}', searchQuery)}
					{:else}
						{$_('market.noCoinsFound.description.0')}
						<a href="/coin/create" class="text-primary underline"
							>{$_('market.noCoinsFound.description.1')}</a
						>{$_('market.noCoinsFound.description.2')}
					{/if}
				</div>
				{#if hasActiveFilters}
					<Button variant="outline" onclick={resetFilters}
						>{$_('market.input.filters.clearAll')}</Button
					>
				{/if}
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each coins as coin, index}
				{@const volatilityBadge = getVolatilityBadge(coin.change24h)}
				{@const globalIndex = (currentPage - 1) * perPage + index + 1}
				<Card.Root
					class="group cursor-pointer gap-1 transition-all duration-200 hover:shadow-lg"
					onclick={() => goto(`/coin/${coin.symbol}`)}
				>
					<Card.Header>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<CoinIcon icon={coin.icon} symbol={coin.symbol} size={8} />
								<div>
									<h3 class="max-w-44 truncate text-lg leading-tight font-semibold">{coin.name}</h3>
									<p class="text-muted-foreground truncate text-sm">*{coin.symbol}</p>
								</div>
							</div>
							<div class="text-right">
								<span class="text-muted-foreground font-mono text-xs">#{globalIndex}</span>
							</div>
						</div>
					</Card.Header>

					<Card.Content>
						<div class="space-y-3">
							<!-- Price -->
							<div>
								<div class="font-mono text-2xl font-bold">
									${formatPrice(coin.currentPrice)}
								</div>
								<div class="mt-1 flex items-center gap-2">
									<Badge variant={coin.change24h >= 0 ? 'success' : 'destructive'} class="text-xs">
										{coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
									</Badge>
									{#if volatilityBadge}
										<Badge variant={volatilityBadge.variant} class="text-xs">
											{volatilityBadge.text}
										</Badge>
									{/if}
								</div>
							</div>

							<!-- Stats -->
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Market Cap</span>
									<span class="font-mono">{formatMarketCap(coin.marketCap)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Volume (24h)</span>
									<span class="font-mono">{formatMarketCap(coin.volume24h)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Created</span>
									<span class="text-xs">{formatRelativeTime(coin.createdAt)}</span>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
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
									<ChevronLeft class="h-4 w-4" />
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
									<ChevronRight class="h-4 w-4" />
								</Pagination.NextButton>
							</Pagination.Item>
						</Pagination.Content>
					{/snippet}
				</Pagination.Root>
			</div>
		{/if}
	{/if}
</div>
