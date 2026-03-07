<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Calculator01Icon, ArrowUp01Icon, ArrowDown01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';

	let { coin } = $props<{ coin: any }>();

	let targetPrice = $state('');
	let result = $state<{
		amountNeeded: number;
		direction: 'buy' | 'sell';
		priceImpact: number;
		newPoolBase: number;
		newPoolCoin: number;
		reachable: boolean;
	} | null>(null);
	let error = $state('');

	function formatPrice(price: number): string {
		if (price >= 1e12) return `${(price / 1e12).toFixed(2)}T`;
		if (price >= 1e9) return `${(price / 1e9).toFixed(2)}B`;
		if (price >= 1e6) return `${(price / 1e6).toFixed(2)}M`;
		if (price >= 1e3) return `${(price / 1e3).toFixed(2)}K`;
		if (price < 0.000001) return price.toFixed(8);
		if (price < 0.01) return price.toFixed(6);
		if (price < 1) return price.toFixed(4);
		return price.toFixed(2);
	}

	function formatAmount(amount: number): string {
		if (amount >= 1e12) return `${(amount / 1e12).toFixed(2)}T`;
		if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
		if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
		if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`;
		return amount.toFixed(2);
	}

	function calculate() {
		error = '';
		result = null;

		const target = parseFloat(targetPrice);

		if (isNaN(target) || target <= 0) {
			error = 'Enter a valid target price greater than 0';
			return;
		}

		const poolCoin = Number(coin.poolCoinAmount);
		const poolBase = Number(coin.poolBaseCurrencyAmount);
		const currentPrice = Number(coin.currentPrice);

		if (poolCoin <= 0 || poolBase <= 0) {
			error = 'Pool data unavailable';
			return;
		}

		if (target === currentPrice) {
			error = 'Target price is the same as the current price';
			return;
		}

		const k = poolCoin * poolBase;

		const newPoolBase = Math.sqrt(k * target);
		const newPoolCoin = Math.sqrt(k / target);

		const direction: 'buy' | 'sell' = target > currentPrice ? 'buy' : 'sell';

		let amountNeeded: number;

		if (direction === 'buy') {
			amountNeeded = newPoolBase - poolBase;
		} else {
			amountNeeded = poolCoin - newPoolCoin;
		}

		if (amountNeeded <= 0) {
			error = 'Could not compute a valid trade for this target';
			return;
		}

		const priceImpact = ((target - currentPrice) / currentPrice) * 100;

		result = {
			amountNeeded,
			direction,
			priceImpact,
			newPoolBase,
			newPoolCoin,
			reachable: true
		};
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') calculate();
	}

	let currentPrice = $derived(Number(coin?.currentPrice ?? 0));
	let parsedTarget = $derived(parseFloat(targetPrice));
	let isHigher = $derived(!isNaN(parsedTarget) && parsedTarget > currentPrice);
	let isLower = $derived(!isNaN(parsedTarget) && parsedTarget < currentPrice);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2 text-sm font-medium">
			<HugeiconsIcon icon={Calculator01Icon} class="h-4 w-4" />
			Target Price Calculator
		</Card.Title>
		<p class="text-muted-foreground text-xs">
			Estimate how much is needed to reach a target price
		</p>
	</Card.Header>
	<Card.Content class="space-y-3">
		<div class="space-y-1.5">
			<p class="text-muted-foreground text-xs">
				Current price:
				<span class="text-foreground font-mono font-medium">${formatPrice(currentPrice)}</span>
			</p>
			<div class="flex gap-2">
				<div class="relative flex-1">
					<span class="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
					<Input
						class="pl-6 font-mono text-sm"
						placeholder="0.00000100"
						bind:value={targetPrice}
						onkeydown={handleKeydown}
						type="number"
						min="0"
						step="any"
					/>
				</div>
				<Button size="default" onclick={calculate} disabled={!targetPrice}>
					Calc
				</Button>
			</div>
			{#if targetPrice && !isNaN(parsedTarget) && parsedTarget > 0 && parsedTarget !== currentPrice}
				<div class="flex items-center gap-1.5">
					{#if isHigher}
						<HugeiconsIcon icon={ArrowUp01Icon} class="h-3 w-3 text-green-500" />
						<span class="text-xs text-green-500">
							+{(((parsedTarget - currentPrice) / currentPrice) * 100).toFixed(1)}% from current
						</span>
					{:else if isLower}
						<HugeiconsIcon icon={ArrowDown01Icon} class="h-3 w-3 text-red-500" />
						<span class="text-xs text-red-500">
							{(((parsedTarget - currentPrice) / currentPrice) * 100).toFixed(1)}% from current
						</span>
					{/if}
				</div>
			{/if}
		</div>

		{#if error}
			<p class="text-destructive text-xs">{error}</p>
		{/if}

		{#if result}
			<div class="bg-muted/50 rounded-md border p-3 space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground text-xs">Action needed</span>
					<Badge variant={result.direction === 'buy' ? 'success' : 'destructive'} class="text-xs">
						{result.direction === 'buy' ? '▲ BUY' : '▼ SELL'}
					</Badge>
				</div>

				{#if result.direction === 'buy'}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-xs">Spend (USD)</span>
						<span class="font-mono text-sm font-bold text-green-500">
							${formatAmount(result.amountNeeded)}
						</span>
					</div>
				{:else}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-xs">Sell ({coin.symbol})</span>
						<span class="font-mono text-sm font-bold text-red-500">
							{formatAmount(result.amountNeeded)} {coin.symbol}
						</span>
					</div>
				{/if}

				<div class="flex items-center justify-between">
					<span class="text-muted-foreground text-xs">Price impact</span>
					<span class="font-mono text-xs font-medium {result.priceImpact >= 0 ? 'text-green-500' : 'text-red-500'}">
						{result.priceImpact >= 0 ? '+' : ''}{result.priceImpact.toFixed(2)}%
					</span>
				</div>

				<div class="border-t pt-2 space-y-1">
					<p class="text-muted-foreground text-xs font-medium">After trade</p>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-xs">Pool Base</span>
						<span class="font-mono text-xs">${formatAmount(result.newPoolBase)}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-xs">Pool {coin.symbol}</span>
						<span class="font-mono text-xs">{formatAmount(result.newPoolCoin)}</span>
					</div>
				</div>
			</div>

			<div class="flex items-start gap-1.5">
				<HugeiconsIcon icon={InformationCircleIcon} class="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" />
				<p class="text-muted-foreground text-xs">
					This is a theoretical estimate. Real trades may differ due to slippage and other trades.
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>