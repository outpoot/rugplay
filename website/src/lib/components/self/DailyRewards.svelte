<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Gift, Clock, Loader2, CheckIcon, Star } from 'lucide-svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { formatTimeRemaining } from '$lib/utils';

	interface RewardStatus {
		canClaim: boolean;
		rewardAmount: number;
		baseReward: number;
		prestigeBonus?: number;
		prestigeLevel?: number;
		timeRemaining: number;
		nextClaimTime: string | null;
		totalRewardsClaimed: number;
		lastRewardClaim: string | null;
		loginStreak: number;
	}

	type ClaimState = 'idle' | 'loading' | 'success';

	let rewardStatus = $state<RewardStatus | null>(null);
	let claimState = $state<ClaimState>('idle');
	let error = $state<string | null>(null);

	$effect(() => {
		if ($USER_DATA) {
			fetchRewardStatus();
			const interval = setInterval(() => {
				if (rewardStatus && !rewardStatus.canClaim) {
					fetchRewardStatus();
				}
			}, 60000);

			return () => clearInterval(interval);
		}
	});

	async function fetchRewardStatus() {
		try {
			const response = await fetch('/api/rewards/claim');
			if (response.ok) {
				rewardStatus = await response.json();
				error = null;
			} else {
				error = 'Failed to fetch reward status';
			}
		} catch (err) {
			error = 'Network error';
			console.error('Error fetching reward status:', err);
		}
	}

	async function claimReward() {
		if (!rewardStatus?.canClaim || claimState === 'loading') return;

		claimState = 'loading';
		error = null;

		try {
			const response = await fetch('/api/rewards/claim', {
				method: 'POST'
			});

			if (response.ok) {
				const result = await response.json();
				claimState = 'success';

				const prestigeBonus = result.prestigeBonus || 0;
				const hasPrestigeBonus = prestigeBonus > 0;

				toast.success(`Daily reward claimed! +$${formatCurrency(result.rewardAmount)}`, {
					description: hasPrestigeBonus 
						? `Base: $${formatCurrency(result.baseReward)} + Prestige bonus: $${formatCurrency(prestigeBonus)} | Streak: ${rewardStatus.loginStreak} days 🔥`
						: rewardStatus.loginStreak > 0
							? `Login streak: ${rewardStatus.loginStreak} days 🔥`
							: undefined,
					action: {
						label: 'View Portfolio',
						onClick: () => {
							goto('/portfolio');
						}
					}
				});

				if ($USER_DATA) {
					await fetchPortfolioSummary();
				}

				await fetchRewardStatus();

				setTimeout(() => {
					claimState = 'idle';
				}, 1000);
			} else {
				const errorData = await response.json();
				if (response.status === 429 && errorData.timeRemaining) {
					await fetchRewardStatus();

					const hours = Math.floor(errorData.timeRemaining / (60 * 60 * 1000));
					const minutes = Math.floor((errorData.timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
					const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

					const streakDescription =
						rewardStatus?.loginStreak > 0
							? `Login streak: ${rewardStatus.loginStreak} days 🔥. Next reward available in ${timeText}. Come back later!`
							: `Next reward available in ${timeText}. Come back later!`;

					toast.info('Daily reward on cooldown', {
						description: streakDescription
					});
				} else {
					error = errorData.error || errorData.message || 'Failed to claim reward';
					toast.error('Failed to claim reward');
				}
			}
		} catch (err) {
			error = 'Network error';
			toast.error('Network error', {
				description: 'Please check your connection and try again.'
			});
			console.error('Error claiming reward:', err);
		} finally {
			if (claimState !== 'success') {
				claimState = 'idle';
			}
		}
	}

	function formatCurrency(value: number): string {
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		});
	}
</script>

<Button
	onclick={claimReward}
	disabled={claimState === 'loading' || !rewardStatus?.canClaim}
	class="w-full transition-all duration-300"
	size="sm"
	variant={claimState === 'success' ? 'secondary' : rewardStatus?.canClaim ? 'default' : 'outline'}
>
	{#if !rewardStatus || claimState === 'loading'}
		<Loader2 class="h-4 w-4 animate-spin" />
		<span>{!rewardStatus ? 'Loading...' : 'Claiming...'}</span>
	{:else if claimState === 'success'}
		<CheckIcon class="h-4 w-4" />
		<span>Claimed!</span>
	{:else if rewardStatus.canClaim}
		<Gift class="h-4 w-4" />
		<span>Claim ${formatCurrency(rewardStatus.rewardAmount)}</span>
	{:else}
		<Clock class="h-4 w-4" />
		<span>Next in {formatTimeRemaining(rewardStatus.timeRemaining)}</span>
	{/if}
</Button>
