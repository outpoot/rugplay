<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { getTimeBasedGreeting, formatPrice, formatMarketCap, formatChange } from '$lib/utils';
	import { USER_DATA } from '$lib/stores/user-data';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import DataTable from '$lib/components/self/DataTable.svelte';
	import HomeSkeleton from '$lib/components/self/skeletons/HomeSkeleton.svelte';
	import HomeSeasonSkeleton from '$lib/components/self/skeletons/HomeSeasonSkeleton.svelte';
	import SeasonCard from '$lib/components/self/SeasonCard.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		StarIcon,
		ChartIncreaseIcon,
		ChartDecreaseIcon,
		FireIcon,
		ArrowRight01Icon
	} from '@hugeicons/core-free-icons';
	import Sparkline from '$lib/components/self/Sparkline.svelte';
	import FollowingCard from '$lib/components/self/FollowingCard.svelte';
	import { Button } from '$lib/components/ui/button';

	let shouldSignIn = $state(false);
	let coins = $state<any[]>([]);
	let loading = $state(true);
	let seasonData = $state<any>(null);
	let seasonLoading = $state(true);
	let watchlist = $state<any[]>([]);
	let following = $state<any[]>([]);
	let followingTrades = $state<any[]>([]);
	let followingTradesLoading = $state(true);

	onMount(() => {
		const controller = new AbortController();
		const options = { signal: controller.signal };

		fetch('/api/coins/top', options)
			.then(async (response) => {
				if (!response.ok) throw new Error('Failed to load coins');
				const result = await response.json();
				if (!controller.signal.aborted) coins = result.coins;
			})
			.catch((error) => {
				if (controller.signal.aborted) return;
				console.error('Failed to fetch coins:', error);
				toast.error('Failed to load coins');
			})
			.finally(() => {
				if (!controller.signal.aborted) loading = false;
			});

		fetch('/api/season', options)
			.then(async (response) => {
				const result = response.ok ? await response.json() : null;
				if (!controller.signal.aborted) seasonData = result;
			})
			.catch((error) => {
				if (!controller.signal.aborted) console.error('Failed to fetch season:', error);
			})
			.finally(() => {
				if (!controller.signal.aborted) seasonLoading = false;
			});

		if ($USER_DATA) {
			fetch('/api/watchlist', options)
				.then(async (response) => {
					const result = response.ok ? await response.json() : null;
					if (result && !controller.signal.aborted) watchlist = result.coins;
				})
				.catch(() => {});

			fetch('/api/following', options)
				.then(async (response) => {
					const result = response.ok ? await response.json() : null;
					if (result && !controller.signal.aborted) following = result.players;
				})
				.catch(() => {});

			fetch('/api/following/trades?limit=4', options)
				.then(async (response) => {
					const result = response.ok ? await response.json() : null;
					if (result && !controller.signal.aborted) followingTrades = result.trades;
				})
				.catch(() => {})
				.finally(() => {
					if (!controller.signal.aborted) followingTradesLoading = false;
				});
		}

		return () => controller.abort();
	});

	const MOVER_ROWS = 5;
	const TABLE_PREVIEW_ROWS = 10;

	let showAllCoins = $state(false);
	let rankedCoins = $derived(coins.map((c, i) => ({ ...c, rank: i + 1 })));
	let tableCoins = $derived(showAllCoins ? rankedCoins : rankedCoins.slice(0, TABLE_PREVIEW_ROWS));


	let showSeason = $derived(seasonLoading || !!seasonData?.season);

	let movers = $derived([
		{
			id: 'gainers',
			title: 'Top gainers',
			icon: ChartIncreaseIcon,
			iconClass: 'text-success',
			empty: 'Nothing is up today',
			coins: coins
				.filter((c) => c.change24h > 0)
				.sort((a, b) => b.change24h - a.change24h)
				.slice(0, MOVER_ROWS)
		},
		{
			id: 'losers',
			title: 'Top losers',
			icon: ChartDecreaseIcon,
			iconClass: 'text-destructive',
			empty: 'Nothing is down today',
			coins: coins
				.filter((c) => c.change24h < 0)
				.sort((a, b) => a.change24h - b.change24h)
				.slice(0, MOVER_ROWS)
		},
		{
			id: 'volume',
			title: 'Most traded',
			icon: FireIcon,
			iconClass: 'text-orange-500',
			empty: 'No trades in the last 24h',
			coins: coins
				.filter((c) => c.volume24h > 0)
				.sort((a, b) => b.volume24h - a.volume24h)
				.slice(0, MOVER_ROWS)
		}
	]);

	const marketColumns = [
		{
			key: 'rank',
			label: '#',
			class: 'text-muted-foreground hidden w-10 tabular-nums sm:table-cell',
			sortable: true
		},
		{
			key: 'name',
			label: 'Name',
			class: 'font-medium',
			render: (value: any, row: any) => {
				return {
					component: 'coin',
					icon: row.icon,
					symbol: row.symbol,
					name: row.name,
					size: 6
				};
			}
		},
		{
			key: 'price',
			sortable: true,
			label: 'Price',
			render: (value: any) => `$${formatPrice(value)}`
		},
		{
			key: 'change24h',
			sortable: true,
			label: '24h Change',
			render: (value: any) => ({
				component: 'badge',
				variant: value >= 0 ? 'success' : 'destructive',
				text: formatChange(value)
			})
		},
		{
			key: 'marketCap',
			sortable: true,
			label: 'Market Cap',
			render: (value: any) => formatMarketCap(value)
		},
		{
			key: 'volume24h',
			sortable: true,
			label: 'Volume (24h)',
			render: (value: any) => formatMarketCap(value)
		}
	];
