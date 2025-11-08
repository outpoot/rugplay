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
	import { _ } from 'svelte-i18n';

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
			title: $_('home.welcome'),
			description: $_('about.usermanual.tips.1.desc'),
			icon: BookOpen,
			image: '/tips/cover.avif'
		},
		{
			id: 2,
			title: $_('about.usermanual.tips.2.title'),
			description: $_('about.usermanual.tips.2.desc'),
			icon: Coins,
			image: '/tips/coin.avif'
		},
		{
			id: 3,
			title: $_('about.usermanual.tips.3.title'),
			description: $_('about.usermanual.tips.3.desc'),
			icon: BarChart3,
			image: '/tips/liquidity-pools.avif'
		},
		{
			id: 4,
			title: $_('about.usermanual.tips.4.title'),
			description: $_('about.usermanual.tips.4.desc'),
			icon: BarChart3,
			image: '/tips/amm.avif'
		},
		{
			id: 5,
			title: $_('about.usermanual.tips.5.title'),
			description: $_('about.usermanual.tips.5.desc'),
			icon: TrendingUp,
			image: '/tips/buying.avif'
		},
		{
			id: 6,
			title: $_('about.usermanual.tips.6.title'),
			description: $_('about.usermanual.tips.6.desc'),
			icon: TrendingDown,
			image: '/tips/selling.avif'
		},
		{
			id: 7,
			title: $_('about.usermanual.tips.7.title'),
			description: $_('about.usermanual.tips.7.desc'),
			icon: Target,
			image: '/tips/rugpull.avif'
		},
		{
			id: 8,
			title: $_('about.usermanual.tips.8.title'),
			description: $_('about.usermanual.tips.8.desc'),
			icon: BarChart3,
			image: '/tips/portfolio.avif'
		},
		{
			id: 9,
			title: $_('about.usermanual.tips.9.title'),
			description: $_('about.usermanual.tips.9.desc'),
			icon: Trophy,
			image: '/tips/market.avif'
		},
		{
			id: 10,
			title: $_('about.usermanual.tips.10.title'),
			description: $_('about.usermanual.tips.10.desc'),
			icon: Target,
			image: '/tips/hopium.avif'
		},
		{
			id: 11,
			title: $_('about.usermanual.tips.11.title'),
			description: $_('about.usermanual.tips.11.desc'),
			icon: Dice1,
			image: '/tips/gambling.avif'
		},
		{
			id: 12,
			title: $_('about.usermanual.tips.12.title'),
			description: $_('about.usermanual.tips.12.desc'),
			icon: BarChart3,
			image: '/tips/live.avif'
		},
		{
			id: 13,
			title: $_('about.usermanual.tips.13.title'),
			description: $_('about.usermanual.tips.13.desc'),
			icon: BarChart3,
			image: '/tips/treemap.avif'
		},
		{
			id: 14,
			title: $_('about.usermanual.tips.14.title'),
			description: $_('about.usermanual.tips.14.desc'),
			icon: Trophy,
			image: '/tips/leaderboard.avif'
		},
		{
			id: 15,
			title: $_('about.usermanual.tips.15.title'),
			description: '',
			icon: Coins,
			image: '/tips/daily.avif'
		},
		{
			id: 16,
			title: $_('about.usermanual.tips.16.title'),
			description: $_('about.usermanual.tips.16.desc'),
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
				{$_('pagination.previous.title')}
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
				{$_('pagination.next.title')}
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
