<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { Activity, TrendingUp, TrendingDown, Clock } from 'lucide-svelte';
	import { allTradesStore, isLoadingTrades, loadInitialTrades } from '$lib/stores/websocket';
	import { goto } from '$app/navigation';
	import { formatQuantity, formatRelativeTime, formatValue, getPublicUrl } from '$lib/utils';
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import LiveTradeSkeleton from '$lib/components/self/skeletons/LiveTradeSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	function handleUserClick(username: string) {
		goto(`/user/${username}`);
	}

	function handleCoinClick(coinSymbol: string, trade: any) {
		if (trade.type === 'TRANSFER_IN' || trade.type === 'TRANSFER_OUT') {
			goto(`/user/${trade.username}`);
		} else {
			goto(`/coin/${coinSymbol.toLowerCase()}`);
		}
	}

	onMount(() => {
		loadInitialTrades('expanded');
	});
</script>

<SEO
	title="Live Trades - Rugplay"
	description="Watch real-time virtual cryptocurrency trading activity in the Rugplay simulation game. See live trades, user activity, and market movements as they happen."
	keywords="live crypto trades game, real-time trading simulation, virtual trading activity, crypto game stream"
/>

<svelte:head>
	<title>{$_('livetrades.title')} - Rugplay</title>
	<meta name="description" content="Real-time cryptocurrency trading activity on Rugplay" />
</svelte:head>

<div class="container mx-auto max-w-7xl p-6">
	<header class="mb-8">
		<div>
			<h1 class="text-2xl font-bold sm:text-3xl">{$_('livetrades.title')}</h1>
			<p class="text-muted-foreground text-sm sm:text-base">
				{$_('livetrades.desc')}
			</p>
		</div>
	</header>

	<Card>
		<CardHeader>
			<CardTitle class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
				<div class="flex items-center gap-2">
					<Activity class="h-5 w-5" />
					{$_('livetrades.stream')}
				</div>
				{#if $allTradesStore.length > 0}
					<Badge variant="secondary" class="w-fit sm:ml-auto">
						{$_(`livetrades.trades.${$allTradesStore.length !== 1 ? 1 : 0}`).replace(
							'{{count}}',
							$allTradesStore.length.toString()
						)}
					</Badge>
				{/if}
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-3">
				{#if $isLoadingTrades}
					<LiveTradeSkeleton />
				{:else if $allTradesStore.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-center sm:py-16">
						<Activity class="text-muted-foreground/50 mb-4 h-12 w-12 sm:h-16 sm:w-16" />
						<h3 class="mb-2 text-base font-semibold sm:text-lg">
							{$_('livetrades.waiting.title')}
						</h3>
						<p class="text-muted-foreground text-sm sm:text-base">
							{$_('livetrades.waiting.description')}
						</p>
					</div>
				{:else}
					{#each $allTradesStore as trade (trade.timestamp)}
						<div
							class="hover:bg-muted/50 flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-4"
						>
							<div class="flex items-center gap-3 sm:gap-4">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-1 sm:gap-2">
										{#if trade.type === 'TRANSFER_IN' || trade.type === 'TRANSFER_OUT'}
											{#if trade.amount > 0}
												<button
													onclick={() => handleCoinClick(trade.coinSymbol, trade)}
													class="flex cursor-pointer items-center gap-1.5 transition-opacity hover:underline hover:opacity-80"
												>
													<CoinIcon
														icon={trade.coinIcon}
														symbol={trade.coinSymbol}
														name={trade.coinName || trade.coinSymbol}
														size={5}
														class="sm:size-6"
													/>
													<span class="font-mono text-sm font-medium sm:text-base">
														{formatQuantity(trade.amount)} *{trade.coinSymbol}
													</span>
												</button>
												<span class="text-muted-foreground text-xs sm:text-sm">
													{trade.type === 'TRANSFER_IN' ? 'received by' : 'sent by'}
												</span>
											{:else}
												<span class="font-mono text-sm font-medium sm:text-base">
													{formatValue(trade.totalValue)}
												</span>
												<span class="text-muted-foreground text-xs sm:text-sm">
													{trade.type === 'TRANSFER_IN' ? 'received by' : 'sent by'}
												</span>
											{/if}
										{:else}
											<button
												onclick={() => handleCoinClick(trade.coinSymbol, trade)}
												class="flex cursor-pointer items-center gap-1.5 transition-opacity hover:underline hover:opacity-80"
											>
												<CoinIcon
													icon={trade.coinIcon}
													symbol={trade.coinSymbol}
													name={trade.coinName || trade.coinSymbol}
													size={5}
													class="sm:size-6"
												/>
												<span class="font-mono text-sm font-medium sm:text-base">
													{formatQuantity(trade.amount)} *{trade.coinSymbol}
												</span>
											</button>
											<span class="text-muted-foreground text-xs sm:text-sm">
												{$_(`livetrades.d.${trade.type === 'BUY' ? 'bought' : 'sold'}`)}
											</span>
										{/if}

										<HoverCard.Root>
											<HoverCard.Trigger
												class="cursor-pointer font-medium underline-offset-4 hover:underline"
												onclick={() => handleUserClick(trade.username)}
											>
												<div class="flex items-center gap-1">
													<Avatar.Root class="h-4 w-4 sm:h-5 sm:w-5">
														<Avatar.Image
															src={getPublicUrl(trade.userImage ?? null)}
															alt={trade.username}
														/>
														<Avatar.Fallback class="text-xs"
															>{trade.username.charAt(0).toUpperCase()}</Avatar.Fallback
														>
													</Avatar.Root>
													<span class="max-w-[120px] truncate text-xs sm:max-w-none sm:text-sm"
														>@{trade.username}</span
													>
												</div>
											</HoverCard.Trigger>
											<HoverCard.Content class="w-80" side="top" sideOffset={3}>
												<UserProfilePreview userId={parseInt(trade.userId)} />
											</HoverCard.Content>
										</HoverCard.Root>
									</div>
								</div>
							</div>

							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 font-mono text-xs sm:text-sm">
									{#if trade.type === 'TRANSFER_IN' || trade.type === 'TRANSFER_OUT'}
										<Activity class="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4" />
										<span class="text-blue-500">
											{trade.type === 'TRANSFER_IN' ? 'RECEIVED' : 'SENT'}
										</span>
										<span class="text-muted-foreground">|</span>
										<span>{formatValue(trade.totalValue)}</span>
									{:else if trade.type === 'BUY'}
										<TrendingUp class="h-3.5 w-3.5 text-green-500 sm:h-4 sm:w-4" />
										<span class="text-green-500">{$_('base.buy2')}</span>
										<span class="text-muted-foreground">|</span>
										<span>{formatValue(trade.totalValue)}</span>
									{:else}
										<TrendingDown class="h-3.5 w-3.5 text-red-500 sm:h-4 sm:w-4" />
										<span class="text-red-500">{$_('base.sell2')}</span>
										<span class="text-muted-foreground">|</span>
										<span>{formatValue(trade.totalValue)}</span>
									{/if}
								</div>

								<div
									class="text-muted-foreground flex items-center gap-1 text-xs sm:gap-1 sm:text-sm"
								>
									<Clock class="h-3 w-3 sm:h-4 sm:w-4" />
									<span class="font-mono whitespace-nowrap"
										>{formatRelativeTime(new Date(trade.timestamp))}</span
									>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</CardContent>
	</Card>
</div>
