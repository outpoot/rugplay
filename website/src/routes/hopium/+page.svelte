<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import HopiumSkeleton from '$lib/components/self/skeletons/HopiumSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import {
		TrendingUp,
		TrendingDown,
		Plus,
		Clock,
		Sparkles,
		Globe,
		Loader2,
		CheckIcon,
		XIcon
	} from 'lucide-svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { PORTFOLIO_DATA, fetchPortfolioData } from '$lib/stores/portfolio-data';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { formatDateWithYear, formatTimeUntil, formatValue, getPublicUrl } from '$lib/utils';
	import { goto } from '$app/navigation';
	import type { PredictionQuestion } from '$lib/types/prediction';

	let questions = $state<PredictionQuestion[]>([]);
	let loading = $state(true);
	let activeTab = $state('active');
	let showCreateDialog = $state(false);

	// Create question form
	let newQuestion = $state('');
	let creatingQuestion = $state(false);

	let userBalance = $derived($PORTFOLIO_DATA ? $PORTFOLIO_DATA.baseCurrencyBalance : 0);

	onMount(() => {
		fetchQuestions();
		if ($USER_DATA) {
			fetchPortfolioData();
		}
	});

	async function fetchQuestions() {
		try {
			const status =
				activeTab === 'active' ? 'ACTIVE' : activeTab === 'resolved' ? 'RESOLVED' : 'ALL';

			// TODO: PAGINATION
			const response = await fetch(`/api/hopium/questions?status=${status}&limit=50`);
			if (response.ok) {
				const data = await response.json();
				questions = data.questions;
			} else {
				toast.error('Failed to load questions');
			}
		} catch (e) {
			console.error('Failed to fetch questions:', e);
			toast.error('Failed to load questions');
		} finally {
			loading = false;
		}
	}

	async function createQuestion() {
		if (!newQuestion.trim()) {
			toast.error('Please enter a question');
			return;
		}

		creatingQuestion = true;
		try {
			const response = await fetch('/api/hopium/questions/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question: newQuestion
				})
			});

			const result = await response.json();
			if (response.ok) {
				toast.success('Question created successfully!');
				showCreateDialog = false;
				newQuestion = '';
				fetchQuestions();
				fetchPortfolioData();
			} else {
				toast.error(result.error || 'Failed to create question', { duration: 20000 });
			}
		} catch (e) {
			toast.error('Network error');
		} finally {
			creatingQuestion = false;
		}
	}

	function handleCreateQuestion() {
		if (!$USER_DATA) {
			toast.error('You must be logged in to create a question');
			return;
		}
		if (userBalance <= 100_000) {
			toast.error('You need at least $100,000 in your portfolio (cash) to create a question.');
			return;
		}
		showCreateDialog = true;
	}

	$effect(() => {
		if (activeTab) {
			loading = true;
			fetchQuestions();
		}
	});
</script>

<SEO
	title="Hopium - Rugplay"
	description="AI-powered prediction markets in the Rugplay simulation game. Create yes/no questions, bet on outcomes with virtual currency, and test your forecasting skills."
	keywords="AI prediction markets game, virtual betting simulation, cryptocurrency prediction game, forecasting game, virtual currency betting"
/>

