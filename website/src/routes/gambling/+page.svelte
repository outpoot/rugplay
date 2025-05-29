<script lang="ts">
	import Coinflip from '$lib/components/self/games/Coinflip.svelte';
	import Slots from '$lib/components/self/games/Slots.svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { PORTFOLIO_DATA, fetchPortfolioData } from '$lib/stores/portfolio-data';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import { Button } from '$lib/components/ui/button';

	let shouldSignIn = $state(false);
	let balance = $state(0);
	let loading = $state(true);
	let activeGame = $state('coinflip');

	function handleBalanceUpdate(newBalance: number) {
		balance = newBalance;

		if ($PORTFOLIO_DATA) {
			PORTFOLIO_DATA.update((data) =>
				data
					? {
							...data,
							baseCurrencyBalance: newBalance,
							totalValue: newBalance + data.totalCoinValue
						}
					: null
			);
		}
	}

	$effect(() => {
		if ($USER_DATA && $PORTFOLIO_DATA) {
			balance = $PORTFOLIO_DATA.baseCurrencyBalance;
		}
	});
</script>

<SignInConfirmDialog bind:open={shouldSignIn} />

<svelte:head>
	<title>Gambling - Rugplay</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-6">
	<h1 class="mb-6 text-center text-3xl font-bold">Gambling</h1>

	{#if !$USER_DATA}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">Sign in to start gambling</div>
				<p class="text-muted-foreground mb-4 text-sm">You need an account to place bets</p>
				<button
					class="text-primary underline hover:cursor-pointer"
					onclick={() => (shouldSignIn = true)}
				>
					Sign in to continue
				</button>
			</div>
		</div>
	{:else}
		<!-- Game Selection -->
		<div class="mb-6 flex justify-center gap-4">
			<Button
				variant={activeGame === 'coinflip' ? 'default' : 'outline'}
				onclick={() => (activeGame = 'coinflip')}
			>
				Coinflip
			</Button>
			<Button
				variant={activeGame === 'slots' ? 'default' : 'outline'}
				onclick={() => (activeGame = 'slots')}
			>
				Slots
			</Button>
		</div>

		<!-- Game Content -->
		{#if activeGame === 'coinflip'}
			<Coinflip bind:balance onBalanceUpdate={handleBalanceUpdate} />
		{:else if activeGame === 'slots'}
			<Slots bind:balance onBalanceUpdate={handleBalanceUpdate} />
		{/if}
	{/if}
</div>