</script>

<SEO
	title="Rugplay"
	description="A realistic crypto trading simulator that lets you experience the risks and mechanics of decentralized exchanges without real financial consequences. Create coins, trade with liquidity pools, and learn about 'rug pulls' in a... relatively safe environment :)"
	keywords="crypto simulation game, trading practice game, rug pull simulation, virtual cryptocurrency game"
/>

<SignInConfirmDialog bind:open={shouldSignIn} />

{#snippet sectionTitle(title: string, icon: any, iconClass: string)}
	<h2 class="flex items-center gap-1.5 text-sm font-semibold">
		<HugeiconsIcon {icon} class="h-4 w-4 {iconClass}" />
		{title}
	</h2>
{/snippet}

<div class="container mx-auto py-6 sm:px-6">
	<header class="mb-6">
		<h1 class="mb-2 truncate text-2xl font-bold sm:text-3xl">
			{$USER_DATA ? getTimeBasedGreeting($USER_DATA?.name) : 'Welcome to Rugplay!'}
		</h1>
		<p class="text-muted-foreground">
			{#if $USER_DATA}
				Here's the market overview for today.
			{:else}
				You need to <button
					class="text-primary underline hover:cursor-pointer"
					onclick={() => (shouldSignIn = !shouldSignIn)}>sign in</button
				>
				to play.
			{/if}
		</p>
	</header>

	{#if watchlist.length > 0}
		<section class="bg-card mb-5 rounded-xl border">
			<div class="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
				<div class="w-24 shrink-0">
					{@render sectionTitle('Watchlist', StarIcon, 'fill-yellow-400 text-yellow-500')}
				</div>
				<div class="flex w-full min-w-0 flex-1 gap-2 overflow-x-auto">
					{#each watchlist as coin (coin.symbol)}
						<a
							href={`/coin/${coin.symbol}`}
							class="hover:bg-muted pointer-coarse:active:bg-muted flex shrink-0 items-center gap-2 rounded-full border py-1 pr-2.5 pl-1 text-sm transition-colors"
						>
							<CoinIcon icon={coin.icon} symbol={coin.symbol} name={coin.name} size={6} class="shrink-0" />
							<span class="font-semibold">*{coin.symbol}</span>
							<span class="text-muted-foreground font-mono text-xs">${formatPrice(coin.price)}</span>
							<span
								class="font-mono text-xs font-medium {coin.change24h >= 0
									? 'text-success'
									: 'text-destructive'}"
							>
								{formatChange(coin.change24h)}
							</span>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	{#if loading}
		<HomeSkeleton {showSeason} />
	{:else if coins.length === 0}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">No coins available</div>
				<p class="text-muted-foreground text-sm">Be the first to create a coin!</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 lg:grid-cols-4">
			<section class="flex flex-col {showSeason ? 'lg:col-span-3' : 'lg:col-span-4'}">
				<div class="mb-2 flex items-center justify-between">
					<h2 class="text-sm font-semibold">Biggest coins</h2>
					<a
						href="/market"
						class="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs transition-colors"
					>
						All coins
						<HugeiconsIcon icon={ArrowRight01Icon} class="h-3.5 w-3.5" />
					</a>
				</div>
				<div class="grid flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{#each coins.slice(0, 6) as coin (coin.symbol)}
						<a
							href={`/coin/${coin.symbol}`}
							class="bg-card hover:border-foreground/20 pointer-coarse:active:scale-[0.98] pointer-coarse:active:bg-muted/40 group relative flex flex-col justify-between gap-2 overflow-hidden rounded-xl border p-3 transition-all hover:shadow-md"
						>
							<div class="flex min-w-0 items-center gap-2.5">
								<CoinIcon
									icon={coin.icon}
									symbol={coin.symbol}
									name={coin.name}
									size={8}
									class="shrink-0"
								/>
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm leading-tight font-semibold">{coin.name}</div>
									<div class="text-muted-foreground truncate font-mono text-[11px]">
										*{coin.symbol}
									</div>
								</div>
								<Badge variant={coin.change24h >= 0 ? 'success' : 'destructive'} class="shrink-0">
									{formatChange(coin.change24h)}
								</Badge>
							</div>
							<div class="flex items-center justify-between gap-3">
								<span class="truncate text-xl font-bold tracking-tight">
									${formatPrice(coin.price)}
								</span>
								{#if coin.sparkline}
									<Sparkline
										points={coin.sparkline}
										positive={coin.change24h >= 0}
										class="h-9 min-w-16 max-w-36 flex-1"
									/>
								{/if}
							</div>
							<div class="text-muted-foreground flex justify-between gap-2 text-[11px] tabular-nums">
								<span class="truncate">MCap {formatMarketCap(coin.marketCap)}</span>
								<span class="truncate">Vol {formatMarketCap(coin.volume24h)}</span>
							</div>
						</a>
					{/each}
				</div>
			</section>

			{#if showSeason}
				<div class="lg:col-span-1">
					{#if seasonLoading}
						<HomeSeasonSkeleton />
					{:else}
						<SeasonCard data={seasonData} />
					{/if}
				</div>
			{/if}
		</div>

		<section class="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-4">
			<div
				class="grid grid-cols-1 gap-3 md:grid-cols-3 {following.length > 0
					? 'lg:col-span-3'
					: 'lg:col-span-4'}"
			>
			{#each movers as group (group.id)}
				<div class="bg-card flex flex-col rounded-xl border p-3">
					<div class="mb-1.5">
						{@render sectionTitle(group.title, group.icon, group.iconClass)}
					</div>
					{#if group.coins.length === 0}
						<p class="text-muted-foreground flex flex-1 items-center justify-center py-4 text-xs">
							{group.empty}
						</p>
					{:else}
						{#each group.coins as coin, i (coin.symbol)}
							<a
								href={`/coin/${coin.symbol}`}
								class="hover:bg-muted pointer-coarse:active:bg-muted -mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors"
							>
								<span class="text-muted-foreground w-3 text-center text-xs tabular-nums">
									{i + 1}
								</span>
								<CoinIcon
									icon={coin.icon}
									symbol={coin.symbol}
									name={coin.name}
									size={5}
									class="shrink-0 [&>span]:text-[8px]"
								/>
								<span class="min-w-0 flex-1 truncate font-medium">*{coin.symbol}</span>
								<span class="text-muted-foreground hidden font-mono text-xs sm:inline md:hidden 2xl:inline">
									${formatPrice(coin.price)}
								</span>
								{#if group.id === 'volume'}
									<span class="w-16 text-right font-mono text-xs font-medium tabular-nums">
										{formatMarketCap(coin.volume24h)}
									</span>
								{:else}
									<span
										class="w-16 text-right font-mono text-xs font-medium tabular-nums {coin.change24h >=
										0
											? 'text-success'
											: 'text-destructive'}"
									>
										{formatChange(coin.change24h)}
									</span>
								{/if}
							</a>
						{/each}
					{/if}
				</div>
			{/each}
			</div>
			{#if following.length > 0}
				<div class="lg:col-span-1">
					<FollowingCard
						players={following}
						trades={followingTrades}
						loading={followingTradesLoading}
					/>
				</div>
			{/if}
		</section>

		<section class="mt-6">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-sm font-semibold">Market overview</h2>
				<span class="text-muted-foreground text-xs">
					Showing {tableCoins.length} of {coins.length}
				</span>
			</div>
			<Card.Root class="gap-0 py-2">
				<Card.Content class="px-3">
					<DataTable
						columns={marketColumns}
						data={tableCoins}
						onRowClick={(coin) => goto(`/coin/${coin.symbol}`)}
					/>
				</Card.Content>
				{#if coins.length > TABLE_PREVIEW_ROWS}
					<div class="border-t px-3 pt-2">
						<Button
							variant="ghost"
							size="sm"
							class="w-full"
							onclick={() => (showAllCoins = !showAllCoins)}
						>
							{showAllCoins ? 'Show fewer' : `Show all ${coins.length} coins`}
						</Button>
					</div>
				{/if}
			</Card.Root>
		</section>
	{/if}
</div>
