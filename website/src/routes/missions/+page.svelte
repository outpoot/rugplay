<script lang="ts">
	import { onMount } from 'svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Target01Icon,
		CheckmarkCircle01Icon,
		Clock01Icon,
        ChartUpIcon,
		StarIcon,
        Activity01Icon,
		GameController01Icon,
		Message01Icon,
		Calendar01Icon,
		GiftIcon
	} from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';
	import { formatValue } from '$lib/utils';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';

	let missions = $state<any[]>([]);
	let loading = $state(true);
	let claiming = $state<string | null>(null);
	let shouldSignIn = $state(false);

	const categoryMeta: Record<string, { label: string; icon: any; color: string }> = {
		trading: { label: 'Trading', icon: Activity01Icon, color: 'text-emerald-400' },
		arcade: { label: 'Arcade', icon: GameController01Icon, color: 'text-purple-400' },
		social: { label: 'Social', icon: Message01Icon, color: 'text-blue-400' },
		daily: { label: 'Daily', icon: Calendar01Icon, color: 'text-amber-400' }
	};

	async function fetchMissions() {
	if (!$USER_DATA) {
		loading = false;
		return;
	}

	try {
		const res = await fetch('/api/missions');

		if (!res.ok) {
			throw new Error('API error');
		}

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
			toast.success(
				`Claimed! +${formatValue(data.cashReward)}${data.gemReward > 0 ? ` +${data.gemReward} Gems` : ''}`
			);
			missions = missions.map((m) =>
				m.id === missionId ? { ...m, claimed: true } : m
			);
		} catch {
			toast.error('Failed to claim reward');
		} finally {
			claiming = null;
		}
	}

	// Reset time until midnight
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

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="container mx-auto max-w-2xl space-y-6 p-4 md:p-8">
	<!-- Header -->
	<div class="flex flex-col items-center gap-2 text-center">
		<div class="bg-primary/10 mb-1 flex h-14 w-14 items-center justify-center rounded-2xl">
			<HugeiconsIcon icon={Target01Icon} class="text-primary h-7 w-7" />
		</div>
		<h1 class="text-3xl font-bold">Daily Missions</h1>
		<p class="text-muted-foreground text-sm">
			Complete missions to earn bonus rewards. Resets in
			<span class="text-foreground font-medium">{timeUntilReset}</span>
		</p>
	</div>

	{#if !$USER_DATA}
		<!-- Not signed in -->
		<div
			class="bg-card border-border flex flex-col items-center gap-4 rounded-2xl border p-12 text-center"
		>
			<HugeiconsIcon icon={Target01Icon} class="text-muted-foreground h-12 w-12" />
			<div>
				<p class="font-semibold">Sign in to see your missions</p>
				<p class="text-muted-foreground mt-1 text-sm">
					Daily missions reset every day at midnight UTC
				</p>
			</div>
			<button
				onclick={() => (shouldSignIn = true)}
				class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 py-2 text-sm font-medium transition-colors"
			>
				Sign In
			</button>
		</div>
	{:else if loading}
		<!-- Skeleton -->
		<div class="space-y-3">
			{#each [1, 2, 3, 4] as _}
				<div class="bg-card border-border animate-pulse rounded-2xl border p-5">
					<div class="bg-muted mb-3 h-5 w-1/3 rounded" />
					<div class="bg-muted mb-2 h-4 w-2/3 rounded" />
					<div class="bg-muted h-2 w-full rounded" />
				</div>
			{/each}
		</div>
	{:else}
		<!-- Mission cards -->
		<div class="space-y-3">
			{#each missions as mission (mission.id)}
				{@const meta = categoryMeta[mission.category] ?? categoryMeta.daily}
				{@const progressPct = Math.min((mission.progress / mission.target) * 100, 100)}
				{@const isComplete = mission.completed}
				{@const isClaimed = mission.claimed}

				<div
					class="bg-card border-border relative overflow-hidden rounded-2xl border p-5 transition-all {isComplete && !isClaimed ? 'ring-primary ring-2' : ''} {isClaimed ? 'opacity-60' : ''}"
				>
					<!-- Glow for complete unclaimed -->
					{#if isComplete && !isClaimed}
						<div
							class="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent"
						/>
					{/if}

					<div class="relative flex items-start gap-4">
						<!-- Category icon -->
						<div
							class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
						>
							<HugeiconsIcon icon={meta.icon} class="h-5 w-5 {meta.color}" />
						</div>

						<div class="min-w-0 flex-1">
							<!-- Title row -->
							<div class="flex items-center gap-2">
								<p class="font-semibold">{mission.title}</p>
								<span
									class="text-muted-foreground rounded-full border px-2 py-0.5 text-xs {meta.color}"
								>
									{meta.label}
								</span>
							</div>

							<p class="text-muted-foreground mt-0.5 text-sm">{mission.description}</p>

							<!-- Progress bar -->
							{#if !isClaimed}
								<div class="mt-3">
									<div class="bg-muted relative h-2 w-full overflow-hidden rounded-full">
										<div
											class="h-full rounded-full transition-all duration-500 {isComplete ? 'bg-primary' : 'bg-primary/60'}"
											style="width: {progressPct}%"
										/>
									</div>
									<div class="text-muted-foreground mt-1 flex justify-between text-xs">
										<span>
											{#if mission.target >= 1000}
												{formatValue(mission.progress)} / {formatValue(mission.target)}
											{:else}
												{mission.progress} / {mission.target}
											{/if}
										</span>
										<span class="flex items-center gap-1">
											{#if mission.cashReward > 0}
												+{formatValue(mission.cashReward)}
											{/if}
											{#if mission.gemReward > 0}
												<span class="text-amber-400">+{mission.gemReward} 💎</span>
											{/if}
										</span>
									</div>
								</div>
							{/if}
						</div>

						<!-- Status / Claim button -->
						<div class="shrink-0">
							{#if isClaimed}
								<div class="flex items-center gap-1 text-sm font-medium text-green-500">
									<HugeiconsIcon icon={CheckmarkCircle01Icon} class="h-5 w-5" />
									Done
								</div>
							{:else if isComplete}
								<button
									onclick={() => claimMission(mission.id)}
									disabled={claiming === mission.id}
									class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
								>
									<HugeiconsIcon icon={GiftIcon} class="h-4 w-4" />
									{claiming === mission.id ? 'Claiming...' : 'Claim'}
								</button>
							{:else}
								<div class="text-muted-foreground flex items-center gap-1 text-sm">
									<HugeiconsIcon icon={Clock01Icon} class="h-4 w-4" />
									{Math.round(progressPct)}%
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer note -->
		<p class="text-muted-foreground text-center text-xs">
			4 missions selected daily • Progress resets at midnight UTC
		</p>
	{/if}
</div>