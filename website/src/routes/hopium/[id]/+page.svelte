<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import {
		Loader2,
		Calculator,
		History,
		ChartColumn,
		MessageCircleQuestion,
		CheckIcon,
		XIcon
	} from 'lucide-svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { PORTFOLIO_DATA, fetchPortfolioData } from '$lib/stores/portfolio-data';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { formatDateWithYear, getPublicUrl, formatTimeUntil } from '$lib/utils';
	import { createChart, ColorType, type IChartApi, LineSeries } from 'lightweight-charts';
	import type { PredictionQuestion } from '$lib/types/prediction';
	import HopiumQuestionSkeleton from '$lib/components/self/skeletons/HopiumQuestionSkeleton.svelte';

	let question = $state<PredictionQuestion | null>(null);
	let loading = $state(true);
	let probabilityData = $state<any[]>([]);

	// Betting form
	let betSide = $state<boolean>(true);
	let placingBet = $state(false);
	let customBetAmount = $state('');

	let userBalance = $derived($PORTFOLIO_DATA ? $PORTFOLIO_DATA.baseCurrencyBalance : 0);
	let questionId = $derived(parseInt(page.params.id));

	// Chart related
	let chartContainer = $state<HTMLDivElement>();
	let chart: IChartApi | null = null;
	let lineSeries: any = null;

	onMount(() => {
		fetchQuestion();
		if ($USER_DATA) {
			fetchPortfolioData();
		}
	});

	async function fetchQuestion() {
		try {
			const response = await fetch(`/api/hopium/questions/${questionId}`);
			if (response.ok) {
				const result = await response.json();
				question = result.question || result;
				probabilityData = result.probabilityHistory || [];
			} else if (response.status === 404) {
				toast.error('Question not found');
				goto('/hopium');
			} else {
				toast.error('Failed to load question');
			}
		} catch (e) {
			console.error('Failed to fetch question:', e);
			toast.error('Failed to load question');
		} finally {
			loading = false;
		}
	}

	async function placeBet() {
		if (!question || !customBetAmount || Number(customBetAmount) <= 0) {
			toast.error('Please enter a valid bet amount');
			return;
		}

		placingBet = true;
		try {
			const response = await fetch(`/api/hopium/questions/${question.id}/bet`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					side: betSide,
					amount: Number(customBetAmount)
				})
			});

			const result = await response.json();
			if (response.ok) {
				toast.success(
					`Bet placed! Potential winnings: $${result.bet.potentialWinnings.toFixed(2)}`
				);
				customBetAmount = '';
				fetchQuestion();
				fetchPortfolioData();
			} else {
				toast.error(result.error || 'Failed to place bet');
			}
		} catch (e) {
			toast.error('Network error');
		} finally {
			placingBet = false;
		}
	}

	$effect(() => {
		if (chart && probabilityData.length > 0) {
			chart.remove();
			chart = null;
		}

		if (chartContainer && probabilityData.length > 0 && question) {
			chart = createChart(chartContainer, {
				layout: {
					textColor: '#666666',
					background: { type: ColorType.Solid, color: 'transparent' },
					attributionLogo: false
				},
				grid: {
					vertLines: { color: '#2B2B43' },
					horzLines: { color: '#2B2B43' }
				},
				rightPriceScale: {
					borderVisible: false,
					scaleMargins: { top: 0.1, bottom: 0.1 },
					alignLabels: true,
					entireTextOnly: false,
					visible: true
				},
				timeScale: {
					borderVisible: false,
					timeVisible: true,
					rightOffset: 5
				},
				crosshair: {
					mode: 1,
					vertLine: { color: '#758696', width: 1, style: 2, visible: true, labelVisible: true },
					horzLine: { color: '#758696', width: 1, style: 2, visible: true, labelVisible: true }
				}
			});

			lineSeries = chart.addSeries(LineSeries, {
				color: '#2962FF',
				lineWidth: 3,
				priceFormat: {
					type: 'custom',
					formatter: (price: number) => `${price.toFixed(1)}%`
				}
			});

			lineSeries.setData(probabilityData);
			chart.timeScale().fitContent();

			const handleResize = () => chart?.applyOptions({ width: chartContainer?.clientWidth });
			window.addEventListener('resize', handleResize);
			handleResize();

			return () => {
				window.removeEventListener('resize', handleResize);
				if (chart) {
					chart.remove();
					chart = null;
				}
			};
		}
	});

	let estimatedYesPayout = $derived(
		!question?.userBets?.yesAmount || question.userBets.yesAmount <= 0
			? 0
			: question.userBets.estimatedYesWinnings || 0
	);

	let estimatedNoPayout = $derived(
		!question?.userBets?.noAmount || question.userBets.noAmount <= 0
			? 0
			: question.userBets.estimatedNoWinnings || 0
	);

	let estimatedWin = $derived(
		(() => {
			const amount = Number(customBetAmount);
			if (!amount || amount <= 0 || !question) return 0;

			const totalPool = question.yesAmount + question.noAmount + amount;
			const relevantPool = betSide ? question.yesAmount + amount : question.noAmount + amount;

			return relevantPool > 0 ? (totalPool / relevantPool) * amount : 0;
		})()
	);
