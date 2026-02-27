<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { TradeUpIcon, TradeDownIcon, Loading03Icon, Coins01Icon, Dollar02Icon } from '@hugeicons/core-free-icons';
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
	let sellByDollar = $state(false);

	let numericAmount = $derived(parseFloat(amount) || 0);
	let currentPrice = $derived(coin.currentPrice || 0);

	let maxSellableAmount = $derived(
		type === 'SELL' && coin
			? Math.min(userHolding, Math.floor(Number(coin.poolCoinAmount) * 0.995))
			: userHolding
	);

	let effectiveSellCoinAmount = $derived(() => {
		if (type !== 'SELL' || !sellByDollar || numericAmount <= 0) return numericAmount;
		const poolCoin = Number(coin.poolCoinAmount);
		const poolBase = Number(coin.poolBaseCurrencyAmount);
		if (poolCoin <= 0 || poolBase <= 0) return 0;
		const k = poolCoin * poolBase;

		const targetBase = poolBase - numericAmount;
		if (targetBase <= 0) return maxSellableAmount;
		const requiredCoins = k / targetBase - poolCoin;
		return Math.max(0, requiredCoins);
	});

	let estimatedResult = $derived(
		sellByDollar && type === 'SELL'
			? calculateEstimate(effectiveSellCoinAmount(), type, currentPrice)
			: calculateEstimate(numericAmount, type, currentPrice)
	);
	let hasValidAmount = $derived(numericAmount > 0);
	let userBalance = $derived($PORTFOLIO_SUMMARY ? $PORTFOLIO_SUMMARY.baseCurrencyBalance : 0);
	let hasEnoughFunds = $derived(() => {
		if (type === 'BUY') return numericAmount <= userBalance;
		if (sellByDollar) {
			return effectiveSellCoinAmount() <= userHolding;
		}
		return numericAmount <= userHolding;
	});
	let canTrade = $derived(hasValidAmount && hasEnoughFunds() && !loading);

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
		sellByDollar = false;
	}

	async function handleTrade() {
		if (!canTrade) return;

		loading = true;
		try {
			const tradeAmount = (type === 'SELL' && sellByDollar)
				? effectiveSellCoinAmount()
				: numericAmount;

			const response = await fetch(`/api/coin/${coin.symbol}/trade`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type,
					amount: tradeAmount
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
			if (sellByDollar) {
				const est = calculateEstimate(maxSellableAmount, 'SELL', currentPrice);
				amount = (Math.floor(est.result * 100) / 100).toFixed(2);
			} else {
				amount = maxSellableAmount.toString();
			}
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
					<HugeiconsIcon icon={TradeUpIcon} class="h-5 w-5 text-green-500" />
					Buy {coin.symbol}
				{:else}
					<HugeiconsIcon icon={TradeDownIcon} class="h-5 w-5 text-red-500" />
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
					{type === 'BUY' ? 'Amount to spend ($)' : (sellByDollar ? 'Dollar amount to receive ($)' : `Amount (${coin.symbol})`)}
				</Label>
				<div class="flex gap-2">
					<Input
						id="amount"
						type="number"
						step={type === 'BUY' || sellByDollar ? '0.01' : '1'}
						min="0"
						bind:value={amount}
						placeholder="0.00"
						class="flex-1"
					/>
					{#if type === 'SELL'}
						<Button variant="outline" size="icon" class="h-9 w-9 shrink-0" onclick={() => { sellByDollar = !sellByDollar; amount = ''; }}>
							{#key sellByDollar}
								<HugeiconsIcon icon={sellByDollar ? Dollar02Icon : Coins01Icon} class="h-4 w-4" />
							{/key}
						</Button>
					{/if}
					<Button variant="outline" size="sm" class="h-9 shrink-0" onclick={setMaxAmount}>Max</Button>
				</div>
				{#if type === 'SELL'}
					<p class="text-muted-foreground text-xs">
						Available: {userHolding.toFixed(6)}
						{coin.symbol}
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

			<!-- Estimated Cost/Return with explicit fees -->
			{#if hasValidAmount}
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">
							{type === 'BUY' ? `${coin.symbol} you'll get:` : (sellByDollar ? `${coin.symbol} to sell:` : "You'll receive:")}
						</span>
						<span class="font-bold">
							{#if type === 'BUY'}
								~{estimatedResult.result.toFixed(6)} {coin.symbol}
							{:else if sellByDollar}
								~{effectiveSellCoinAmount().toFixed(6)} {coin.symbol}
							{:else}
								~${estimatedResult.result.toFixed(6)}
							{/if}
						</span>
					</div>
					<p class="text-muted-foreground mt-1 text-xs">
						AMM estimation - includes slippage from pool impact
					</p>
				</div>
			{/if}

			{#if !hasEnoughFunds() && hasValidAmount}
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
					<HugeiconsIcon icon={Loading03Icon} class="h-4 w-4 animate-spin" />
					Processing...
				{:else}
					{type === 'BUY' ? 'Buy' : 'Sell'} {coin.symbol}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>