<!-- Create Question Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Sparkles class="h-5 w-5" />
				Create
			</Dialog.Title>
			<Dialog.Description>Create a yes/no question that will be resolved by AI.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="question">Question *</Label>
				<Input
					id="question"
					bind:value={newQuestion}
					placeholder="Will *SKIBIDI reach $100 price today?"
					maxlength={200}
				/>
				<p class="text-muted-foreground text-xs">{newQuestion.length}/200 characters</p>
				<p class="text-muted-foreground text-xs">
					The AI will automatically determine the appropriate resolution date and criteria.
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCreateDialog = false)}>Cancel</Button>
			<Button onclick={createQuestion} disabled={creatingQuestion || !newQuestion.trim()}>
				{#if creatingQuestion}
					<Loader2 class="h-4 w-4 animate-spin" />
					Processing...
				{:else}
					Publish
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="container mx-auto max-w-7xl p-6">
	<header class="mb-8">
		<div class="text-center">
			<h1 class="mb-2 flex items-center justify-center gap-2 text-3xl font-bold">
				<Sparkles class="h-8 w-8 text-purple-500" />
				Hopium<span class="text-xs">[BETA]</span>
			</h1>
			<p class="text-muted-foreground mb-6">
				AI-powered prediction markets. Create questions and bet on outcomes.
			</p>
		</div>
	</header>

	<Tabs.Root bind:value={activeTab} class="w-full">
		<div class="mb-6 flex items-center justify-center gap-2">
			<Tabs.List class="grid w-full max-w-md grid-cols-3">
				<Tabs.Trigger value="active">Active</Tabs.Trigger>
				<Tabs.Trigger value="resolved">Resolved</Tabs.Trigger>
				<Tabs.Trigger value="all">All</Tabs.Trigger>
			</Tabs.List>
			{#if $USER_DATA}
				<Button onclick={handleCreateQuestion}>
					<Plus class="h-4 w-4" />
					Ask
				</Button>
			{/if}
		</div>

		<Tabs.Content value={activeTab}>
			{#if loading}
				<HopiumSkeleton />
			{:else if questions.length === 0}
				<div class="py-16 text-center">
					<h3 class="mb-2 text-lg font-semibold">No questions yet</h3>
					<p class="text-muted-foreground mb-6">Be the first to create a prediction question!</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each questions as question}
						<Card.Root
							class="bg-card hover:bg-card/90 flex cursor-pointer flex-col transition-colors"
							onclick={() => goto(`/hopium/${question.id}`)}
						>
							<Card.Header class="pb-4">
								<div class="flex items-start justify-between gap-3">
									<div class="flex-1">
										<h3 class="break-words text-lg font-medium">
											{question.question}
										</h3>
									</div>

									<div class="flex flex-col items-end gap-2">
										{#if question.status === 'RESOLVED'}
											<Badge
												variant="destructive"
												class="flex flex-shrink-0 items-center gap-1 {question.aiResolution
													? 'bg-success/80!'
													: ''}"
											>
												{#if question.aiResolution}
													<CheckIcon class="h-3 w-3" />
													YES
												{:else}
													<XIcon class="h-3 w-3" />
													NO
												{/if}
											</Badge>
										{/if}

										<!-- Probability Meter -->
										<div class="relative flex h-12 w-16 items-end justify-center">
											<svg class="h-10 w-16" viewBox="0 0 64 32">
												<!-- Background arc -->
												<path
													d="M 8 28 A 24 24 0 0 1 56 28"
													fill="none"
													stroke="var(--muted-foreground)"
													stroke-width="3"
													stroke-linecap="round"
													opacity="0.3"
												/>
												<!-- Progress arc -->
												<path
													d="M 8 28 A 24 24 0 0 1 56 28"
													fill="none"
													stroke="var(--primary)"
													stroke-width="3"
													stroke-linecap="round"
													stroke-dasharray={Math.PI * 24}
													stroke-dashoffset={Math.PI * 24 -
														(question.yesPercentage / 100) * Math.PI * 24}
													class="transition-all duration-300 ease-in-out"
												/>
											</svg>
											<div class="absolute bottom-0 text-sm font-medium">
												{question.yesPercentage.toFixed(0)}%
											</div>
										</div>
									</div>
								</div>

								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<div class="flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{#if question.status === 'ACTIVE'}
											{formatTimeUntil(question.resolutionDate).startsWith('Ended') ? 'Resolving' : `${formatTimeUntil(question.resolutionDate)} remaining`}
										{:else}
											Resolved {formatDateWithYear(question.resolvedAt || '')}
										{/if}
									</div>
									<span>•</span>
									<div class="flex items-center gap-1">
										{formatValue(question.totalAmount)}
									</div>
									{#if question.requiresWebSearch}
										<span>•</span>
										<Globe class="h-3 w-3 text-blue-500" />
									{/if}
								</div>

								<div class="mb-2 mt-2 flex items-center gap-2 text-sm">
									<HoverCard.Root>
										<HoverCard.Trigger>
											<button
												class="flex cursor-pointer items-center gap-2 text-left hover:underline"
											>
												<Avatar.Root class="h-5 w-5">
													<Avatar.Image
														src={getPublicUrl(question.creator.image)}
														alt={question.creator.name}
													/>
													<Avatar.Fallback class="text-xs"
														>{question.creator.name.charAt(0)}</Avatar.Fallback
													>
												</Avatar.Root>
												<span class="text-muted-foreground">@{question.creator.username}</span>
											</button>
										</HoverCard.Trigger>
										<HoverCard.Content class="w-80">
											<UserProfilePreview userId={question.creator.id} />
										</HoverCard.Content>
									</HoverCard.Root>
								</div>

								<!-- User's bet amounts if they have any -->
								{#if question.userBets && (question.userBets.yesAmount > 0 || question.userBets.noAmount > 0)}
									<div class="text-muted-foreground flex items-center gap-4 text-sm">
										<span>Your bets:</span>
										{#if question.userBets.yesAmount > 0}
											<div class="flex items-center gap-1">
												<TrendingUp class="h-3 w-3 text-green-600" />
												<span class="text-green-600"
													>YES: ${question.userBets.yesAmount.toFixed(2)}</span
												>
											</div>
										{/if}
										{#if question.userBets.noAmount > 0}
											<div class="flex items-center gap-1">
												<TrendingDown class="h-3 w-3 text-red-600" />
												<span class="text-red-600"
													>NO: ${question.userBets.noAmount.toFixed(2)}</span
												>
											</div>
										{/if}
									</div>
								{/if}
							</Card.Header>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
