<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Send, DollarSign, Coins, Loader2 } from 'lucide-svelte';
	import { PORTFOLIO_DATA } from '$lib/stores/portfolio-data';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		onSuccess,
		prefilledUsername = ''
	} = $props<{
		open?: boolean;
		onSuccess?: () => void;
		prefilledUsername?: string;
	}>();

	let recipientUsername = $state('');
	let transferType = $state('CASH');
	let amount = $state('');
	let selectedCoinSymbol = $state('');
	let loading = $state(false);

	let numericAmount = $derived(parseFloat(amount) || 0);
	let hasValidAmount = $derived(numericAmount > 0);
	let hasValidRecipient = $derived(recipientUsername.trim().length > 0);
	let userBalance = $derived($PORTFOLIO_DATA ? $PORTFOLIO_DATA.baseCurrencyBalance : 0);
	let coinHoldings = $derived($PORTFOLIO_DATA ? $PORTFOLIO_DATA.coinHoldings : []);

	let selectedCoinHolding = $derived(
		coinHoldings.find((holding) => holding.symbol === selectedCoinSymbol)
	);

	let estimatedValue = $derived(
		transferType === 'COIN' && selectedCoinHolding && numericAmount > 0
			? numericAmount * selectedCoinHolding.currentPrice
			: 0
	);

	let maxAmount = $derived(
		transferType === 'CASH' ? userBalance : selectedCoinHolding ? selectedCoinHolding.quantity : 0
	);

	let hasEnoughFunds = $derived(
		transferType === 'CASH'
			? numericAmount <= userBalance
			: selectedCoinHolding
				? numericAmount <= selectedCoinHolding.quantity
				: false
	);

	let isWithinCashLimit = $derived(
		transferType === 'CASH' ? numericAmount >= 10 : true
	);

	let isWithinCoinValueLimit = $derived(
		transferType === 'COIN' ? estimatedValue >= 10 : true
	);

	let canSend = $derived(
		hasValidAmount &&
			hasValidRecipient &&
			hasEnoughFunds &&
			isWithinCashLimit &&
			isWithinCoinValueLimit &&
			!loading &&
			(transferType === 'CASH' || selectedCoinSymbol.length > 0)
	);

	function handleClose() {
		open = false;
		recipientUsername = '';
		transferType = 'CASH';
		amount = '';
		selectedCoinSymbol = '';
		loading = false;
	}

	function setMaxAmount() {
		if (transferType === 'CASH') {
			amount = Math.max(maxAmount, 10).toString();
		} else {
			amount = maxAmount.toString();
		}
	}

	function handleTypeChange(value: string) {
		transferType = value;
		if (value === 'CASH') {
			selectedCoinSymbol = '';
		} else if (coinHoldings.length > 0) {
			selectedCoinSymbol = coinHoldings[0].symbol;
		}
		amount = '';
	}

	$effect(() => {
		if (open && prefilledUsername) {
			recipientUsername = prefilledUsername;
		}
	});

	async function handleSend() {
		if (!canSend) return;

		loading = true;
		try {
			const response = await fetch('/api/transfer', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					recipientUsername: recipientUsername.trim(),
					type: transferType,
					amount: numericAmount,
					coinSymbol: transferType === 'COIN' ? selectedCoinSymbol : undefined
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Transfer failed');
			}

			if (result.type === 'CASH') {
				toast.success('Money sent successfully!', {
					description: `Sent $${result.amount.toFixed(2)} to @${result.recipient}`
				});
			} else {
				const estimatedValueForToast = estimatedValue;
				toast.success('Coins sent successfully!', {
					description: `Sent ${result.amount.toFixed(6)} ${result.coinSymbol} (≈$${estimatedValueForToast.toFixed(2)}) to @${result.recipient}`
				});
			}

			onSuccess?.();
			handleClose();
		} catch (e) {
			toast.error('Transfer failed', {
				description: (e as Error).message
			});
		} finally {
			loading = false;
		}
	}

	let transferTypeOptions = [
		{ value: 'CASH', label: 'Cash ($)' },
		{ value: 'COIN', label: 'Coins' }
	];

	let currentTransferTypeLabel = $derived(
		transferTypeOptions.find((option) => option.value === transferType)?.label ||
			'Select transfer type'
	);

	let currentCoinLabel = $derived(
		!selectedCoinSymbol
			? 'Select coin to send'
			: (() => {
					const holding = coinHoldings.find((h) => h.symbol === selectedCoinSymbol);
					return holding
						? `*${holding.symbol} (${holding.quantity.toFixed(6)} available)`
						: selectedCoinSymbol;
				})()
	);

	function handleCoinChange(value: string) {
		selectedCoinSymbol = value;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Send class="h-5 w-5" />
				Send
			</Dialog.Title>
			<Dialog.Description>Send cash or coins to another user</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Recipient Username -->
			<div class="space-y-2">
				<Label for="recipient">Recipient</Label>
				<Input
					id="recipient"
					type="text"
					bind:value={recipientUsername}
					placeholder="Enter username (without @)"
					class="flex-1"
				/>
			</div>

			<!-- Transfer Type -->
			<div class="space-y-2">
				<Label>Type</Label>
				<Select.Root type="single" bind:value={transferType} onValueChange={handleTypeChange}>
					<Select.Trigger class="w-full">
						{currentTransferTypeLabel}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Item value="CASH" label="Cash ($)">
								<div class="flex items-center gap-2">
									<DollarSign class="h-4 w-4" />
									Cash ($)
								</div>
							</Select.Item>
							<Select.Item value="COIN" label="Coins" disabled={coinHoldings.length === 0}>
								<div class="flex items-center gap-2">
									<Coins class="h-4 w-4" />
									Coins
								</div>
							</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Coin Selection (if coin transfer) -->
			{#if transferType === 'COIN'}
				<div class="space-y-2">
					<Label>Select Coin</Label>
					<Select.Root
						type="single"
						bind:value={selectedCoinSymbol}
						onValueChange={handleCoinChange}
					>
						<Select.Trigger class="w-full">
							{currentCoinLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each coinHoldings as holding}
									<Select.Item value={holding.symbol} label="*{holding.symbol}">
										*{holding.symbol} ({holding.quantity.toFixed(6)} available)
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			<!-- Amount Input -->
			<div class="space-y-2">
				<Label for="amount">
					{transferType === 'CASH' ? 'Amount ($)' : `Amount (${selectedCoinSymbol})`}
				</Label>
				<div class="flex gap-2">
					<Input
						id="amount"
						type="number"
						step={transferType === 'CASH' ? '0.01' : '0.000001'}
						min="0"
						bind:value={amount}
						placeholder="0.00"
						class="flex-1"
					/>
					<Button variant="outline" size="sm" onclick={setMaxAmount}>Max</Button>
				</div>
				<div class="flex justify-between text-xs">
					<p class="text-muted-foreground">
						Available: {transferType === 'CASH'
							? `$${userBalance.toFixed(2)}`
							: selectedCoinHolding
								? `${selectedCoinHolding.quantity.toFixed(6)} ${selectedCoinSymbol}`
								: '0'}
					</p>
					{#if transferType === 'COIN' && estimatedValue > 0}
						<p class="text-muted-foreground">
							≈ ${estimatedValue.toFixed(2)}
						</p>
					{/if}
				</div>
				{#if transferType === 'CASH'}
					<p class="text-muted-foreground text-xs">
						Minimum: $10.00 per transfer
					</p>
				{:else if transferType === 'COIN'}
					<p class="text-muted-foreground text-xs">
						Minimum estimated value: $10.00 per transfer
					</p>
				{/if}
			</div>

			{#if !hasEnoughFunds && hasValidAmount}
				<Badge variant="destructive" class="text-xs">
					Insufficient {transferType === 'CASH' ? 'funds' : 'coins'}
				</Badge>
			{:else if !isWithinCashLimit && hasValidAmount}
				<Badge variant="destructive" class="text-xs">
					Cash transfers require a minimum of $10.00
				</Badge>
			{:else if !isWithinCoinValueLimit && hasValidAmount}
				<Badge variant="destructive" class="text-xs">
					Coin transfers require a minimum estimated value of $10.00
				</Badge>
			{/if}

			{#if hasValidAmount && hasEnoughFunds && hasValidRecipient && isWithinCashLimit && isWithinCoinValueLimit}
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">You're sending:</span>
						<div class="text-right">
							<span class="block font-bold">
								{transferType === 'CASH'
									? `$${numericAmount.toFixed(2)}`
									: `${numericAmount.toFixed(6)} ${selectedCoinSymbol}`}
							</span>
							{#if transferType === 'COIN' && estimatedValue > 0}
								<span class="text-muted-foreground text-xs">
									≈ ${estimatedValue.toFixed(2)} USD
								</span>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">To:</span>
						<span class="font-bold">@{recipientUsername}</span>
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex gap-2">
			<Button variant="outline" onclick={handleClose} disabled={loading}>Cancel</Button>
			<Button onclick={handleSend} disabled={!canSend}>
				{#if loading}
					<Loader2 class="h-4 w-4 animate-spin" />
					Sending...
				{:else}
					<Send class="h-4 w-4" />
					Send
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
