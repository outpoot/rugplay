<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import TradeModal from '$lib/components/self/TradeModal.svelte';
	import CommentSection from '$lib/components/self/CommentSection.svelte';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import CoinSkeleton from '$lib/components/self/skeletons/CoinSkeleton.svelte';
	import { TrendingUp, TrendingDown, DollarSign, Coins, ChartColumn } from 'lucide-svelte';
	import {
		createChart,
		ColorType,
		type IChartApi,
		CandlestickSeries,
		HistogramSeries
	} from 'lightweight-charts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { fetchPortfolioData } from '$lib/stores/portfolio-data';
	import { getPublicUrl, getTimeframeInSeconds } from '$lib/utils.js';
	import { websocketController, type PriceUpdate, isConnectedStore } from '$lib/stores/websocket';
	import SEO from '$lib/components/self/SEO.svelte';
	import { page } from '$app/state';

	const { data } = $props();
	let coinSymbol = $derived(data.coinSymbol);
	let coin = $state<any>(null);
	let loading = $state(true);
	let chartData = $state<any[]>([]);
	let volumeData = $state<any[]>([]);
	let userHolding = $state(0);
	let buyModalOpen = $state(false);
	let sellModalOpen = $state(false);
	let selectedTimeframe = $state('1m');
	let lastPriceUpdateTime = 0;

	const timeframeOptions = [
		{ value: '1m', label: '1 minute' },
		{ value: '5m', label: '5 minutes' },
		{ value: '15m', label: '15 minutes' },
		{ value: '1h', label: '1 hour' },
		{ value: '4h', label: '4 hours' },
		{ value: '1d', label: '1 day' }
	];

	onMount(async () => {
		await loadCoinData();
		await loadUserHolding();

		websocketController.setCoin(coinSymbol.toUpperCase());

		websocketController.subscribeToPriceUpdates(coinSymbol.toUpperCase(), handlePriceUpdate);
	});

	$effect(() => {
		return () => {
			websocketController.unsubscribeFromPriceUpdates(coinSymbol.toUpperCase());
		};
	});

	// Handle route changes to update coin data
	$effect(() => {
		const currentCoinSymbol = page.params.coinSymbol;
		if (currentCoinSymbol && currentCoinSymbol !== coinSymbol) {
			loading = true;
			coin = null;
			chartData = [];
			volumeData = [];
			userHolding = 0;

			// Unsubscribe from the old coin's updates
			websocketController.unsubscribeFromPriceUpdates(coinSymbol.toUpperCase());

			// Update the data prop which will trigger coinSymbol to update via $derived
			data.coinSymbol = currentCoinSymbol;

			// Load new coin data and set up new subscriptions
			loadCoinData().then(() => {
				loadUserHolding();
				websocketController.setCoin(currentCoinSymbol.toUpperCase());
				websocketController.subscribeToPriceUpdates(
					currentCoinSymbol.toUpperCase(),
					handlePriceUpdate
				);
			});
		}
	});

	async function loadCoinData() {
		try {
			const response = await fetch(`/api/coin/${coinSymbol}?timeframe=${selectedTimeframe}`);

			if (!response.ok) {
				toast.error(response.status === 404 ? 'Coin not found' : 'Failed to load coin data');
				return;
			}

			const result = await response.json();
			coin = result.coin;
			chartData = result.candlestickData || [];
			volumeData = result.volumeData || [];
		} catch (e) {
			console.error('Failed to fetch coin data:', e);
			toast.error('Failed to load coin data');
		} finally {
			loading = false;
		}
	}

	async function loadUserHolding() {
		if (!$USER_DATA) return;

		try {
			const response = await fetch('/api/portfolio/total');
			if (response.ok) {
				const result = await response.json();
				const holding = result.coinHoldings.find((h: any) => h.symbol === coinSymbol.toUpperCase());
				userHolding = holding ? holding.quantity : 0;
			}
		} catch (e) {
			console.error('Failed to load user holding:', e);
		}
	}
	async function handleTradeSuccess() {
		await Promise.all([loadCoinData(), loadUserHolding(), fetchPortfolioData()]);
	}
	function handlePriceUpdate(priceUpdate: PriceUpdate) {
		if (coin && priceUpdate.coinSymbol === coinSymbol.toUpperCase()) {
			// throttle updates to prevent excessive UI updates, 1s interval
			const now = Date.now();
			if (now - lastPriceUpdateTime < 1000) {
				return;
			}
			lastPriceUpdateTime = now;

			coin = {
				...coin,
				currentPrice: priceUpdate.currentPrice,
				marketCap: priceUpdate.marketCap,
				change24h: priceUpdate.change24h,
				volume24h: priceUpdate.volume24h,
				...(priceUpdate.poolCoinAmount !== undefined && {
					poolCoinAmount: priceUpdate.poolCoinAmount
				}),
				...(priceUpdate.poolBaseCurrencyAmount !== undefined && {
					poolBaseCurrencyAmount: priceUpdate.poolBaseCurrencyAmount
				})
			};

			updateChartRealtime(priceUpdate.currentPrice);
		}
	}

	function updateChartRealtime(newPrice: number) {
		if (!candlestickSeries || !chart || chartData.length === 0) return;

		const timeframeSeconds = getTimeframeInSeconds(selectedTimeframe);
		const currentTime = Math.floor(Date.now() / 1000);

		const currentCandleTime = Math.floor(currentTime / timeframeSeconds) * timeframeSeconds;

		const lastCandle = chartData[chartData.length - 1];

		if (lastCandle && lastCandle.time === currentCandleTime) {
			const updatedCandle = {
				time: currentCandleTime,
				open: lastCandle.open,
				high: Math.max(lastCandle.high, newPrice),
				low: Math.min(lastCandle.low, newPrice),
				close: newPrice
			};

			candlestickSeries.update(updatedCandle);
			chartData[chartData.length - 1] = updatedCandle;
		} else if (currentCandleTime > (lastCandle?.time || 0)) {
			const newCandle = {
				time: currentCandleTime,
				open: newPrice,
				high: newPrice,
				low: newPrice,
				close: newPrice
			};

			candlestickSeries.update(newCandle);
			chartData.push(newCandle);
		}
	}

	async function handleTimeframeChange(timeframe: string) {
		selectedTimeframe = timeframe;
		loading = true;

		if (chart) {
			chart.remove();
			chart = null;
		}

		await loadCoinData();
		loading = false;
	}

	let currentTimeframeLabel = $derived(
		timeframeOptions.find((option) => option.value === selectedTimeframe)?.label || '1 minute'
	);

	let chartContainer = $state<HTMLDivElement>();
	let chart: IChartApi | null = null;
	let candlestickSeries: any = null;
	let volumeSeries: any = null;

	$effect(() => {
		if (chart && chartData.length > 0) {
			chart.remove();
			chart = null;
		}

		if (chartContainer && chartData.length > 0) {
			chart = createChart(chartContainer, {
				layout: {
					textColor: '#666666',
					background: { type: ColorType.Solid, color: 'transparent' },
					attributionLogo: false,
					panes: {
						separatorColor: '#2B2B43',
						separatorHoverColor: 'rgba(107, 114, 142, 0.3)',
						enableResize: true
					}
				},
				grid: {
					vertLines: { color: '#2B2B43' },
					horzLines: { color: '#2B2B43' }
				},
				rightPriceScale: {
					borderVisible: false,
					scaleMargins: { top: 0.1, bottom: 0.1 },
					alignLabels: true,
					entireTextOnly: false
				},
				timeScale: {
					borderVisible: false,
					timeVisible: true,
					barSpacing: 20,
					rightOffset: 5,
					minBarSpacing: 8
				},
				crosshair: {
					mode: 1,
					vertLine: { color: '#758696', width: 1, style: 2, visible: true, labelVisible: true },
					horzLine: { color: '#758696', width: 1, style: 2, visible: true, labelVisible: true }
				}
			});
			candlestickSeries = chart.addSeries(CandlestickSeries, {
				upColor: '#26a69a',
				downColor: '#ef5350',
				borderVisible: true,
				borderUpColor: '#26a69a',
				borderDownColor: '#ef5350',
				wickUpColor: '#26a69a',
				wickDownColor: '#ef5350',
				priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 }
			});

			volumeSeries = chart.addSeries(
				HistogramSeries,
				{
					priceFormat: { type: 'volume' },
					priceScaleId: 'volume'
				},
				1
			);

			const processedChartData = chartData.map((candle) => {
				if (candle.open === candle.close) {
					const basePrice = candle.open;
					const variation = basePrice * 0.001;
					return {
						...candle,
						high: Math.max(candle.high, basePrice + variation),
						low: Math.min(candle.low, basePrice - variation)
					};
				}
				return candle;
			});

			candlestickSeries.setData(processedChartData);
			volumeSeries.setData(generateVolumeData(chartData, volumeData));

			const volumePane = chart.panes()[1];
			if (volumePane) volumePane.setHeight(100);

			chart.timeScale().fitContent();

			const handleResize = () => chart?.applyOptions({ width: chartContainer?.clientWidth });
			window.addEventListener('resize', handleResize);
			handleResize();

			candlestickSeries.priceScale().applyOptions({ borderColor: '#71649C' });
			volumeSeries.priceScale().applyOptions({ borderColor: '#71649C' });
			chart.timeScale().applyOptions({ borderColor: '#71649C' });

			return () => {
				window.removeEventListener('resize', handleResize);
				if (chart) {
					chart.remove();
					chart = null;
				}
			};
		}
	});

	function formatPrice(price: number): string {
		if (price < 0.000001) {
			return price.toFixed(8);
		} else if (price < 0.01) {
			return price.toFixed(6);
		} else if (price < 1) {
			return price.toFixed(4);
		} else {
			return price.toFixed(2);
		}
	}

	function formatMarketCap(value: number): string {
		const num = Number(value);
		if (isNaN(num)) return '$0.00';
		if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
		if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
		if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
		return `$${num.toFixed(2)}`;
	}

	function formatSupply(value: number): string {
		const num = Number(value);
		if (isNaN(num)) return '0';
		if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
		if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
		if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
		return num.toLocaleString();
	}

	function generateVolumeData(candlestickData: any[], volumeData: any[]) {
		return candlestickData.map((candle, index) => {
			// Find corresponding volume data for this time period
			const volumePoint = volumeData.find((v) => v.time === candle.time);
			const volume = volumePoint ? volumePoint.volume : 0;

			return {
				time: candle.time,
				value: volume,
				color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
			};
		});
	}
