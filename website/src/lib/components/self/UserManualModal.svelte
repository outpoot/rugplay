<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ChevronLeft,
		ChevronRight,
		BookOpen,
		Coins,
		TrendingUp,
		TrendingDown,
		Dice1,
		Target,
		BarChart3,
		Trophy
	} from 'lucide-svelte';

	let { open = $bindable(false) } = $props<{
		open?: boolean;
	}>();

	interface Tip {
		id: number;
		title: string;
		description: string;
		image?: string;
		icon: any;
	}

	const tips: Tip[] = [
		{
			id: 1,
			title: 'Welcome to Rugplay!',
			description:
				'Rugplay is a cryptocurrency trading simulator where you can practice trading without real financial risk. Start with virtual money, create coins, bet on prediction markets, and most importantly, rugpull!',
			icon: BookOpen,
			image: '/tips/cover.avif'
		},
		{
			id: 2,
			title: 'Creating Your First Coin',
			description:
				'Click "Create coin" in the sidebar to launch your own cryptocurrency. Choose a unique name, symbol, and upload an icon. Each coin starts at $0.000001',
			icon: Coins,
            image: '/tips/coin.avif'
		},
		{
			id: 3,
			title: 'Understanding Liquidity Pools',
			description:
				'Each coin has a "liquidity pool," with your coin and base currency ($). Prices are determined by the ratio between these amounts. When you buy, the price goes up; when you sell, it goes down.',
			icon: BarChart3,
			image: '/tips/liquidity-pools.avif'
		},
		{
			id: 4,
			title: 'AMM - Automated Market Maker',
			description:
				'Rugplay uses an AMM system where prices are calculated automatically based on supply and demand. The more you buy, the higher the price goes. The more you sell, the lower it drops. Large trades create "slippage" - the price change during your trade.',
			icon: BarChart3,
			image: '/tips/amm.avif'
		},
		{
			id: 5,
			title: 'Buying Coins',
			description:
				'Navigate to any coin page and click "Buy". Enter the amount you want to spend. The AMM (Automated Market Maker) will show you exactly how many coins you\'ll receive, including slippage.',
			icon: TrendingUp,
            image: '/tips/buying.avif'
		},
		{
			id: 6,
			title: 'Selling Coins',
			description:
				'On a coin page, click "Sell" and enter how many coins you want to sell. You can see your holdings in your Portfolio. Remember: selling large amounts can significantly impact the price!',
			icon: TrendingDown,
            image: '/tips/selling.avif'
		},
		{
			id: 7,
			title: 'What is a "Rug Pull"?',
			description:
				'A "rug pull" happens when large holders (including coin creators) sell their holdings all at once, crashing the price.',
			icon: Target,
            image: '/tips/rugpull.avif'
		},
		{
			id: 8,
			title: 'Portfolio Management',
			description:
				'Check your Portfolio page to see all your holdings, their current values, and recent transactions. Track your performance and see which investments are doing well.',
			icon: BarChart3,
            image: '/tips/portfolio.avif',
		},
		{
			id: 9,
			title: 'Market Overview',
			description:
				'The Market page shows all available coins sorted by market cap, volume, and price changes. Use this to discover trending coins and investment opportunities.',
			icon: Trophy,
            image: '/tips/market.avif'
		},
		{
			id: 10,
			title: 'Hopium - Prediction Markets',
			description:
				'Hopium lets you bet on yes/no questions about the future. AI automatically resolves questions based on real-world data. Test your prediction skills and earn from correct forecasts. Hold $100,000 in cash to create your own Hopium question :)',
			icon: Target,
            image: '/tips/hopium.avif'
		},
		{
			id: 11,
			title: 'Gambling Games',
			description:
				'Visit the Gambling section for high-risk, high-reward games. Remember: these are pure chance games. Only gamble what you can afford to lose, even in this simulation!',
			icon: Dice1,
            image: '/tips/gambling.avif'
		},
		{
			id: 12,
			title: 'Live Trades Feed',
			description:
				'Watch the Live Trades page to see real-time trading activity across all coins. This helps you spot trending coins and understand market sentiment. The sidebar shows $1,000+ trades, while the main feed displays every transaction.',
			icon: BarChart3,
            image: '/tips/live.avif'
		},
		{
			id: 13,
			title: 'Treemap Visualization',
			description:
				'The Treemap page shows a visual representation of the entire market. Larger squares represent higher market caps, and colors show price performance.',
			icon: BarChart3,
            image: '/tips/treemap.avif'
		},
		{
			id: 14,
			title: 'Leaderboards',
			description:
				'Compete with other users on the Leaderboard. Climb the ranks by making smart investment decisions!',
			icon: Trophy,
            image: '/tips/leaderboard.avif'
		},
		{
			id: 15,
			title: 'Daily Rewards',
			description:
				'Log in daily to claim free money! Your login streak increases your daily bonus. Consistent players get more virtual cash to invest.',
			icon: Coins,
            image: '/tips/daily.avif'
		},
		{
			id: 16,
			title: 'Concluding',
			description:
				"Start small, diversify your holdings, and don't invest everything in one coin. Watch for coins with diversified holders to avoid absolute rug pulls. People get smart!",
			icon: TrendingUp,
            image: '/tips/ender.avif'
		}
	];

	let currentPage = $state(0);
	let currentTip = $derived(tips[currentPage]);

	function nextTip() {
		if (currentPage < tips.length - 1) {
			currentPage++;
		}
	}

	function previousTip() {
		if (currentPage > 0) {
			currentPage--;
		}
	}

	function goToPage(page: number) {
		currentPage = page;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col sm:max-w-2xl">
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto">
			<!-- Main content -->
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<div class="bg-muted rounded-lg p-3">
						<currentTip.icon class="h-8 w-8" />
					</div>
					<h3 class="text-xl font-semibold">{currentTip.title}</h3>
				</div>

				<p class="text-muted-foreground leading-relaxed">
					{currentTip.description}
				</p>

				{#if currentTip.image}
					<div class="overflow-hidden rounded-lg border">
						<img src={currentTip.image} alt={currentTip.title} class="h-auto w-full" />
					</div>
				{/if}
			</div>

			<!-- Page dots -->
			<div class="flex items-center justify-center gap-2">
				{#each tips as tip, index}
					<button
						aria-label={`Go to page ${index + 1}`}
						onclick={() => goToPage(index)}
						class="h-2 w-2 rounded-full transition-colors {index === currentPage
							? 'bg-primary'
							: 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}"
						aria-current={index === currentPage ? 'page' : undefined}
					></button>
				{/each}
			</div>
		</div>

		<!-- Navigation -->
		<div class="flex items-center justify-between border-t pt-4">
			<Button
				variant="outline"
				onclick={previousTip}
				disabled={currentPage === 0}
				class="flex items-center gap-2"
			>
				<ChevronLeft class="h-4 w-4" />
				Previous
			</Button>

			<div class="flex items-center gap-2">
				<span class="text-muted-foreground text-sm">
					Tip {currentPage + 1} of {tips.length}
				</span>
			</div>

			<Button
				variant="outline"
				onclick={nextTip}
				disabled={currentPage === tips.length - 1}
				class="flex items-center gap-2"
			>
				Next
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
