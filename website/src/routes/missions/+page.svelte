<script lang="ts">
	import { onMount } from 'svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Target01Icon,
		CheckmarkCircle01Icon,
		Clock01Icon,
		Activity01Icon,
		GameController01Icon,
		Calendar01Icon,
		GiftIcon,
		Timer01Icon
	} from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';
	import { formatValue } from '$lib/utils';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { fetchGemsBalance } from '$lib/stores/gems';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import SEO from '$lib/components/self/SEO.svelte';

	type MissionCategory = 'trading' | 'arcade' | 'daily';

	const CATEGORY_META: Record<MissionCategory, { label: string; icon: any; color: string; badgeClass: string }> = {
		trading: { label: 'Trading', icon: Activity01Icon, color: 'text-emerald-400', badgeClass: 'border-emerald-500/40 text-emerald-400' },
		arcade: { label: 'Arcade', icon: GameController01Icon, color: 'text-purple-400', badgeClass: 'border-purple-500/40 text-purple-400' },
		daily: { label: 'Daily', icon: Calendar01Icon, color: 'text-amber-400', badgeClass: 'border-amber-500/40 text-amber-400' }
	};

	const CATEGORIES: (MissionCategory | 'all')[] = ['all', 'trading', 'arcade', 'daily'];

	let missions = $state<any[]>([]);
	let loading = $state(true);
	let claiming = $state<string | null>(null);
	let claimingAll = $state(false);
	let selectedCategory = $state<MissionCategory | 'all'>('all');
	let shouldSignIn = $state(false);

	let totalCompleted = $derived(missions.filter((m) => m.completed).length);
	let totalMissions = $derived(missions.length);
	let unclaimedCount = $derived(missions.filter((m) => m.completed && !m.claimed).length);

	let filteredMissions = $derived(
		selectedCategory === 'all'
			? missions
			: missions.filter((m) => m.category === selectedCategory)
	);

	async function fetchMissions() {
		if (!$USER_DATA) {
			loading = false;
			return;
		}
		try {
			const res = await fetch('/api/missions');
			if (!res.ok) throw new Error('API error');
			const data = await res.json();
			missions = Array.isArray(data.missions) ? data.missions : [];
		} catch (err) {
			console.error(err);
			toast.error('Failed to load missions');
		} finally {
			loading = false;
		}
	}

	async function claimMission(missionId: string) {
		claiming = missionId;
		try {
			const res = await fetch('/api/missions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ missionId })
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? 'Failed to claim');
				return;
			}
			toast.success(`Reward claimed!`, {
				description: `+${formatValue(data.cashReward)}${data.gemReward > 0 ? ` +${data.gemReward} gems` : ''}`
			});
			missions = missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m));
			fetchPortfolioSummary();
			fetchGemsBalance();
		} catch {
			toast.error('Failed to claim reward');
		} finally {
			claiming = null;
		}
	}

	async function claimAll() {
		claimingAll = true;
		const pending = missions.filter((m) => m.completed && !m.claimed);
		let totalCash = 0;
		let totalGems = 0;
		let claimedCount = 0;

		for (const mission of pending) {
			try {
				const res = await fetch('/api/missions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ missionId: mission.id })
				});
				const data = await res.json();
				if (res.ok) {
					missions = missions.map((m) => (m.id === mission.id ? { ...m, claimed: true } : m));
					totalCash += data.cashReward ?? 0;
					totalGems += data.gemReward ?? 0;
					claimedCount++;
				}
			} catch {
				// continue
			}
		}

		if (claimedCount > 0) {
			toast.success(`Claimed ${claimedCount} mission${claimedCount > 1 ? 's' : ''}!`, {
				description: `+${formatValue(totalCash)}${totalGems > 0 ? ` +${totalGems} gems` : ''}`
			});
			fetchPortfolioSummary();
			fetchGemsBalance();
		}
		claimingAll = false;
	}

	function getTimeUntilReset(): string {
		const now = new Date();
		const midnight = new Date(now);
		midnight.setUTCHours(24, 0, 0, 0);
		const diff = midnight.getTime() - now.getTime();
		const h = Math.floor(diff / 3600000);
		const m = Math.floor((diff % 3600000) / 60000);
		return `${h}h ${m}m`;
	}

	let timeUntilReset = $state(getTimeUntilReset());

	onMount(() => {
		fetchMissions();
		const interval = setInterval(() => {
			timeUntilReset = getTimeUntilReset();
		}, 60000);
		return () => clearInterval(interval);
	});
</script>

<SEO
	title="Daily Missions - Rugplay"
	description="Complete daily missions to earn bonus cash and gem rewards in Rugplay."
	keywords="crypto game missions, daily challenges, trading simulator rewards"