</script>

<SEO
	title={question
		? `${question.question} - Hopium - Rugplay`
		: 'Loading Question - Hopium - Rugplay'}
	description={question
		? `Bet on "${question.question}" in Rugplay's AI-powered prediction market. Current odds: ${question.yesPercentage.toFixed(1)}% YES, ${question.noPercentage.toFixed(1)}% NO. Total volume: $${question.totalAmount.toFixed(2)}.`
		: 'AI-powered prediction market question in the Rugplay simulation game.'}
	keywords="AI prediction market question, virtual betting, cryptocurrency prediction game, yes no betting, forecasting simulation"
/>

<div class="container mx-auto max-w-7xl p-6">
	{#if loading}
		<HopiumQuestionSkeleton />
	{:else if !question}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<h3 class="mb-2 text-xl font-semibold">Question not found</h3>
				<p class="text-muted-foreground mb-6">
					This question may have been removed or doesn't exist.
				</p>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-3">
			<div class="bg-muted rounded-lg p-4">
				<MessageCircleQuestion class="h-14 w-14" />
			</div>
			<div class="flex-1">
				<h1 class="text-2xl font-semibold">{question.question}</h1>
				{#if question.status === 'ACTIVE'}
					<p class="text-muted-foreground mt-1 text-sm">
						{formatTimeUntil(question.resolutionDate).startsWith('Ended') ? 'Resolving' : `Ends in ${formatTimeUntil(question.resolutionDate)}`}
					</p>
				{/if}

				{#if question.status === 'RESOLVED'}
					<Badge variant="destructive" class={question.aiResolution ? 'bg-success/80!' : ''}>
						{#if question.aiResolution}
							<CheckIcon class="h-4 w-4" />
							RESOLVED: YES
						{:else}
							<XIcon class="h-4 w-4" />
							RESOLVED: NO
						{/if}
					</Badge>
				{/if}
			</div>
		</div>

		<div class="text-muted-foreground mb-4 mt-3 flex flex-wrap items-center gap-1.5 text-xs">
			<span>Created by</span>

			<HoverCard.Root>
				<HoverCard.Trigger
					class="flex cursor-pointer items-center gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8"
					onclick={() => goto(`/user/${question?.creator.username}`)}
				>
					<Avatar.Root class="h-4 w-4">
						<Avatar.Image
							src={getPublicUrl(question.creator.image)}
							alt={question.creator.username}
						/>
						<Avatar.Fallback>{question.creator.username.charAt(0)}</Avatar.Fallback>
					</Avatar.Root>
					<span class="font-medium">{question.creator.name} (@{question.creator.username})</span>
				</HoverCard.Trigger>
				<HoverCard.Content class="w-80" side="bottom" sideOffset={3}>
					<UserProfilePreview userId={question.creator.id} />
				</HoverCard.Content>
			</HoverCard.Root>
		</div>

		<div class="grid gap-8">
			<!-- Main content grid with better spacing -->
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<!-- Left: Chart (2/3 width) -->
				<div class="lg:col-span-2">
					<Card.Root class="shadow-sm">
						<Card.Header>
							<div class="flex items-center justify-between">
								<Card.Title class="flex items-center gap-3 text-xl font-bold">
									<ChartColumn class="h-6 w-6" />
									Chart
								</Card.Title>

								<div class="text-right">
									<div class="text-success text-4xl font-bold">
										{question.yesPercentage.toFixed(1)}%
									</div>
									<div class="text-muted-foreground text-sm font-medium">YES chance</div>
								</div>
							</div>
						</Card.Header>
						<Card.Content>
							{#if probabilityData.length === 0}
								<div
									class="border-muted flex h-[400px] items-center justify-center rounded-lg border-2 border-dashed"
								>
									<div class="text-center">
										<ChartColumn class="text-muted-foreground mx-auto mb-3 h-12 w-12" />
										<p class="text-muted-foreground text-sm">Chart will appear after first bet</p>
									</div>
								</div>
							{:else}
								<div class="h-[400px] w-full rounded-lg border" bind:this={chartContainer}></div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Right: Trading Controls (1/3 width) -->
				<div class="space-y-6 lg:col-span-1">
					<!-- Trading Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Place Bet</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-6">
							<!-- YES/NO Buttons -->
							<div class="grid grid-cols-2 gap-4">
							<Button
								class={betSide
								? 'bg-success/80 hover:bg-success/90 w-full'
								: 'bg-muted hover:bg-muted/90 w-full'}
								size="lg"
								onclick={() => (betSide = true)}
								disabled={question.aiResolution !== null}
							>
								<div class="flex items-baseline gap-2 w-full min-w-0">
								<span class="text-xl font-bold truncate">YES</span>
								<span class="text-sm truncate">{question.yesPercentage.toFixed(1)}¢</span>
								</div>
							</Button>
							<Button
								class={!betSide
								? 'bg-destructive hover:bg-destructive/90 w-full'
								: 'bg-muted hover:bg-muted/90 w-full'}
								size="lg"
								onclick={() => (betSide = false)}
								disabled={question.aiResolution !== null}
							>
								<div class="flex items-baseline gap-2 w-full min-w-0">
								<span class="text-xl font-bold truncate">NO</span>
								<span class="text-sm truncate">{question.noPercentage.toFixed(1)}¢</span>
								</div>
							</Button>
							</div>

							<!-- Amount Input -->
							<div class="space-y-2">
								<Input
									type="number"
									step="0.01"
									min="0.01"
									placeholder="Enter amount..."
									bind:value={customBetAmount}
									disabled={question.aiResolution !== null}
								/>
							</div>

							<!-- Quick Amount Buttons -->
							<div class="flex flex-wrapper gap-2">
								<Button
									variant="outline"
									class="flex-1 truncate"
									onclick={() => (customBetAmount = '1')}
									disabled={question.aiResolution !== null}
								>
									$1
								</Button>
								<Button
									variant="outline"
									class="flex-1 truncate"
									onclick={() => (customBetAmount = '20')}
									disabled={question.aiResolution !== null}
								>
									$20
								</Button>
								<Button
									variant="outline"
									class="flex-1 truncate"
									onclick={() => (customBetAmount = '100')}
									disabled={question.aiResolution !== null}
								>
									$100
								</Button>
								<Button
									variant="outline"
									class="flex-1 truncate"
									onclick={() => (customBetAmount = userBalance.toString())}
									disabled={question.aiResolution !== null}
								>
									Max
								</Button>
							</div>

							<!-- Win Estimation -->
							<div class="space-y-2">
								<div class="flex justify-between text-sm">
									<span class="text-muted-foreground">To win:</span>
									<span class="font-mono">
										${estimatedWin.toFixed(2)}
									</span>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-muted-foreground">Balance:</span>
									<span class="font-mono">
										${userBalance.toFixed(2)}
									</span>
								</div>
							</div>

							<!-- Pay Button -->
							<Button
								class="w-full"
								size="lg"
								disabled={!customBetAmount ||
									Number(customBetAmount) <= 0 ||
									Number(customBetAmount) > userBalance ||
									placingBet ||
									question.aiResolution !== null}
								onclick={placeBet}
							>
								{#if placingBet}
									<Loader2 class="h-4 w-4 animate-spin" />
									Placing Bet...
								{:else}
									Pay ${Number(customBetAmount || 0).toFixed(2)}
								{/if}
							</Button>
						</Card.Content>
					</Card.Root>

					{#if !$USER_DATA}
						<Card.Root class="shadow-sm">
							<Card.Header>
								<Card.Title class="text-lg font-bold">Start Betting</Card.Title>
							</Card.Header>
							<Card.Content class="pb-6">
								<div class="py-6 text-center">
									<p class="text-muted-foreground mb-4 text-sm">Sign in to place bets</p>
									<Button size="lg" onclick={() => goto('/')}>Sign In</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				</div>
			</div>

			<!-- Position and Stats Cards below chart -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- User Position Card (if they have bets) -->
				{#if $USER_DATA && question.userBets && question.userBets.totalAmount && question.userBets.totalAmount > 0}
					<Card.Root class="gap-1">
						<Card.Header>
							<Card.Title class="flex items-center gap-3 text-lg font-bold">
								<div class="bg-muted rounded-full p-2">
									<Calculator class="h-5 w-5" />
								</div>
								Your Position
							</Card.Title>
						</Card.Header>
						<Card.Content class="pb-4">
							<div class="space-y-3">
								{#if question.userBets.yesAmount > 0}
									<div class="flex items-center justify-between">
										<div>
											<div class="text-sm font-medium text-green-600">YES Bet</div>
											<div class="text-muted-foreground text-xs">
												Payout: ${estimatedYesPayout.toFixed(2)}
											</div>
										</div>
										<div class="text-lg font-bold text-green-600">
											${question.userBets.yesAmount.toFixed(2)}
										</div>
									</div>
								{/if}
								{#if question.userBets.noAmount > 0}
									<div class="flex items-center justify-between">
										<div>
											<div class="text-sm font-medium text-red-600">NO Bet</div>
											<div class="text-muted-foreground text-xs">
												Payout: ${estimatedNoPayout.toFixed(2)}
											</div>
										</div>
										<div class="text-lg font-bold text-red-600">
											${question.userBets.noAmount.toFixed(2)}
										</div>
									</div>
								{/if}
								{#if question.userBets.yesAmount > 0 && question.userBets.noAmount > 0}
									<Separator />
								{/if}
								<div class="flex items-center justify-between">
									<span class="text-muted-foreground text-sm font-medium">Total Invested</span>
									<span class="text-lg font-bold">${question.userBets.totalAmount.toFixed(2)}</span>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{:else if $USER_DATA}
					<Card.Root class="gap-1">
						<Card.Header>
							<Card.Title>
								<div class="inline-flex items-center gap-2">
									<Calculator class="h-5 w-5" />
									Place Your Bet
								</div>
							</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if question.status === 'ACTIVE'}
								<p class="text-muted-foreground mb-6 text-sm">You haven't placed any bets yet</p>
							{:else}
								<div class="py-6 text-center">
									<p class="text-muted-foreground text-sm">This question has been resolved</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Market Stats Card -->
				<Card.Root class="gap-1">
					<Card.Header>
						<Card.Title class="flex items-center gap-3 text-lg font-bold">
							<div class="bg-muted rounded-full p-2">
								<ChartColumn class="h-5 w-5" />
							</div>
							Market Stats
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex justify-between">
							<span class="text-muted-foreground text-sm">Total Volume:</span>
							<span class="font-mono text-sm">
								${question.totalAmount.toFixed(2)}
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground text-sm">Total Bets:</span>
							<span class="font-mono text-sm">
								{question.recentBets?.length || 0}
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground text-sm">Created:</span>
							<span class="font-mono text-sm">
								{formatDateWithYear(question.createdAt)}
							</span>
						</div>
						{#if question.status === 'ACTIVE'}
							<div class="flex justify-between">
								<span class="text-muted-foreground text-sm">Resolves:</span>
								<span class="font-mono text-sm">
									{formatDateWithYear(question.resolutionDate)}
								</span>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Recent Activity Section -->
			{#if question.recentBets && question.recentBets.length > 0}
				<Card.Root class="shadow-sm">
					<Card.Header>
						<Card.Title class="flex items-center gap-3 text-xl font-bold">
							<div class="bg-muted rounded-full p-2">
								<History class="h-6 w-6" />
							</div>
							Recent Activity
						</Card.Title>
					</Card.Header>
					<Card.Content class="pb-6">
						<div class="space-y-4">
							{#each question.recentBets as bet}
								{#if bet.user}
									<div class="flex items-center justify-between rounded-xl border p-4">
										<div class="flex items-center gap-4">
											<HoverCard.Root>
												<HoverCard.Trigger>
													<button
														class="flex cursor-pointer items-center gap-3 text-left"
														onclick={() => goto(`/user/${bet.user?.username}`)}
													>
														<Avatar.Root class="h-10 w-10">
															<Avatar.Image
																src={getPublicUrl(bet.user?.image || null)}
																alt={bet.user?.name || bet.user?.username}
															/>
															<Avatar.Fallback class="text-sm"
																>{(bet.user?.name || bet.user?.username || 'U').charAt(
																	0
																)}</Avatar.Fallback
															>
														</Avatar.Root>
														<div>
															<div class="font-semibold hover:underline">
																{bet.user?.name || 'Deleted User'}
															</div>
															<div class="text-muted-foreground text-sm">
																@{bet.user?.username || 'deleted_user'}
															</div>
														</div>
													</button>
												</HoverCard.Trigger>
												<HoverCard.Content class="w-80">
													{#if bet.user?.id}
														<UserProfilePreview userId={bet.user?.id} />
													{/if}
												</HoverCard.Content>
											</HoverCard.Root>
											<Badge variant="destructive" class={bet.side ? 'bg-success/80!' : ''}>
												{bet.side ? 'YES' : 'NO'}
											</Badge>
										</div>
										<div class="text-right">
											<div class="text-lg font-bold">${bet.amount.toFixed(2)}</div>
											<div class="text-muted-foreground text-sm">
												{new Date(bet.createdAt).toLocaleDateString()}
											</div>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{/if}
</div>