</script>

<SEO
	title={coin
		? `${coin.name} (*${coin.symbol}) - Rugplay`
		: `Loading ${coinSymbol.toUpperCase()} - Rugplay Game`}
	description={coin
		? `Trade ${coin.name} (*${coin.symbol}) in the Rugplay simulation game. Current price: $${formatPrice(coin.currentPrice)}, Market cap: ${formatMarketCap(coin.marketCap)}, 24h change: ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%.`
		: `Virtual cryptocurrency trading page for ${coinSymbol.toUpperCase()} in the Rugplay simulation game.`}
	keywords={coin
		? `${coin.name} cryptocurrency game, *${coin.symbol} virtual trading, ${coin.symbol} price simulation, cryptocurrency trading game, virtual coin ${coin.symbol}`
		: `${coinSymbol} virtual cryptocurrency, crypto trading simulation, virtual coin trading`}
	image={coin?.icon ? getPublicUrl(coin.icon) : '/rugplay.svg'}
	imageAlt={coin ? `${coin.name} (${coin.symbol}) logo` : `${coinSymbol} cryptocurrency logo`}
/>

{#if coin}
	<TradeModal bind:open={buyModalOpen} type="BUY" {coin} onSuccess={handleTradeSuccess} />
	<TradeModal
		bind:open={sellModalOpen}
		type="SELL"
		{coin}
		{userHolding}
		onSuccess={handleTradeSuccess}
	/>
{/if}
<div class="container mx-auto max-w-7xl p-6">
	{#if loading}
		<CoinSkeleton />
	{:else if !coin}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">Coin not found</div>
				<Button onclick={() => goto('/')}>Go Home</Button>
			</div>
		</div>
	{:else}
		<!-- Header Section -->
		<header class="mb-8">
			<div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex items-center gap-3 sm:gap-4">
					<CoinIcon
						icon={coin.icon}
						symbol={coin.symbol}
						name={coin.name}
						size={12}
						class="border sm:size-16"
					/>
					<div class="min-w-0 flex-1">
						<h1 class="text-2xl font-bold sm:text-4xl">{coin.name}</h1>
						<div class="mt-1 flex flex-wrap items-center gap-2">
							<Badge variant="outline" class="text-sm sm:text-lg">*{coin.symbol}</Badge>
							{#if $isConnectedStore}
								<Badge
									variant="outline"
									class="animate-pulse border-green-500 text-xs text-green-500"
								>
									● LIVE
								</Badge>
							{/if}
							{#if !coin.isListed}
								<Badge variant="destructive">Delisted</Badge>
							{/if}
						</div>
					</div>
				</div>
				<div class="flex flex-col items-start gap-2 sm:items-end sm:text-right">
					<div class="relative">
						<p class="text-2xl font-bold sm:text-3xl">
							${formatPrice(coin.currentPrice)}
						</p>
					</div>
					<div class="flex items-center gap-2">
						{#if coin.change24h >= 0}
							<TrendingUp class="h-4 w-4 text-green-500" />
						{:else}
							<TrendingDown class="h-4 w-4 text-red-500" />
						{/if}
						<Badge variant={coin.change24h >= 0 ? 'success' : 'destructive'} class="text-sm">
							{coin.change24h >= 0 ? '+' : ''}{Number(coin.change24h).toFixed(2)}%
						</Badge>
					</div>
				</div>
			</div>

			<!-- Creator Info -->
			{#if coin.creatorName}
				<div class="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
					<span>Created by</span>

					<HoverCard.Root>
						<HoverCard.Trigger
							class="flex cursor-pointer items-center gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8"
							onclick={() => goto(`/user/${coin.creatorUsername}`)}
						>
							<Avatar.Root class="h-4 w-4">
								<Avatar.Image src={getPublicUrl(coin.creatorImage)} alt={coin.creatorName} />
								<Avatar.Fallback>{coin.creatorName.charAt(0)}</Avatar.Fallback>
							</Avatar.Root>
							<span class="font-medium">{coin.creatorName} (@{coin.creatorUsername})</span>
						</HoverCard.Trigger>
						<HoverCard.Content class="w-80" side="bottom" sideOffset={3}>
							<UserProfilePreview userId={coin.creatorId} />
						</HoverCard.Content>
					</HoverCard.Root>
				</div>
			{/if}
		</header>

		<div class="grid gap-6">
			<!-- Price Chart with Trading Actions -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<!-- Chart (2/3 width) -->
				<div class="lg:col-span-2">
					<Card.Root>
						<Card.Header class="pb-4">
							<div class="flex items-center justify-between">
								<Card.Title class="flex items-center gap-2">
									<ChartColumn class="h-5 w-5" />
									Price Chart ({selectedTimeframe})
								</Card.Title>
								<div class="w-24">
									<Select.Root
										type="single"
										bind:value={selectedTimeframe}
										onValueChange={handleTimeframeChange}
										disabled={loading}
									>
										<Select.Trigger class="w-full">
											{currentTimeframeLabel}
										</Select.Trigger>
										<Select.Content>
											<Select.Group>
												{#each timeframeOptions as option}
													<Select.Item value={option.value} label={option.label}>
														{option.label}
													</Select.Item>
												{/each}
											</Select.Group>
										</Select.Content>
									</Select.Root>
								</div>
							</div>
						</Card.Header>
						<Card.Content class="pt-0">
							{#if chartData.length === 0}
								<div class="flex h-[500px] items-center justify-center">
									<p class="text-muted-foreground">No trading data available yet</p>
								</div>
							{:else}
								<div class="h-[500px] w-full" bind:this={chartContainer}></div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Right side - Trading Actions + Liquidity Pool (1/3 width) -->
				<div class="space-y-6 lg:col-span-1">
					<!-- Trading Actions -->
					<Card.Root>
						<Card.Header class="pb-4">
							<Card.Title>Trade {coin.symbol}</Card.Title>
							{#if userHolding > 0}
								<p class="text-muted-foreground text-sm">
									You own: {formatSupply(userHolding)}
									{coin.symbol}
								</p>
							{/if}
						</Card.Header>
						<Card.Content class="pt-0">
							{#if $USER_DATA}
								<div class="space-y-3">
									<Button
										class="w-full"
										variant="default"
										size="lg"
										onclick={() => (buyModalOpen = true)}
										disabled={!coin.isListed}
									>
										<TrendingUp class="h-4 w-4" />
										Buy {coin.symbol}
									</Button>
									<Button
										class="w-full"
										variant="outline"
										size="lg"
										onclick={() => (sellModalOpen = true)}
										disabled={!coin.isListed || userHolding <= 0}
									>
										<TrendingDown class="h-4 w-4" />
										Sell {coin.symbol}
									</Button>
								</div>
							{:else}
								<div class="py-4 text-center">
									<p class="text-muted-foreground mb-3 text-sm">Sign in to start trading</p>
									<Button onclick={() => goto('/')}>Sign In</Button>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
					<!-- Liquidity Pool -->
					<Card.Root>
						<Card.Header class="pb-4">
							<Card.Title class="flex items-center gap-2">Liquidity Pool</Card.Title>
						</Card.Header>
						<Card.Content class="pt-0">
							<div class="space-y-4">
								<div>
									<h4 class="mb-3 font-medium">Pool Composition</h4>
									<div class="space-y-2">
										<div class="flex justify-between">
											<span class="text-muted-foreground text-sm">{coin.symbol}:</span>
											<span class="font-mono text-sm">
												{formatSupply(coin.poolCoinAmount)}
											</span>
										</div>
										<div class="flex justify-between">
											<span class="text-muted-foreground text-sm">Base Currency:</span>
											<span class="font-mono text-sm">
												${Number(coin.poolBaseCurrencyAmount).toLocaleString()}
											</span>
										</div>
									</div>
								</div>
								<div>
									<h4 class="mb-3 font-medium">Pool Stats</h4>
									<div class="space-y-2">
										<div class="flex justify-between">
											<span class="text-muted-foreground text-sm">Total Liquidity:</span>
											<span class="font-mono text-sm">
												${(Number(coin.poolBaseCurrencyAmount) * 2).toLocaleString()}
											</span>
										</div>
										<div class="flex justify-between">
											<span class="text-muted-foreground text-sm">Current Price:</span>
											<span class="font-mono text-sm">${formatPrice(coin.currentPrice)}</span>
										</div>
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</div>

			<!-- Statistics Grid -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Market Cap -->
				<Card.Root class="gap-1">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-sm font-medium">
							<DollarSign class="h-4 w-4" />
							Market Cap
						</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0">
						<p class="text-xl font-bold">
							{formatMarketCap(coin.marketCap)}
						</p>
					</Card.Content>
				</Card.Root>

				<!-- 24h Volume -->
				<Card.Root class="gap-1">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-sm font-medium">
							<ChartColumn class="h-4 w-4" />
							24h Volume
						</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0">
						<p class="text-xl font-bold">
							{formatMarketCap(coin.volume24h)}
						</p>
					</Card.Content>
				</Card.Root>

				<!-- Circulating Supply -->
				<Card.Root class="gap-1">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-sm font-medium">
							<Coins class="h-4 w-4" />
							Circulating Supply
						</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0">
						<p class="text-xl font-bold">
							{formatSupply(coin.circulatingSupply)}<span
								class="text-muted-foreground ml-1 text-xs"
							>
								of {formatSupply(coin.initialSupply)} total
							</span>
						</p>
					</Card.Content>
				</Card.Root>

				<!-- 24h Change -->
				<Card.Root class="gap-1">
					<Card.Header>
						<Card.Title class="text-sm font-medium">24h Change</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0">
						<div class="flex items-center gap-2">
							{#if coin.change24h >= 0}
								<TrendingUp class="h-4 w-4 text-green-500" />
							{:else}
								<TrendingDown class="h-4 w-4 text-red-500" />
							{/if}
							<Badge variant={coin.change24h >= 0 ? 'success' : 'destructive'} class="text-sm">
								{coin.change24h >= 0 ? '+' : ''}{Number(coin.change24h).toFixed(2)}%
							</Badge>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Comments Section -->
			<CommentSection {coinSymbol} />
		</div>
	{/if}
</div>