/>

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="container mx-auto max-w-7xl p-4 md:p-6">
	<header class="mb-6 md:mb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold md:text-3xl">
					<HugeiconsIcon icon={Target01Icon} class="text-primary h-7 w-7" />
					Daily Missions
				</h1>
				<p class="text-muted-foreground flex items-center gap-1.5 text-sm md:text-base">
					{#if loading}
						Loading...
					{:else}
						{totalCompleted} / {totalMissions} completed
						<span class="text-muted-foreground/50">·</span>
						<HugeiconsIcon icon={Timer01Icon} class="h-3.5 w-3.5" />
						Resets in {timeUntilReset}
					{/if}
				</p>
			</div>
			{#if !loading && unclaimedCount > 0}
				<Button size="sm" onclick={claimAll} disabled={claimingAll}>
					{claimingAll ? 'Claiming...' : `Claim All (${unclaimedCount})`}
				</Button>
			{/if}
		</div>

		{#if !loading && $USER_DATA}
			<div class="bg-muted mt-4 h-3 w-full overflow-hidden rounded-full">
				<div
					class="bg-primary h-full rounded-full transition-all duration-500"
					style="width: {totalMissions > 0 ? (totalCompleted / totalMissions) * 100 : 0}%"
				></div>
			</div>
		{/if}
	</header>

	{#if !$USER_DATA}
		<div class="bg-card border-border flex flex-col items-center gap-4 rounded-2xl border p-16 text-center">
			<HugeiconsIcon icon={Target01Icon} class="text-muted-foreground h-12 w-12" />
			<div>
				<p class="font-semibold">Sign in to see your missions</p>
				<p class="text-muted-foreground mt-1 text-sm">Daily missions reset every day at midnight UTC</p>
			</div>
			<Button onclick={() => (shouldSignIn = true)}>Sign In</Button>
		</div>
	{:else}
		<!-- Category filter -->
		<div class="mb-6 flex flex-wrap gap-2">
			{#each CATEGORIES as cat}
				{@const isAll = cat === 'all'}
				<Button
					variant={selectedCategory === cat ? 'default' : 'outline'}
					size="sm"
					onclick={() => (selectedCategory = cat)}
				>
					{#if !isAll}
						<HugeiconsIcon icon={CATEGORY_META[cat as MissionCategory].icon} class="mr-1.5 h-3.5 w-3.5" />
					{/if}
					{isAll ? 'All' : CATEGORY_META[cat as MissionCategory].label}
				</Button>
			{/each}
		</div>

		{#if loading}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each Array(8) as _}
					<div class="bg-muted h-36 animate-pulse rounded-xl"></div>
				{/each}
			</div>
		{:else if filteredMissions.length === 0}
			<div class="flex h-60 flex-col items-center justify-center">
				<p class="text-muted-foreground text-lg">No missions in this category today</p>
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each filteredMissions as mission (mission.id)}
					{@const meta = CATEGORY_META[mission.category as MissionCategory] ?? CATEGORY_META.daily}
					{@const progressPct = Math.min((mission.progress / mission.target) * 100, 100)}
					{@const isComplete = mission.completed}
					{@const isClaimed = mission.claimed}

					<Card.Root
						class="relative h-full overflow-hidden transition-all duration-200 {isComplete && !isClaimed
							? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
							: isClaimed
								? 'border-primary/20 bg-primary/[0.03]'
								: 'opacity-70'}"
					>
						<Card.Content class="flex h-full flex-col px-4 py-3">
							<!-- Top row: icon + title -->
							<div class="flex items-start gap-3">
								<div
									class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
								>
									<HugeiconsIcon
										icon={meta.icon}
										class="h-5 w-5 {isClaimed ? 'text-muted-foreground' : meta.color}"
									/>
								</div>
								<div class="min-w-0 flex-1">
									<h3 class="truncate text-sm font-semibold">{mission.title}</h3>
									<p class="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{mission.description}</p>
								</div>
								{#if isClaimed}
									<div class="text-muted-foreground absolute right-2 top-2 text-base">✓</div>
								{/if}
							</div>

							<!-- Bottom: badge + rewards + action -->
							<div class="mt-auto flex flex-col gap-1.5 pt-3">
								<div class="flex items-center gap-2">
									<Badge variant="outline" class="text-[10px] {meta.badgeClass}">
										{meta.label}
									</Badge>
									<span class="text-muted-foreground text-[10px]">
										{#if mission.cashReward > 0}{formatValue(mission.cashReward)}{/if}
										{#if mission.gemReward > 0}
											{#if mission.cashReward > 0} · {/if}
											{mission.gemReward} 💎
										{/if}
									</span>
								</div>

								{#if isComplete && !isClaimed}
									<Button
										size="sm"
										class="h-7 w-full text-xs"
										onclick={() => claimMission(mission.id)}
										disabled={claiming === mission.id}
									>
										<HugeiconsIcon icon={GiftIcon} class="mr-1 h-3.5 w-3.5" />
										{claiming === mission.id ? 'Claiming...' : 'Claim Reward'}
									</Button>
								{:else if !isClaimed}
									<div>
										<div class="text-muted-foreground mb-1 flex items-center justify-between text-[10px]">
											<span>
												{#if mission.target >= 1000}
													{formatValue(mission.progress)} / {formatValue(mission.target)}
												{:else}
													{mission.progress} / {mission.target}
												{/if}
											</span>
											<span>{Math.round(progressPct)}%</span>
										</div>
										<div class="bg-muted h-1.5 w-full overflow-hidden rounded-full">
											<div
												class="bg-primary/60 h-full rounded-full transition-all duration-500"
												style="width: {progressPct}%"
											></div>
										</div>
									</div>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}

		<p class="text-muted-foreground mt-6 text-center text-xs">
			8 missions selected daily · Progress resets at midnight UTC.
		</p>
	{/if}
</div>