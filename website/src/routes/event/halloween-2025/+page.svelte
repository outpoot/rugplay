<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Trophy, PiggyBank, TrendingDown, Calendar, Gift, ExternalLink } from 'lucide-svelte';
	import { GAMBLING_STATS, fetchGamblingStats } from '$lib/stores/gambling-stats';
	import { USER_DATA } from '$lib/stores/user-data';
	import { formatValue, formatRelativeTime, getPublicUrl } from '$lib/utils';
	import { halloweenEventStore, gamblingActivityStore } from '$lib/stores/websocket';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import { Clock, PiggyBankIcon } from 'lucide-svelte';
	import { Label } from '$lib/components/ui/label';
	import ProfileBadges from '$lib/components/self/ProfileBadges.svelte';

	let mounted = $state(false);
	let eventData = $state<any>(null);

	const userData = $derived($USER_DATA);

	// Filter activities to only show bets >= $1000
	const filteredActivities = $derived(
		$gamblingActivityStore.filter((activity) => activity.amount >= 1000).slice(0, 10)
	);

	onMount(() => {
		// Always fetch event data (available to all users)
		fetchEventData();

		// Fetch user-specific stats only if logged in
		if ($USER_DATA) {
			fetchGamblingStats();
		}

		mounted = true;
	});

	async function fetchEventData() {
		try {
			const response = await fetch('/api/event/halloween-badge');
			if (response.ok) {
				eventData = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch event data:', error);
		}
	}

	const eventGoal = 200000000; // $200M
	const currentProgress = $derived(
		$halloweenEventStore?.totalCommunityLosses || eventData?.totalCommunityLosses || 0
	);
	const progressPercentage = $derived(Math.min((currentProgress / eventGoal) * 100, 100));
	const isCompleted = $derived(
		$halloweenEventStore?.goalReached || eventData?.goalReached || false
	);

	function handleGamblingClick() {
		goto('/gambling');
	}
</script>

<svelte:head>
	<title>Halloween 2025 - Rugplay</title>
	<meta
		name="description"
		content="Join the Halloween 2025 gambling event! Lose $200M collectively to earn the exclusive Halloween 2025 pumpkin badge."
	/>
</svelte:head>

<div class="container mx-auto space-y-8 px-4 py-8">
	<div class="space-y-4 text-center">
		<div class="mb-4 flex items-center justify-center gap-3">
			<img src="/pumpkin.png" alt="Halloween 2025" class="h-10 w-10" />

			<h1
				class="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-4xl font-bold text-transparent"
			>
				Halloween 2025
			</h1>
		</div>
		<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
			A spooky event where the community works together to... lose money!
			<br />
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Trophy class="h-5 w-5 text-orange-500" />
					Progress
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-6">
				{#if mounted && (eventData || $halloweenEventStore)}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">Community Goal</span>
							<span class="font-mono text-sm">
								{formatValue(currentProgress)} / {formatValue(eventGoal)}
							</span>
						</div>

						<div class="relative">
							<Progress value={progressPercentage} class="h-4" />
							<div
								class="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/20 to-orange-600/20"
							></div>
						</div>

						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">
								{progressPercentage.toFixed(1)}% Complete
							</span>
							{#if isCompleted}
								<Badge variant="default" class="bg-orange-500 hover:bg-orange-600">
									<Trophy class="mr-1 h-3 w-3" />
									Completed!
								</Badge>
							{:else}
								<span class="text-muted-foreground">
									{formatValue(eventGoal - currentProgress)} remaining
								</span>
							{/if}
						</div>

						{#if isCompleted}
							<div
								class="flex items-center gap-3 rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20"
							>
								<div class="flex h-8 w-8 items-center justify-center">
									<img src="/pumpkin.png" alt="Halloween 2025" class="h-6 w-6" />
								</div>
								<div class="flex-1">
									<p class="font-medium text-orange-600 dark:text-orange-400">Goal reached!</p>
									<p class="text-muted-foreground text-sm">
										Badges will be sent out shortly, thanks for participating!
									</p>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<Skeleton class="h-4 w-32" />
							<Skeleton class="h-4 w-48" />
						</div>
						<Skeleton class="h-4 w-full" />
						<div class="flex items-center justify-between">
							<Skeleton class="h-4 w-24" />
							<Skeleton class="h-4 w-36" />
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Contribution -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<PiggyBank class="h-5 w-5 text-orange-500" />
					Contribution
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if userData && mounted && $GAMBLING_STATS}
					<div class="space-y-4">
						<div class="flex items-center justify-center gap-2">
							<span class="text-2xl font-bold"
								>You lost <span class="text-orange-500">
									{formatValue($GAMBLING_STATS.losses)}
								</span></span
							>
						</div>

						<div class="space-y-2">
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Your Progress:</span>
								<span class="font-mono">
									{(($GAMBLING_STATS.losses / eventGoal) * 100).toFixed(2)}%
								</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Wins:</span>
								<span class="font-mono text-green-500">
									{formatValue($GAMBLING_STATS.wins)}
								</span>
							</div>
						</div>
					</div>
				{:else if !userData}
					<div class="space-y-4 text-center">
						<p class="text-muted-foreground text-sm">
							Sign in to track your progress and participate in the event
						</p>
						<Button variant="outline" href="/">Sign In</Button>
					</div>
				{:else}
					<div class="space-y-4">
						<Skeleton class="mx-auto h-8 w-20" />
						<Skeleton class="mx-auto h-4 w-24" />
						<div class="space-y-2">
							<Skeleton class="h-4 w-full" />
							<Skeleton class="h-4 w-full" />
						</div>
						<Skeleton class="h-10 w-full" />
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card class="flex-1 gap-1">
			<CardHeader class="pb-2">
				<CardTitle class="flex items-center gap-2">
					<Gift class="h-5 w-5 text-orange-500" />
					Rewards
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if userData}
					<!-- Preview with Badge -->
					<div class="space-y-2">
						<Label class="text-muted-foreground text-xs">Preview</Label>
						<div
							class="flex items-center gap-3 rounded-lg border-2 border-orange-500/30 bg-orange-50/50 p-3 dark:bg-orange-950/20"
						>
							<Avatar.Root class="h-10 w-10 shrink-0">
								<Avatar.Image src={getPublicUrl(userData.image)} alt={userData.name} />
								<Avatar.Fallback class="text-sm">{userData.name?.charAt(0) || '?'}</Avatar.Fallback>
							</Avatar.Root>
							<div class="min-w-0 flex-1">
								<div class="flex min-w-0 items-center gap-2">
									<h4 class="truncate text-sm font-medium">{userData.name}</h4>
									<ProfileBadges
										user={{
											id: parseInt(userData.id),
											name: userData.name,
											username: userData.username,
											image: userData.image,
											prestigeLevel: userData.prestigeLevel || 0,
											createdAt: new Date(),
											totalPortfolioValue: 0,
											loginStreak: userData.loginStreak || 0,
											halloweenBadge2025: true,
											isAdmin: userData.isAdmin || false
										}}
										showId={false}
										size="sm"
									/>
								</div>
								<p class="text-muted-foreground truncate text-xs">@{userData.username}</p>
							</div>
						</div>
					</div>
					<p class="text-xs">Earn this exclusive badge by participating in the event!</p>
				{:else}
					<!-- Example profile for non-logged-in users -->
					<div class="space-y-2">
						<Label class="text-muted-foreground text-xs">Preview</Label>
						<div class="flex items-center gap-3 rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
							<Avatar.Root class="h-8 w-8 shrink-0">
								<Avatar.Fallback class="text-xs">U</Avatar.Fallback>
							</Avatar.Root>
							<div class="min-w-0 flex-1">
								<div class="flex min-w-0 items-center gap-2">
									<h4 class="truncate text-sm font-medium">User</h4>
									<ProfileBadges
										user={{
											id: 1,
											name: 'User',
											username: 'user1',
											image: null,
											prestigeLevel: 0,
											createdAt: new Date(),
											totalPortfolioValue: 0,
											loginStreak: 0,
											halloweenBadge2025: true,
											isAdmin: false
										}}
										showId={false}
										size="sm"
									/>
								</div>
								<p class="text-muted-foreground truncate text-xs">@user1</p>
							</div>
						</div>
					</div>
					<p class="text-xs">Sign in to earn this exclusive badge by participating in the event!</p>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Live Gambling Activity Feed -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<PiggyBankIcon class="h-5 w-5 text-orange-500" />
				Live
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-3">
				{#if filteredActivities.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-center">
						<PiggyBankIcon class="text-muted-foreground/50 mb-4 h-12 w-12" />
						<h3 class="mb-2 text-base font-semibold">Waiting for activity...</h3>
						<p class="text-muted-foreground text-sm">
							High stakes gambling activity will appear here in real-time.
						</p>
					</div>
				{:else}
					{#each filteredActivities as activity, index (`${activity.userId}-${activity.timestamp}-${index}`)}
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

								<span class="text-muted-foreground text-sm">{activity.won ? 'won' : 'lost'}</span>
								<span
									class="font-mono text-sm font-medium {activity.won
										? 'text-green-500'
										: 'text-red-500'}"
								>
									{formatValue(activity.amount)}
								</span>
								<span class="text-muted-foreground text-sm">on {activity.game}</span>
							</div>

							<div class="text-muted-foreground flex items-center gap-1 text-xs">
								<Clock class="h-3 w-3" />
								<span class="font-mono">{formatRelativeTime(new Date(activity.timestamp))}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</CardContent>
		<CardFooter>
			<p class="text-muted-foreground text-xs">Showing bets of $1,000 or more only</p>
		</CardFooter>
	</Card>

	<a href="https://www.flaticon.com/free-icons/pumpkin" title="pumpkin icons" class="text-xs"
		>Pumpkin icons created by smalllikeart - Flaticon</a
	>
</div>
