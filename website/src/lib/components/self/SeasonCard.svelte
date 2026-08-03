<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { formatValue, getPublicUrl } from '$lib/utils';
	import SeasonBackground from '$lib/components/self/SeasonBackground.svelte';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import UserName from '$lib/components/self/UserName.svelte';
	import { Trophy, Medal, Award } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	let { data = null } = $props<{ data?: any }>();

	let now = $state(Date.now());
	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		timer = setInterval(() => (now = Date.now()), 1000);
	});
	onDestroy(() => clearInterval(timer));

	let season = $derived(data?.season ?? null);
	let leaderboard = $derived(data?.leaderboard ?? []);
	let me = $derived(data?.me ?? null);

	let endsAt = $derived(season ? new Date(season.endsAt).getTime() : 0);
	let msLeft = $derived(Math.max(0, endsAt - now));

	let countdown = $derived.by(() => {
		const total = Math.floor(msLeft / 1000);
		const days = Math.floor(total / 86400);
		const hours = Math.floor((total % 86400) / 3600);
		const mins = Math.floor((total % 3600) / 60);
		const secs = total % 60;
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m ${secs}s`;
	});

	let top = $derived(leaderboard.slice(0, 5));

	let showOwnRow = $derived(
		me?.joined && me?.rank != null && !top.some((e: any) => e.userId === me.userId)
	);
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
</script>

{#if season}
	<Card.Root class="relative isolate flex h-full flex-col overflow-hidden">
		<SeasonBackground backgroundImage={season.backgroundImage} />

		<Card.Header class="relative -mt-6 gap-0 pt-6 pb-4">
			<div class="relative">
				<div
					class="bg-card/40 pointer-events-none absolute -inset-x-6 -top-6 -z-[5] bottom-[-1.25rem] backdrop-blur-md"
					style="mask-image: {frostedMask}; -webkit-mask-image: {frostedMask};"
					aria-hidden="true"
				></div>
				<div class="relative flex items-start justify-between gap-3">
					<Card.Title class="flex min-w-0 flex-wrap items-center gap-2 text-lg sm:text-xl">
						<span class="truncate">{season.name}</span>
						<Badge variant="success" class="shrink-0">Live</Badge>
					</Card.Title>
					<div class="flex shrink-0 flex-col items-end">
						<span class="font-mono text-xl font-bold tabular-nums sm:text-2xl">{countdown}</span>
						<span class="text-muted-foreground text-xs">remaining</span>
					</div>
				</div>
			</div>
			<Card.Description class="mt-4">
				Everyone starts from the same stake. Whoever grows most before the clock runs out takes the
				trophy.
			</Card.Description>
		</Card.Header>

		<Card.Content class="flex flex-1 flex-col gap-4">
			{#if top.length > 0}
				<div class="flex-1 space-y-0.5">
					{#each top as entry (entry.userId)}
						<HoverCard.Root openDelay={200} closeDelay={100}>
							<HoverCard.Trigger
								href={`/user/${entry.username}`}
								class="hover:bg-muted/60 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
								onpointerenter={trackPointer}
								onpointermove={trackPointer}
							>
							<span class="flex w-5 shrink-0 justify-center">
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
							<Avatar.Root class="h-6 w-6 shrink-0">
								<Avatar.Image src={getPublicUrl(entry.image)} alt={entry.name ?? entry.username} />
								<Avatar.Fallback class="text-[10px]">
									{(entry.name ?? entry.username ?? '?').charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<span class="min-w-0 flex-1 truncate text-sm">
								<UserName name={entry.name ?? entry.username} nameColor={entry.nameColor} />
								<span class="text-muted-foreground">(@{entry.username})</span>
							</span>
							<span class="shrink-0 text-right">
								<span class="block font-mono text-sm font-medium tabular-nums">
									{formatValue(entry.score)}
								</span>
								<span
									class="block font-mono text-[10px] tabular-nums {entry.growth >= 1
										? 'text-success'
										: 'text-destructive'}"
								>
									{entry.growth.toFixed(2)}x
								</span>
							</span>
							</HoverCard.Trigger>
							<HoverCard.Content class="w-80" side="top" sideOffset={14} customAnchor={cursorAnchor}>
								<UserProfilePreview userId={entry.userId} />
							</HoverCard.Content>
						</HoverCard.Root>
					{/each}

					{#if showOwnRow}
						<Separator class="my-1.5" />
						<a
							href="/season"
							class="bg-muted/40 hover:bg-muted/70 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
						>
							<span class="w-5 shrink-0 text-center text-sm font-semibold tabular-nums">
								{me.rank}
							</span>
							<span class="min-w-0 flex-1 truncate text-sm font-medium">You</span>
							<span class="shrink-0 text-right">
								<span class="block font-mono text-sm font-medium tabular-nums">
									{formatValue(me.score)}
								</span>
								<span
									class="block font-mono text-[10px] tabular-nums {me.growth >= 1
										? 'text-success'
										: 'text-destructive'}"
								>
									{me.growth.toFixed(2)}x
								</span>
							</span>
						</a>
					{/if}
				</div>
			{:else}
				<p class="text-muted-foreground flex-1 py-2 text-center text-sm">
					No one has entered yet. Be the first.
				</p>
			{/if}

			<Button class="w-full" onclick={() => goto('/season')}>
				{me?.joined ? 'View more' : 'Enter ranked'}
			</Button>
		</Card.Content>
	</Card.Root>
{/if}
