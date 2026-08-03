<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { formatValue, getPublicUrl } from '$lib/utils';
	import { USER_DATA } from '$lib/stores/user-data';
	import { fetchPortfolioData } from '$lib/stores/portfolio-data';
	import SeasonBackground from '$lib/components/self/SeasonBackground.svelte';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import UserName from '$lib/components/self/UserName.svelte';
	import SeasonSkeleton from '$lib/components/self/skeletons/SeasonSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import { Trophy, Medal, Award, ChevronRight, ArrowLeft } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { haptic } from '$lib/stores/haptics';

	let data = $state<any>(null);
	let loading = $state(true);
	let joining = $state(false);
	let confirmOpen = $state(false);
	let shouldSignIn = $state(false);

	let now = $state(Date.now());
	let timer: ReturnType<typeof setInterval> | undefined;

	let archiveNumber = $derived(page.url.searchParams.get('c'));

	async function load(archive: string | null) {
		loading = true;
		try {
			const query = archive !== null ? `?c=${encodeURIComponent(archive)}` : '?limit=100';
			const res = await fetch(`/api/season${query}`);
			if (res.ok) {
				data = await res.json();
			} else {
				data = null;
				toast.error(archive !== null ? 'Season not found' : 'Failed to load season');
			}
		} catch (e) {
			console.error('Failed to load season:', e);
			toast.error('Failed to load season');
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load(archiveNumber);
	});

	onMount(() => {
		timer = setInterval(() => (now = Date.now()), 1000);
	});
	onDestroy(() => clearInterval(timer));

	let archived = $derived(!!data?.archived);
	let season = $derived(data?.season ?? null);
	let leaderboard = $derived(data?.leaderboard ?? []);
	let me = $derived(data?.me ?? null);
	let pointerX = $state(0);
	let pointerY = $state(0);
	let frostedMask = $derived('linear-gradient(to bottom, black 0%, black 62%, transparent 100%)');
	const cursorAnchor = {
		getBoundingClientRect: () => new DOMRect(pointerX, pointerY, 0, 0)
	};

	function trackPointer(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		pointerX = event.clientX;
		pointerY = event.clientY;
	}

	let endsAt = $derived(season ? new Date(season.endsAt).getTime() : 0);
	let msLeft = $derived(Math.max(0, endsAt - now));

	let countdown = $derived.by(() => {
		const total = Math.floor(msLeft / 1000);
		const d = Math.floor(total / 86400);
		const h = Math.floor((total % 86400) / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		if (d > 0) return `${d}d ${h}h ${m}m`;
		if (h > 0) return `${h}h ${m}m ${s}s`;
		return `${m}m ${s}s`;
	});

	let showOwnRow = $derived(
		!archived && me?.joined && me?.rank != null && !leaderboard.some((e: any) => e.userId === me.userId)
	);

	function formatDate(value: string | null | undefined) {
		if (!value) return '';
		return new Date(value).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function join() {
		joining = true;
		try {
			const res = await fetch('/api/season/join', { method: 'POST' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.message || result.error || 'Failed to enter');

			haptic.trigger('success');
			toast.success(`You're in ${result.seasonName}`, {
				description: `Starting stake ${formatValue(result.startingStake)} · ${formatValue(result.sacrificed)} burned on entry`
			});

			confirmOpen = false;
			await Promise.all([load(null), fetchPortfolioData()]);
		} catch (e) {
			haptic.trigger('error');
			toast.error('Could not enter', { description: (e as Error).message });
		} finally {
			joining = false;
		}
	}

	function onEnterClick() {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}
		confirmOpen = true;
	}
</script>

<SEO
	title={season ? `${season.name} — Rugplay` : 'Season — Rugplay'}
	description="Rugplay season standings. Everyone starts from the same stake."
/>
<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="container mx-auto max-w-5xl px-4 py-6">
	{#if loading}
		<SeasonSkeleton />
	{:else if !season}
		<div class="py-16 text-center">
			<h1 class="text-xl font-bold">
				{archiveNumber !== null ? 'Season not found' : 'No active season'}
			</h1>
			<p class="text-muted-foreground mt-2 text-sm">
				{archiveNumber !== null ? 'That season has no archive.' : 'Check back shortly.'}
			</p>
			{#if archiveNumber !== null}
				<Button variant="outline" class="mt-4" href="/season">Back to current season</Button>
			{/if}
		</div>
	{:else}
		<header class="mb-6">
			{#if archived}
				<a
					href="/season"
					class="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm transition-colors"
				>
					<ArrowLeft class="h-4 w-4" />
					Current season
				</a>
			{/if}
			<div class="flex items-start justify-between gap-4">
				<h1 class="flex min-w-0 flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
					<span class="truncate">{season.name}</span>
					{#if archived}
						<Badge variant="secondary" class="shrink-0">Archived</Badge>
					{:else}
						<Badge variant="success" class="shrink-0">Live</Badge>
					{/if}
				</h1>
				<div class="shrink-0 text-right">
					{#if archived}
						<div class="text-lg font-semibold sm:text-xl">{formatDate(season.endedAt)}</div>
						<div class="text-muted-foreground text-xs">final standings</div>
					{:else}
						<div class="font-mono text-2xl font-bold tabular-nums sm:text-3xl">{countdown}</div>
						<div class="text-muted-foreground text-xs">remaining</div>
					{/if}
				</div>
			</div>
			<p class="text-muted-foreground mt-2 text-sm">
				Everyone starts from the same stake. Whoever grows most before the clock runs out takes the
				trophy.
			</p>
		</header>

		{#if !archived && !me?.joined}
			<Card.Root class="mb-6">
				<Card.Content>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="min-w-0">
							<h2 class="font-semibold">Hey!</h2>
							<p class="text-muted-foreground mt-1 text-sm">
								You aren't in yet. Entering sells your coins and sets your balance to
								<b>{formatValue(season.rankedStake)}</b>.
								<br />Every ranked
								player starts from the same figure.
							</p>
						</div>
						<Button class="w-full shrink-0 sm:w-auto" onclick={onEnterClick}>Enter</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root class="relative isolate overflow-hidden">
			<SeasonBackground backgroundImage={season.backgroundImage} height="h-64" hold="30%" fade="100%" />
			<Card.Header class="relative -mt-6 pt-6 pb-4">
				<div
					class="bg-card/40 pointer-events-none absolute -inset-x-6 -top-6 -z-[5] bottom-[-1.25rem] backdrop-blur-md"
					style="mask-image: {frostedMask}; -webkit-mask-image: {frostedMask};"
					aria-hidden="true"
				></div>
				<Card.Title class="relative text-lg">
					{archived ? 'Final standings' : 'Standings'}
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if leaderboard.length === 0}
					<p class="text-muted-foreground py-8 text-center text-sm">
						{archived ? 'No standings were recorded for this season.' : 'No one has entered yet. Be the first.'}
					</p>
				{:else}
					<div class="-mx-2 overflow-x-auto">
						<div class="min-w-[420px] px-2">
							{#each leaderboard as entry (entry.userId)}
								<HoverCard.Root openDelay={200} closeDelay={100}>
									<HoverCard.Trigger
										href={`/user/${entry.username}`}
										class="hover:bg-muted/60 flex items-center gap-3 rounded-md px-2 py-2 transition-colors {me?.userId ===
									entry.userId
										? 'bg-muted/40'
										: ''}"
										onpointerenter={trackPointer}
										onpointermove={trackPointer}
								>
									<span class="flex w-7 shrink-0 justify-center">
										{#if entry.rank === 1}
											<Trophy class="h-4 w-4 text-yellow-500" />
										{:else if entry.rank === 2}
											<Medal class="h-4 w-4 text-slate-400" />
										{:else if entry.rank === 3}
											<Award class="h-4 w-4 text-amber-700" />
										{:else}
											<span class="text-sm font-semibold tabular-nums">{entry.rank}</span>
										{/if}
									</span>
									<Avatar.Root class="h-7 w-7 shrink-0">
										<Avatar.Image
											src={getPublicUrl(entry.image)}
											alt={entry.name ?? entry.username}
										/>
										<Avatar.Fallback class="text-xs">
											{(entry.name ?? entry.username ?? '?').charAt(0).toUpperCase()}
										</Avatar.Fallback>
									</Avatar.Root>
									<span class="min-w-0 flex-1 truncate text-sm font-medium">
										<UserName name={entry.name ?? entry.username} nameColor={entry.nameColor} />
										<span class="text-muted-foreground font-normal">(@{entry.username})</span>
									</span>
									<span
										class="w-16 shrink-0 text-right font-mono text-xs tabular-nums {entry.growth >= 1
											? 'text-success'
											: 'text-destructive'}"
									>
										{entry.growth.toFixed(2)}x
									</span>
									<span
										class="w-24 shrink-0 text-right font-mono text-sm font-semibold tabular-nums"
									>
										{formatValue(entry.score)}
									</span>
									</HoverCard.Trigger>
									<HoverCard.Content class="w-80" side="top" sideOffset={14} customAnchor={cursorAnchor}>
										<UserProfilePreview userId={entry.userId} />
									</HoverCard.Content>
								</HoverCard.Root>
							{/each}

							{#if showOwnRow}
								<Separator class="my-2" />
								<div class="bg-muted/40 flex items-center gap-3 rounded-md px-2 py-2">
									<span class="w-7 shrink-0 text-center text-sm font-semibold tabular-nums">
										{me.rank}
									</span>
									<Avatar.Root class="h-7 w-7 shrink-0">
										<Avatar.Image src={getPublicUrl($USER_DATA?.image ?? null)} alt="You" />
										<Avatar.Fallback class="text-xs">
											{($USER_DATA?.name ?? 'Y').charAt(0).toUpperCase()}
										</Avatar.Fallback>
									</Avatar.Root>
									<span class="min-w-0 flex-1 truncate text-sm font-medium">You</span>
									<span
										class="w-16 shrink-0 text-right font-mono text-xs tabular-nums {me.growth >= 1
											? 'text-success'
											: 'text-destructive'}"
									>
										{me.growth.toFixed(2)}x
									</span>
									<span class="w-24 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
										{formatValue(me.score)}
									</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		{#if data?.pastSeasons?.length}
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title class="text-lg">Past seasons</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-1">
					{#each data.pastSeasons as past (past.number)}
						<a
							href={`/season?c=${past.number}`}
							class="hover:bg-muted/60 flex items-center gap-3 rounded-md px-2 py-2 transition-colors {archived &&
							season.number === past.number
								? 'bg-muted/40'
								: ''}"
						>
							<Trophy class="text-muted-foreground h-4 w-4 shrink-0" />
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{past.name}</span>
							<span class="text-muted-foreground shrink-0 text-xs">
								{formatDate(past.endedAt)}
							</span>
							<ChevronRight class="text-muted-foreground h-4 w-4 shrink-0" />
						</a>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>

<Dialog.Root bind:open={confirmOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Enter {season?.name}?</Dialog.Title>
			<Dialog.Description>This cannot be undone.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 text-sm">
			<div class="bg-muted/50 space-y-2 rounded-lg p-3">
				<div class="flex justify-between gap-2">
					<span class="text-muted-foreground">All coin holdings</span>
					<span class="font-medium">Sold at market</span>
				</div>
				<div class="flex justify-between gap-2">
					<span class="text-muted-foreground">Your balance becomes</span>
					<span class="font-medium">{formatValue(season?.rankedStake ?? 0)}</span>
				</div>
				<Separator />
				<div class="flex justify-between gap-2">
					<span class="text-muted-foreground">Everything above that</span>
					<span class="text-destructive font-medium">Burned</span>
				</div>
			</div>
			<p class="text-muted-foreground text-xs">
			Rankings are based only on your realizable portfolio value. Trophies you earn are permanent.
			</p>
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button
				variant="outline"
				class="w-full sm:w-auto"
				onclick={() => (confirmOpen = false)}
				disabled={joining}
			>
				Cancel
			</Button>
			<Button class="w-full sm:w-auto" onclick={join} disabled={joining}>
				{joining ? 'Entering…' : 'Confirm entry'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
