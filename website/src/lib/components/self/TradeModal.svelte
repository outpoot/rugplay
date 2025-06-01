<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { TrendingUp, TrendingDown, Loader2 } from 'lucide-svelte';
	import { PORTFOLIO_DATA } from '$lib/stores/portfolio-data';
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

	let numericAmount = $derived(parseFloat(amount) || 0);
	let currentPrice = $derived(coin.currentPrice || 0);

	let maxSellableAmount = $derived(
		type === 'SELL' && coin
			? Math.min(userHolding, Math.floor(Number(coin.poolCoinAmount) * 0.995))
			: userHolding
	);
	let estimatedResult = $derived(calculateEstimate(numericAmount, type, currentPrice));
	let hasValidAmount = $derived(numericAmount > 0);
	let userBalance = $derived($PORTFOLIO_DATA ? $PORTFOLIO_DATA.baseCurrencyBalance : 0);
	let hasEnoughFunds = $derived(
		type === 'BUY' ? numericAmount <= userBalance : numericAmount <= userHolding
	);
	let canTrade = $derived(hasValidAmount && hasEnoughFunds && !loading);

	function calculateEstimate(amount: number, tradeType: 'BUY' | 'SELL', price: number) {
		if (!amount || !price || !coin) return { result: 0 };

		const poolCoin = Number(coin.poolCoinAmount);
		const poolBase = Number(coin.poolBaseCurrencyAmount);

		if (poolCoin <= 0 || poolBase <= 0) return { result: 0 };

		const k = poolCoin * poolBase;

		if (tradeType === 'BUY') {
			// AMM formula: how many coins for spending 'amount' dollars
			const newPoolBase = poolBase + amount;
			const newPoolCoin = k / newPoolBase;
			return { result: poolCoin - newPoolCoin };
		} else {
			// AMM formula: how many dollars for selling 'amount' coins
			const newPoolCoin = poolCoin + amount;
			const newPoolBase = k / newPoolCoin;
			return { result: poolBase - newPoolBase };
		}
	}

	function handleClose() {
		open = false;
		amount = '';
		loading = false;
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
		}
	}

	function setMaxAmount() {
		if (type === 'SELL') {
			amount = maxSellableAmount.toString();
		} else if ($PORTFOLIO_DATA) {
			// For BUY, max is user's balance
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
				Current price: ${coin.currentPrice.toFixed(6)} per {coin.symbol}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Amount Input -->
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
					/>
					<Button variant="outline" size="sm" onclick={setMaxAmount}>Max</Button>
				</div>
				{#if type === 'SELL'}
					<p class="text-muted-foreground text-xs">
						Available: {userHolding.toFixed(6)}
						{coin.symbol}
						{#if maxSellableAmount < userHolding}
							<br />Max sellable: {maxSellableAmount.toFixed(0)} {coin.symbol} (pool limit)
						{/if}
					</p>
				{:else if $PORTFOLIO_DATA}
					<p class="text-muted-foreground text-xs">
						Balance: ${userBalance.toFixed(6)}
					</p>
				{/if}
			</div>

			<!-- Estimated Cost/Return with explicit fees -->
			{#if hasValidAmount}
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">
							{type === 'BUY' ? `${coin.symbol} you'll get:` : "You'll receive:"}
						</span>
						<span class="font-bold">
							{type === 'BUY'
								? `~${estimatedResult.result.toFixed(6)} ${coin.symbol}`
								: `~$${estimatedResult.result.toFixed(6)}`}
						</span>
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
		</div>

		<Dialog.Footer class="flex gap-2">
			<Button variant="outline" onclick={handleClose} disabled={loading}>Cancel</Button>
			<Button
				onclick={handleTrade}
				disabled={!canTrade}
				variant={type === 'BUY' ? 'default' : 'destructive'}
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
