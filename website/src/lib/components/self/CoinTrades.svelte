<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { TradeUpIcon, TradeDownIcon, Clock01Icon, Activity01Icon } from '@hugeicons/core-free-icons';
	import { goto } from '$app/navigation';
	import { getPublicUrl, formatValue, formatRelativeTime } from '$lib/utils';

	interface RecentTrade {
		type: 'BUY' | 'SELL';
		username: string;
		userImage?: string;
		amount: number;
		totalValue: number;
		price: number;
		timestamp: number;
		userId: string;
	}

	let { coinSymbol } = $props<{ coinSymbol: string }>();

	let loading = $state(true);
	let trades = $state<RecentTrade[]>([]);

	async function fetchTrades() {
		try {
			const response = await fetch(
				`/api/trades/recent?coin=${encodeURIComponent(coinSymbol)}&limit=10`
			);
			if (response.ok) {
				const data = await response.json();
				trades = data.trades || [];
			}
		} catch (e) {
			console.error('Failed to load recent trades:', e);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (coinSymbol) {
			loading = true;
			trades = [];
			fetchTrades();
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<HugeiconsIcon icon={Activity01Icon} class="h-4 w-4" />
			Recent Trades
		</Card.Title>
	</Card.Header>
	<Card.Content class="relative">
		{#if loading}
			<div class="space-y-2">
				{#each Array(3) as _}
					<div class="bg-muted/60 h-10 animate-pulse rounded-lg"></div>
				{/each}
			</div>
		{:else if trades.length === 0}
			<div class="py-4 text-center">
				<HugeiconsIcon icon={Activity01Icon} class="text-muted-foreground mx-auto mb-2 h-8 w-8" />
				<p class="text-muted-foreground text-sm">No trades yet</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each trades as trade (trade.timestamp)}
					<div class="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors">
						<div class="flex min-w-0 items-center gap-2">
							<button
								class="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm underline-offset-4 hover:underline"
								onclick={() => goto(`/user/${trade.username}`)}
							>
								<Avatar.Root class="h-5 w-5 flex-shrink-0">
									<Avatar.Image
										src={getPublicUrl(trade.userImage ?? null)}
										alt={trade.username}
									/>
									<Avatar.Fallback class="text-[10px]">
										{trade.username.charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<span class="max-w-[90px] truncate text-xs font-medium">@{trade.username}</span>
							</button>
						</div>
						<div class="flex flex-shrink-0 items-center gap-1.5 font-mono text-xs">
							{#if trade.type === 'BUY'}
								<HugeiconsIcon icon={TradeUpIcon} class="h-3.5 w-3.5 text-green-500" />
								<span class="text-green-500">BUY</span>
							{:else}
								<HugeiconsIcon icon={TradeDownIcon} class="h-3.5 w-3.5 text-red-500" />
								<span class="text-red-500">SELL</span>
							{/if}
							<span>{formatValue(trade.totalValue)}</span>
						</div>
						<div class="text-muted-foreground flex flex-shrink-0 items-center gap-1 text-[10px]">
							<HugeiconsIcon icon={Clock01Icon} class="h-3 w-3" />
							<span class="whitespace-nowrap font-mono">{formatRelativeTime(new Date(trade.timestamp))}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
