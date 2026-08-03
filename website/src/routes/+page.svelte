<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { getTimeBasedGreeting, formatPrice, formatMarketCap } from '$lib/utils';
	import { USER_DATA } from '$lib/stores/user-data';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import DataTable from '$lib/components/self/DataTable.svelte';
	import HomeSkeleton from '$lib/components/self/skeletons/HomeSkeleton.svelte';
	import SeasonCard from '$lib/components/self/SeasonCard.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let shouldSignIn = $state(false);
	let coins = $state<any[]>([]);
	let loading = $state(true);
	let seasonData = $state<any>(null);

	onMount(async () => {
		try {
			const [coinResult, loadedSeasonData] = await Promise.all([
				fetch('/api/coins/top').then(async (response) => {
					if (!response.ok) throw new Error('Failed to load coins');
					return response.json();
				}),
				fetch('/api/season')
					.then((response) => (response.ok ? response.json() : null))
					.catch((e) => {
						console.error('Failed to fetch season:', e);
						return null;
					})
			]);

			coins = coinResult.coins;
			seasonData = loadedSeasonData;
		} catch (e) {
			console.error('Failed to fetch coins:', e);
			toast.error('Failed to load coins');
		} finally {
			loading = false;
		}
	});
	const marketColumns = [
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
			label: 'Price',
			render: (value: any) => `$${formatPrice(value)}`
		},
		{
			key: 'change24h',
			label: '24h Change',
			render: (value: any) => ({
				component: 'badge',
				variant: value >= 0 ? 'success' : 'destructive',
				text: `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
			})
		},
		{
			key: 'marketCap',
			label: 'Market Cap',
			render: (value: any) => formatMarketCap(value)
		},
		{
			key: 'volume24h',
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

<div class="container mx-auto p-6">
	<header class="mb-8">
		<h1 class="mb-2 truncate text-3xl font-bold">
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

	{#if loading}
		<HomeSkeleton showSeason={!seasonData || !!seasonData.season} />
	{:else if coins.length === 0}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">No coins available</div>
				<p class="text-muted-foreground text-sm">Be the first to create a coin!</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#if seasonData?.season}
				<div class="order-last md:col-span-2 lg:order-none lg:col-span-1 lg:col-start-4 lg:row-span-2 lg:row-start-1">
					<SeasonCard data={seasonData} />
				</div>
			{/if}
			{#each coins.slice(0, 6) as coin (coin.symbol)}
				<a href={`/coin/${coin.symbol}`} class="block h-full">
					<Card.Root class="hover:bg-card/50 flex h-full flex-col gap-0 transition-all hover:shadow-md">
						<Card.Header class="pb-4">
							<Card.Title class="flex min-w-0 items-center gap-3">
								<CoinIcon
									icon={coin.icon}
									symbol={coin.symbol}
									name={coin.name}
									size={10}
									class="shrink-0"
								/>
								<div class="min-w-0 flex-1">
									<div class="truncate text-base leading-tight font-semibold">{coin.name}</div>
									<Badge
										variant="secondary"
										class="mt-1 max-w-full font-mono text-[11px] font-medium"
									>
										<span class="truncate">*{coin.symbol}</span>
									</Badge>
								</div>
							</Card.Title>
						</Card.Header>

						<Card.Content class="flex flex-1 flex-col justify-center gap-2 py-2">
							<span class="text-muted-foreground text-xs">Price</span>
							<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
								<span class="text-3xl font-bold tracking-tight">${formatPrice(coin.price)}</span>
								<Badge variant={coin.change24h >= 0 ? 'success' : 'destructive'} class="shrink-0">
									{coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
								</Badge>
							</div>
						</Card.Content>

						<Card.Footer class="mt-4 border-t pt-4">
							<div class="grid w-full grid-cols-2 gap-3">
								<div class="min-w-0">
									<div class="text-muted-foreground text-xs">Market Cap</div>
									<div class="truncate text-sm font-medium tabular-nums">
										{formatMarketCap(coin.marketCap)}
									</div>
								</div>
								<div class="min-w-0 text-right">
									<div class="text-muted-foreground text-xs">24h Volume</div>
									<div class="truncate text-sm font-medium tabular-nums">
										{formatMarketCap(coin.volume24h)}
									</div>
								</div>
							</div>
						</Card.Footer>
					</Card.Root>
				</a>
			{/each}
		</div>

		<div class="mt-12">
			<h2 class="mb-4 text-2xl font-bold">Market Overview</h2>
			<Card.Root>
				<Card.Content>
					<DataTable
						columns={marketColumns}
						data={coins}
						onRowClick={(coin) => goto(`/coin/${coin.symbol}`)}
					/>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
