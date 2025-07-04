<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { PiggyBank, ArrowDown, ArrowUp, Loader2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { formatValue, formatTimeRemaining } from '$lib/utils';
	import SEO from '$lib/components/self/SEO.svelte';

	let { data } = $props();

	// Use the authenticated fetcher from the load function
	const authedFetch = data.fetcher;

	let bankBalance = $state(0);
	let cashBalance = $state(0);
	let nextInterestIn = $state(0);
	let loading = $state(true);

	let depositAmount = $state('');
	let withdrawAmount = $state('');
	let isDepositing = $state(false);
	let isWithdrawing = $state(false);

	async function fetchBankStatus() {
		try {
			const response = await authedFetch('/api/bank/status');
			if (!response.ok) {
				throw new Error('Failed to fetch bank status');
			}
			const result = await response.json();
			bankBalance = result.bankBalance;
			cashBalance = result.cashBalance;
			nextInterestIn = result.nextInterestIn;
		} catch (e) {
			toast.error('Could not load bank data.');
			console.error('Failed to fetch bank status:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchBankStatus();

		const interval = setInterval(() => {
			if (nextInterestIn > 0) {
				nextInterestIn -= 1000;
			} else {
				nextInterestIn = 0;
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	async function handleDeposit() {
		const amount = parseFloat(depositAmount);
		if (isNaN(amount) || amount <= 0) return;
		isDepositing = true;
		try {
			const response = await authedFetch('/api/bank/deposit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					amount,
					preserveInterestTimer: true  // Don't reset the timer on deposit
				})
			});
			const result = await response.json();
			if (response.ok) {
				toast.success(`Deposited ${formatValue(amount)}`);
				depositAmount = '';
				// Refresh data after action
				await fetchBankStatus();
			} else {
				toast.error(result.error || 'Deposit failed');
			}
		} catch (e) {
			toast.error('Deposit failed');
		} finally {
			isDepositing = false;
		}
	}

	async function handleWithdraw() {
		const amount = parseFloat(withdrawAmount);
		if (isNaN(amount) || amount <= 0) return;
		isWithdrawing = true;
		try {
			const response = await authedFetch('/api/bank/withdraw', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					amount,
					resetInterestTimer: true  // Reset the timer on withdrawal
				})
			});
			const result = await response.json();
			if (response.ok) {
				toast.success(`Withdrew ${formatValue(amount)}`);
				withdrawAmount = '';
				// Refresh data after action
				await fetchBankStatus();
			} else {
				toast.error(result.error || 'Withdrawal failed');
			}
		} catch (e) {
			toast.error('Withdrawal failed');
		} finally {
			isWithdrawing = false;
		}
	}

	function setDepositAmount(value: number) {
		depositAmount = Math.min(value, cashBalance).toFixed(2);
	}
	
	function setWithdrawAmount(value: number) {
		withdrawAmount = Math.min(value, bankBalance).toFixed(2);
	}
</script>

<SEO
	title="Bank - Rugplay"
	description="Deposit your virtual currency into the Rugplay bank to earn interest. Manage your savings and grow your wealth in our crypto trading simulation game."
/>

<div class="container mx-auto max-w-4xl p-6">
	<header class="mb-8 text-center">
		<h1 class="text-3xl font-bold flex items-center justify-center gap-2"><PiggyBank /> Bank</h1>
		<p class="text-muted-foreground">Deposit your cash to earn interest over time.</p>
	</header>

	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<Card.Root>
				<Card.Content class="p-6 space-y-4">
					<div class="h-6 w-3/4 bg-muted rounded"></div>
					<div class="h-8 w-1/2 bg-muted rounded"></div>
					<div class="h-8 w-1/2 bg-muted rounded"></div>
				</Card.Content>
			</Card.Root>
			<div class="space-y-6">
				<Card.Root><Card.Content class="p-6"><div class="h-24 bg-muted rounded"></div></Card.Content></Card.Root>
				<Card.Root><Card.Content class="p-6"><div class="h-24 bg-muted rounded"></div></Card.Content></Card.Root>
			</div>
		</div>
	{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Account Summary</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div>
					<Label>Bank Balance</Label>
					<p class="text-2xl font-bold">{formatValue(bankBalance)}</p>
				</div>
				<div>
					<Label>Cash Balance</Label>
					<p class="text-2xl font-bold">{formatValue(cashBalance)}</p>
				</div>
				<div class="text-sm text-muted-foreground">
					<p>Interest rate: 10% per 24 hours</p>
					<p>Next interest payment in: {formatTimeRemaining(nextInterestIn)}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><ArrowDown /> Deposit</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="deposit-amount">Amount</Label>
							<Input id="deposit-amount" name="amount" type="number" placeholder="0.00" bind:value={depositAmount} step="0.01" />
							<div class="grid grid-cols-4 gap-2 pt-1">
								<Button size="sm" variant="outline" type="button" onclick={() => setDepositAmount(cashBalance * 0.25)}>25%</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => setDepositAmount(cashBalance * 0.50)}>50%</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => setDepositAmount(cashBalance * 0.75)}>75%</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => setDepositAmount(cashBalance)}>Max</Button>
							</div>
						</div>
						<Button class="w-full" onclick={handleDeposit} disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > cashBalance}>
							{#if isDepositing}<Loader2 class="h-4 w-4 animate-spin"/>{:else}Deposit{/if}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><ArrowUp /> Withdraw</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="withdraw-amount">Amount</Label>
							<Input id="withdraw-amount" name="amount" type="number" placeholder="0.00" bind:value={withdrawAmount} step="0.01" />
							<div class="grid grid-cols-4 gap-2 pt-1">
								<Button size="sm" variant="outline" type="button" onclick={() => setWithdrawAmount(bankBalance * 0.25)}>25%</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => setWithdrawAmount(bankBalance * 0.50)}>50%</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => setWithdrawAmount(bankBalance * 0.75)}>75%</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => setWithdrawAmount(bankBalance)}>Max</Button>
							</div>
						</div>
						<Button class="w-full" variant="outline" onclick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > bankBalance}>
							{#if isWithdrawing}<Loader2 class="h-4 w-4 animate-spin"/>{:else}Withdraw{/if}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
	{/if}
</div>