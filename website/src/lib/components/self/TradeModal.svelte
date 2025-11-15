<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { TrendingUp, TrendingDown, Loader2 } from 'lucide-svelte';
	import { PORTFOLIO_SUMMARY } from '$lib/stores/portfolio-data';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		type,
		coin,
		userHolding = 0,
		onSuccess
	} = $props<{
		open?: boolean;
		type: 'BUY' | 'SELL';
		coin: any;
		userHolding?: number;
		onSuccess?: () => void;
	}>();

	let amount = $state('');
	let loading = $state(false);
	let confirmHighImpact = $state(false);

	let numericAmount = $derived(Number.parseFloat(amount) || 0);
	let currentPrice = $derived(Number(coin?.currentPrice) || 0);

	let maxSellableAmount = $derived(
		type === 'SELL' && coin
			? Math.max(0, Math.min(userHolding, Math.floor(Number(coin.poolCoinAmount) * 0.995)))
			: userHolding
	);

	function calculateEstimate(amount: number, tradeType: 'BUY' | 'SELL', price: number) {
		if (!amount || !price || !coin) return { result: 0, effectivePrice: 0, priceImpactPercent: 0, total: 0 };

		const poolCoin = Number(coin.poolCoinAmount);
		const poolBase = Number(coin.poolBaseCurrencyAmount);

		if (poolCoin <= 0 || poolBase <= 0) return { result: 0, effectivePrice: 0, priceImpactPercent: 0, total: 0 };

		const k = poolCoin * poolBase;
		const poolPrice = poolBase / poolCoin;

		if (tradeType === 'BUY') {
			const spend = amount;
			const newPoolBase = poolBase + spend;
			const newPoolCoin = k / newPoolBase;
			const coinsReceived = poolCoin - newPoolCoin;
			if (coinsReceived <= 0) return { result: 0, effectivePrice: 0, priceImpactPercent: 0, total: 0 };
			const effectivePrice = spend / coinsReceived;
			const priceImpactPercent = ((effectivePrice - poolPrice) / poolPrice) * 100;
			return { result: coinsReceived, effectivePrice, priceImpactPercent, total: spend };
		} else {
			const sellCoins = amount;
			const newPoolCoin = poolCoin + sellCoins;
			const newPoolBase = k / newPoolCoin;
			const baseReceived = poolBase - newPoolBase;
			if (baseReceived <= 0 || sellCoins <= 0) return { result: 0, effectivePrice: 0, priceImpactPercent: 0, total: 0 };
			const effectivePrice = baseReceived / sellCoins;
			const priceImpactPercent = ((effectivePrice - poolPrice) / poolPrice) * 100;
			return { result: baseReceived, effectivePrice, priceImpactPercent, total: baseReceived };
		}
	}

	let estimatedResult = $derived(calculateEstimate(numericAmount, type, currentPrice));
	let hasValidAmount = $derived(numericAmount > 0);
	let userBalance = $derived($PORTFOLIO_SUMMARY ? Number($PORTFOLIO_SUMMARY.baseCurrencyBalance) : 0);
	let hasEnoughFunds = $derived(
		type === 'BUY' ? numericAmount <= userBalance && numericAmount > 0 : numericAmount <= userHolding && numericAmount > 0
	);

	let requireConfirmation = $derived(Math.abs(Number(estimatedResult.priceImpactPercent ?? 0)) > 20);
	let canTrade = $derived(hasValidAmount && hasEnoughFunds && !loading && (!requireConfirmation || confirmHighImpact));

	function handleClose() {
		open = false;
		amount = '';
		loading = false;
		confirmHighImpact = false;
	}

	async function handleTrade() {
		if (!canTrade) return;

		loading = true;
		try {
			const response = await fetch(`/api/coin/${coin.symbol}/trade`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type,
					amount: numericAmount
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Trade failed');
			}

			toast.success(`${type === 'BUY' ? 'Bought' : 'Sold'} successfully!`, {
				description:
					type === 'BUY'
						? `Purchased ${result.coinsBought.toFixed(6)} ${coin.symbol} for $${result.totalCost.toFixed(6)}`
						: `Sold ${result.coinsSold.toFixed(6)} ${coin.symbol} for $${result.totalReceived.toFixed(6)}`
			});

			onSuccess?.();
			handleClose();
		} catch (e) {
			toast.error('Trade failed', {
				description: (e as Error).message
			});
		} finally {
			loading = false;
			confirmHighImpact = false;
		}
	}

	function setMaxAmount() {
		if (type === 'SELL') {
			amount = maxSellableAmount.toString();
		} else if ($PORTFOLIO_SUMMARY) {
			amount = userBalance.toString();
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				{#if type === 'BUY'}
					<TrendingUp class="h-5 w-5 text-green-500" />
					Buy {coin.symbol}
				{:else}
					<TrendingDown class="h-5 w-5 text-red-500" />
					Sell {coin.symbol}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				Current price: ${Number(coin.currentPrice).toFixed(6)} per {coin.symbol}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="amount">
					{type === 'BUY' ? 'Amount to spend ($)' : `Amount (${coin.symbol})`}
				</Label>
				<div class="flex gap-2">
					<Input
						id="amount"
						type="number"
						step={type === 'BUY' ? '0.01' : '1'}
						min="0"
						bind:value={amount}
						placeholder="0.00"
						class="flex-1"
						aria-label={type === 'BUY' ? 'Amount to spend in dollars' : `Amount of ${coin.symbol} to sell`}
					/>
					<Button variant="outline" size="sm" onclick={setMaxAmount} aria-label="Set max amount">Max</Button>
				</div>
				{#if type === 'SELL'}
					<p class="text-muted-foreground text-xs">
						Available: {userHolding.toFixed(6)}{coin.symbol}
						{#if maxSellableAmount < userHolding}
							<br />Max sellable: {maxSellableAmount.toFixed(0)} {coin.symbol} (pool limit)
						{/if}
					</p>
				{:else if $PORTFOLIO_SUMMARY}
					<p class="text-muted-foreground text-xs">
						Balance: ${userBalance.toFixed(6)}
					</p>
				{/if}
			</div>

			{#if hasValidAmount}
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">
							{type === 'BUY' ? `${coin.symbol} you'll get:` : "You'll receive:"}
						</span>
						<span class="font-bold">
							{type === 'BUY'
								? `~${Number(estimatedResult.result).toFixed(6)} ${coin.symbol}`
								: `~$${Number(estimatedResult.result).toFixed(6)}`}
						</span>
					</div>
					<div class="mt-2 flex items-center gap-3 text-xs">
						<div class="flex items-center gap-1">
							<span class="text-muted-foreground">Effective price:</span>
							<span class="font-mono">{Number(estimatedResult.effectivePrice || 0).toFixed(6)}</span>
						</div>
						<div class="flex items-center gap-1">
							<span class="text-muted-foreground">Impact:</span>
							<span class="font-mono">{Number(estimatedResult.priceImpactPercent || 0).toFixed(2)}%</span>
						</div>
						<div class="flex items-center gap-1">
							<span class="text-muted-foreground">Total:</span>
							<span class="font-mono">
								{type === 'BUY' ? `$${Number(estimatedResult.total || 0).toFixed(6)}` : `$${Number(estimatedResult.total || 0).toFixed(6)}`}
							</span>
						</div>
					</div>
					<p class="text-muted-foreground mt-1 text-xs">
						AMM estimation - includes slippage from pool impact
					</p>
				</div>
			{/if}

			{#if !hasEnoughFunds && hasValidAmount}
				<Badge variant="destructive" class="text-xs">
					{type === 'BUY' ? 'Insufficient funds' : 'Insufficient coins'}
				</Badge>
			{/if}

			{#if requireConfirmation}
				<div class="flex items-center gap-2 text-sm">
					<input id="confirm-high-impact" type="checkbox" bind:checked={confirmHighImpact} />
					<label for="confirm-high-impact">I understand this trade has high price impact ({Number(estimatedResult.priceImpactPercent).toFixed(2)}%)</label>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex gap-2">
			<Button variant="outline" onclick={handleClose} disabled={loading}>Cancel</Button>
			<Button
				onclick={handleTrade}
				disabled={!canTrade}
				variant={type === 'BUY' ? 'default' : 'destructive'}
				aria-disabled={!canTrade}
			>
				{#if loading}
					<Loader2 class="h-4 w-4 animate-spin" />
					Processing...
				{:else}
					{type === 'BUY' ? 'Buy' : 'Sell'} {coin.symbol}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
