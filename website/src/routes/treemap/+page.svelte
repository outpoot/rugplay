<script lang="ts">
	import { onMount } from 'svelte';
	// @ts-ignore
	import { chart } from 'svelte-apexcharts?client';
	// it doens't have types idk
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Activity, ChartColumn, Maximize, Minimize } from 'lucide-svelte';
	import { formatValue } from '$lib/utils';
	import { allTradesStore } from '$lib/stores/websocket';
	import { Button } from '$lib/components/ui/button';
	import SEO from '$lib/components/self/SEO.svelte';
	import { _ } from 'svelte-i18n';
	interface CoinData {
		symbol: string;
		name: string;
		currentPrice: number;
		marketCap: number;
		priceChange24h: number;
		volume24h: number;
	}

	let coins: CoinData[] = $state([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let lastUpdated = $state<Date>(new Date());
	let isLiveUpdatesEnabled = $state(true);
	let isFullscreen = $state(false);
	let fullscreenContainer: HTMLDivElement;

	let treemapOptions = $derived({
		series: [
			{
				data: coins.map((coin) => {
					const change = coin.priceChange24h;

					if (Math.abs(change) < 0.5) {
						return { x: coin.symbol, y: coin.marketCap, fillColor: 'rgba(107,114,128,0.3)' };
					}

					const intensity = Math.min(Math.abs(change) / 100, 1);
					const alpha = 0.3 + intensity * 0.7;

					const base = change >= 0 ? '16,163,74' : '220,38,38';
					return { x: coin.symbol, y: coin.marketCap, fillColor: `rgba(${base},${alpha})` };
				})
			}
		],
		chart: {
			height: isFullscreen ? window.innerHeight - 300 : 600,
			type: 'treemap',
			toolbar: {
				show: false
			},
			background: 'transparent',
			animations: {
				enabled: true,
				easing: 'easeinout',
				speed: 200
			}
		},
		dataLabels: {
			enabled: true,
			style: {
				fontSize: '12px',
				fontWeight: 'bold',
				colors: ['#ffffff']
			},
			formatter: function (text: string, op: any) {
				const coin = coins.find((c) => c.symbol === text);
				if (!coin) return [text];
				const changeSign = coin.priceChange24h >= 0 ? '+' : '';
				return [text, `${changeSign}${coin.priceChange24h.toFixed(2)}%`];
			},
			offsetY: -4
		},
		plotOptions: {
			treemap: {
				distributed: true,
				enableShades: false
			}
		},
		legend: {
			show: false
		},
		tooltip: {
			enabled: true,
			custom: ({ seriesIndex, dataPointIndex }: any) => {
				const coin = coins[dataPointIndex];
				if (!coin) return '';

				const changeColor = coin.priceChange24h >= 0 ? '#22c55e' : '#ef4444';
				const changeSign = coin.priceChange24h >= 0 ? '+' : '';

				return `
					<div class="p-3 bg-card border rounded-md shadow-lg">
						<div class="font-semibold text-lg mb-2">*${coin.symbol}</div>
						<div class="text-sm text-muted-foreground mb-1">${coin.name}</div>
						<div class="space-y-1 text-xs">
							<div>${$_('coin.price')}: <span class="font-mono">${formatValue(coin.currentPrice)}</span></div>
							<div>${$_('coin.marketCap')}: <span class="font-mono">${formatValue(coin.marketCap)}</span></div>
							<div>${$_('coin.24hVolume')}: <span class="font-mono">${formatValue(coin.volume24h)}</span></div>
							<div>${$_('coin.24hChange')}: <span class="font-mono" style="color: ${changeColor}">${changeSign}${coin.priceChange24h.toFixed(2)}%</span></div>
						</div>
					</div>
				`;
			}
		},
		theme: {
			mode: 'light'
		}
	});

	$effect(() => {
		if ($allTradesStore.length > 0 && isLiveUpdatesEnabled) {
			const timeoutId = setTimeout(() => {
				fetchCoins();
			}, 2000);

			return () => clearTimeout(timeoutId);
		}
	});

	$effect(() => {
		function handleFullscreenChange() {
			isFullscreen = !!document.fullscreenElement;
		}

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mozfullscreenchange', handleFullscreenChange);
		document.addEventListener('MSFullscreenChange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
			document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
		};
	});

	async function toggleFullscreen() {
		if (!document.fullscreenElement) {
			try {
				await fullscreenContainer.requestFullscreen();
			} catch (err) {
				console.error('Error attempting to enable fullscreen:', err);
			}
		} else {
			try {
				await document.exitFullscreen();
			} catch (err) {
				console.error('Error attempting to exit fullscreen:', err);
			}
		}
	}

	async function fetchCoins() {
		try {
			if (coins.length === 0) {
				isLoading = true;
			}
			error = null;

			const response = await fetch('/api/market?limit=100');
			if (!response.ok) {
				throw new Error('Failed to fetch coins data');
			}

			const data = await response.json();
			coins =
				data.coins.map((coin: any) => ({
					symbol: coin.symbol,
					name: coin.name,
					currentPrice: coin.currentPrice,
					marketCap: coin.marketCap,
					priceChange24h: coin.change24h,
					volume24h: coin.volume24h
				})) || [];

			lastUpdated = new Date();
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
			console.error('Error fetching coins:', err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchCoins();
	});
</script>

<SEO
	title="Treemap - Rugplay"
	description="Interactive virtual cryptocurrency market treemap visualization. View simulated market cap and 24h price changes for all coins in our trading game's visual treemap format."
	keywords="virtual cryptocurrency treemap, market visualization game, crypto market cap simulation, price changes game, market analysis simulator"
/>

<div
	bind:this={fullscreenContainer}
	class="treemap-container {isFullscreen ? 'fullscreen-mode' : ''}"
>
	<div class="container mx-auto px-4 py-8 {isFullscreen ? 'fullscreen-content' : ''}">
		<div class="mb-6">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<ChartColumn class="h-6 w-6" />
					<h1 class="text-2xl font-bold">{$_('treemap.title²')}</h1>
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => (isLiveUpdatesEnabled = !isLiveUpdatesEnabled)}
						class={isLiveUpdatesEnabled
							? 'border-green-500 text-green-500'
							: 'border-red-500 text-red-500'}
					>
						{#if isLiveUpdatesEnabled}
							<Activity class="h-4 w-4" />
							{$_('base.live')}
						{:else}
							<Activity class="h-4 w-4" />
							{$_('base.paused')}
						{/if}
					</Button>
					<Button variant="outline" size="sm" onclick={toggleFullscreen}>
						{#if isFullscreen}
							<Minimize class="h-4 w-4" />
							{$_('treemap.fullscreen.leave')}
						{:else}
							<Maximize class="h-4 w-4" />
							{$_('treemap.fullscreen.join')}
						{/if}
					</Button>
				</div>
			</div>
			<p class="text-muted-foreground">
				{$_('treemap.description')}
			</p>
			{#if coins.length > 0}
				<p class="text-muted-foreground mt-1 text-sm">
					{$_('treemap.lastUpdated').replace('{{time}}', lastUpdated.toLocaleTimeString())}
				</p>
			{/if}
		</div>

		{#if isLoading && coins.length === 0}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Skeleton class="h-5 w-5" />
						<Skeleton class="h-6 w-48" />
					</Card.Title>
					<Card.Description>
						<Skeleton class="h-4 w-64" />
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<Skeleton class="h-[600px] w-full" />
				</Card.Content>
			</Card.Root>
		{:else if error}
			<Card.Root>
				<Card.Content class="p-8 text-center">
					<div class="text-muted-foreground mb-4">
						<ChartColumn class="mx-auto mb-2 h-12 w-12 opacity-50" />
						<p class="text-lg font-medium">Failed to load treemap</p>
						<p class="text-sm">{error}</p>
					</div>
					<Button onclick={fetchCoins}>Try Again</Button>
				</Card.Content>
			</Card.Root>
		{:else if coins.length === 0}
			<Card.Root>
				<Card.Content class="p-8 text-center">
					<div class="text-muted-foreground">
						<ChartColumn class="mx-auto mb-2 h-12 w-12 opacity-50" />
						<p class="text-lg font-medium">{$_('home.nocoinsavailable.title')}</p>
						<p class="text-sm">{$_('treemap.noCoins.description')}</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Content class="p-6">
					<div class="text-muted-foreground mb-4 flex flex-wrap gap-4 text-sm">
						<div class="flex items-center gap-2">
							<div class="h-3 w-3 rounded bg-green-500"></div>
							<span>{$_('treemap.positive')}</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="h-3 w-3 rounded bg-red-500"></div>
							<span>{$_('treemap.negative')}</span>
						</div>
						<Badge variant="outline" class="ml-auto">
							{$_('treemap.coins').replace('{{count}}', coins.length.toString())}
						</Badge>
					</div>
					<div use:chart={treemapOptions}></div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>

<style>
	.treemap-container.fullscreen-mode {
		background: hsl(var(--background));
		padding: 1rem;
		height: 100vh;
		overflow: hidden;
	}

	.treemap-container.fullscreen-mode .container {
		max-width: none;
		padding: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.treemap-container.fullscreen-mode .fullscreen-content {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 1rem 0;
	}

	.treemap-container.fullscreen-mode .mb-6 {
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	.treemap-container.fullscreen-mode :global(.card) {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.treemap-container.fullscreen-mode :global(.card .card-content) {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	:global(.fullscreen-mode) {
		z-index: 9999;
	}
</style>
