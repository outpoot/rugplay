<script lang="ts">
	import Coinflip from '$lib/components/self/games/Coinflip.svelte';
	import Slots from '$lib/components/self/games/Slots.svelte';
	import Mines from '$lib/components/self/games/Mines.svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { PORTFOLIO_SUMMARY, fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import SEO from '$lib/components/self/SEO.svelte';
	import Dice from '$lib/components/self/games/Dice.svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';
	import { gamblingActivityStore } from '$lib/stores/websocket';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import { Clock, PiggyBank } from 'lucide-svelte';
	import { formatValue, formatRelativeTime, getPublicUrl } from '$lib/utils';
	import { _ } from 'svelte-i18n';

	let shouldSignIn = $state(false);
	let balance = $state(0);
	let loading = $state(true);
	let activeGame = $state('coinflip');

	// Filter activities to only show bets >= $1000
	const filteredActivities = $derived(
		$gamblingActivityStore.filter((activity) => activity.amount >= 1000).slice(0, 10)
	);

	function handleBalanceUpdate(newBalance: number) {
		balance = newBalance;

		if ($PORTFOLIO_SUMMARY) {
			PORTFOLIO_SUMMARY.update((data) =>
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
		if ($USER_DATA && $PORTFOLIO_SUMMARY) {
			balance = $PORTFOLIO_SUMMARY.baseCurrencyBalance;
		}
	});
</script>

<SEO
	title="Gambling - Rugplay"
	description="Play virtual gambling games with simulated currency in Rugplay. Try coinflip, slots, and mines games using virtual money with no real-world value - purely for entertainment."
	keywords="virtual gambling simulation, coinflip game, slots game, mines game, virtual casino, simulated gambling, entertainment games"
/>

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-center text-3xl font-bold">{$_('gambling.title')}</h1>

	{#if !$USER_DATA}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">{$_('gambling.signin.title')}</div>
				<p class="text-muted-foreground mb-4 text-sm">
					{$_('gambling.signin.description')}
				</p>
				<Button onclick={() => (shouldSignIn = true)}>{$_('signin.button')}</Button>
			</div>
		</div>
	{:else}
		<div class="mx-auto max-w-4xl space-y-6">
			<!-- Game Selection -->
			<div class="flex justify-center gap-4">
				<Button
					variant={activeGame === 'coinflip' ? 'default' : 'outline'}
					onclick={() => (activeGame = 'coinflip')}
				>
					{$_('gambling.games.coinflip.title')}
				</Button>
				<Button
					variant={activeGame === 'slots' ? 'default' : 'outline'}
					onclick={() => (activeGame = 'slots')}
				>
					{$_('gambling.games.slots.title')}
				</Button>
				<Button
					variant={activeGame === 'mines' ? 'default' : 'outline'}
					onclick={() => (activeGame = 'mines')}
				>
					{$_('gambling.games.mines.title')}
				</Button>
				<Button
					variant={activeGame === 'dice' ? 'default' : 'outline'}
					onclick={() => (activeGame = 'dice')}
				>
					{$_('gambling.games.dice.title')}
				</Button>
			</div>

			<!-- Game Content -->
			{#if activeGame === 'coinflip'}
				<Coinflip bind:balance onBalanceUpdate={handleBalanceUpdate} />
			{:else if activeGame === 'slots'}
				<Slots bind:balance onBalanceUpdate={handleBalanceUpdate} />
			{:else if activeGame === 'mines'}
				<Mines bind:balance onBalanceUpdate={handleBalanceUpdate} />
			{:else if activeGame === 'dice'}
				<Dice bind:balance onBalanceUpdate={handleBalanceUpdate} />
			{/if}

			<!-- Live Gambling Activity Feed -->
			<Card>
				<CardHeader>
					<CardTitle>{$_('base.live')}</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#if filteredActivities.length === 0}
							<div class="flex flex-col items-center justify-center py-8 text-center">
								<PiggyBank class="text-muted-foreground/50 mb-4 h-12 w-12" />
								<h3 class="mb-2 text-base font-semibold">{$_('gambling.live.noData.title')}</h3>
								<p class="text-muted-foreground text-sm">
									{$_('gambling.live.noData.description')}
								</p>
							</div>
						{:else}
							{#each filteredActivities as activity (`${activity.userId}-${activity.game}-${activity.timestamp}`)}
								<div
									class="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
								>
									<div class="flex items-center gap-3">
										<HoverCard.Root>
											<HoverCard.Trigger
												class="cursor-pointer font-medium underline-offset-4 hover:underline"
											>
												<div class="flex items-center gap-2">
													<Avatar.Root class="h-6 w-6">
														<Avatar.Image
															src={getPublicUrl(activity.userImage ?? null)}
															alt={activity.username}
														/>
														<Avatar.Fallback class="text-xs"
															>{activity.username.charAt(0).toUpperCase()}</Avatar.Fallback
														>
													</Avatar.Root>
													<span class="text-sm">@{activity.username}</span>
												</div>
											</HoverCard.Trigger>
											<HoverCard.Content class="w-80" side="top" sideOffset={3}>
												<UserProfilePreview userId={parseInt(activity.userId)} />
											</HoverCard.Content>
										</HoverCard.Root>

										<span class="text-muted-foreground text-sm"
											>{activity.won ? $_('gambling.live.won') : $_('gambling.live.lost')}</span
										>
										<span
											class="font-mono text-sm font-medium {activity.won
												? 'text-green-500'
												: 'text-red-500'}"
										>
											{formatValue(activity.amount)}
										</span>
										<span class="text-muted-foreground text-sm"
											>{$_('gambling.live.on').replace('{{game}}', activity.game)}</span
										>
									</div>

									<div class="text-muted-foreground flex items-center gap-1 text-xs">
										<Clock class="h-3 w-3" />
										<span class="font-mono">{formatRelativeTime(new Date(activity.timestamp))}</span
										>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</CardContent>
				<CardFooter>
					<p class="text-muted-foreground text-xs">{$_('gambling.live.description')}</p>
				</CardFooter>
			</Card>
		</div>
	{/if}
</div>
