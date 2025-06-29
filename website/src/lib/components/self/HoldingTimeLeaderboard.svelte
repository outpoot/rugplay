<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import HoldersSkeleton from './skeletons/HoldersSkeleton.svelte';
	import { Clock } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { getPublicUrl, formatDuration } from '$lib/utils';
	import UserProfilePreview from './UserProfilePreview.svelte';
	import DataTable from './DataTable.svelte';

	interface Holder {
		userId: number;
		username: string;
		buyTimestamp: number;
	}

	let { coinSymbol } = $props<{ coinSymbol: string }>();

	let loading = $state(true);
	let leaderboard = $state<Holder[]>([]);
	let modalOpen = $state(false);
	let interval: ReturnType<typeof setInterval>;

	async function fetchLeaderboardData() {
		try {
			let allTrades = [];
			let page = 1;
			let hasMorePages = true;
			const limit = 100;

			while (hasMorePages) {
				const response = await fetch(
					`/api/leaderboard/time-held/${coinSymbol}?page=${page}&limit=${limit}`
				);
				if (!response.ok) {
					throw new Error('API request failed');
				}
				const data = await response.json();

				if (data.status !== 'success' || !data.results) {
					throw new Error(data.message || 'Invalid API response');
				}

				allTrades.push(...data.results);
				hasMorePages = data.pagination.current_page < data.pagination.total_pages;
				page++;
			}
			processTrades(allTrades);
		} catch (e) {
			console.error('Failed to fetch holding time leaderboard data:', e);
			toast.error('Failed to load time-held leaderboard');
		} finally {
			loading = false;
		}
	}

	function processTrades(trades: any[]) {
		const tradesByUser = new Map<number, any[]>();

		for (const trade of trades) {
			if (!tradesByUser.has(trade.userId)) {
				tradesByUser.set(trade.userId, []);
			}
			tradesByUser.get(trade.userId)!.push(trade);
		}

		const currentHolders: Holder[] = [];

		for (const [userId, userTrades] of tradesByUser.entries()) {
			userTrades.sort((a, b) => b.timestamp - a.timestamp);
			const latestTrade = userTrades[0];

			if (latestTrade && latestTrade.type.toUpperCase() === 'BUY') {
				currentHolders.push({
					userId: userId,
					username: latestTrade.username,
					buyTimestamp: latestTrade.timestamp
				});
			}
		}

		currentHolders.sort((a, b) => a.buyTimestamp - b.buyTimestamp);
		leaderboard = currentHolders;
	}

	$effect(() => {
		if (coinSymbol) {
			loading = true;
			leaderboard = [];
			fetchLeaderboardData();
		}

		clearInterval(interval);
		interval = setInterval(() => {
			leaderboard = [...leaderboard];
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});

	let leaderboardColumns = $derived([
		{
			key: 'rank',
			label: 'Rank',
			class: 'w-[10%] min-w-[60px]',
			render: (_: any, __: any, i: number) => `#${i + 1}`
		},
		{
			key: 'user',
			label: 'User',
			class: 'w-[50%] min-w-[150px]',
			render: (_: any, row: Holder) => ({
				component: 'user',
				userId: row.userId,
				username: row.username,
				name: row.username
			})
		},
		{
			key: 'timeHeld',
			label: 'Time Held',
			class: 'w-[40%] min-w-[120px] font-mono',
			render: (_: any, row: Holder) => formatDuration(Date.now() - row.buyTimestamp)
		}
	]);
</script>

<Card.Root
	class="gap-2 {leaderboard.length > 3 ? 'hover:bg-card/90 cursor-pointer transition-colors' : ''}"
	onclick={() => leaderboard.length > 3 && (modalOpen = true)}
>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Clock class="h-5 w-5" />
			Time Held
		</Card.Title>
	</Card.Header>
	<Card.Content class="relative">
		{#if loading}
			<HoldersSkeleton />
		{:else if leaderboard.length === 0}
			<div class="py-4 text-center">
				<Clock class="text-muted-foreground mx-auto mb-2 h-8 w-8" />
				<p class="text-muted-foreground text-sm">No holders to display</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each leaderboard.slice(0, 3) as holder, i}
					<div class="flex items-center gap-2">
						<div class="w-8 text-center text-sm font-bold text-muted-foreground">#{i + 1}</div>
						<div
							class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-left"
						>
							<HoverCard.Root>
								<HoverCard.Trigger>
									<div class="flex items-center gap-2">
										<Avatar.Root class="h-8 w-8 flex-shrink-0">
											<Avatar.Fallback class="text-xs">{holder.username.charAt(0)}</Avatar.Fallback>
										</Avatar.Root>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium">{holder.username}</p>
											<p class="text-muted-foreground truncate text-xs">@{holder.username}</p>
										</div>
									</div>
								</HoverCard.Trigger>
								<HoverCard.Content class="w-80" side="top" sideOffset={3}>
									<UserProfilePreview userId={holder.userId} />
								</HoverCard.Content>
							</HoverCard.Root>
						</div>
						<div class="flex flex-shrink-0 items-center gap-1.5 text-right">
							<div class="font-mono text-sm">{formatDuration(Date.now() - holder.buyTimestamp)}</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if leaderboard.length > 3}
			<div
				class="from-card/80 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
			></div>
		{/if}
	</Card.Content>
</Card.Root>

<Dialog.Root bind:open={modalOpen}>
	<Dialog.Content
		class="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col sm:max-w-[800px] md:max-w-2xl"
	>
		<Dialog.Header class="flex-shrink-0">
			<Dialog.Title class="flex items-center gap-2">
				<Clock class="h-5 w-5" />
				Time Held Leaderboard (*{coinSymbol})
			</Dialog.Title>
			<Dialog.Description>
				Showing all current holders, ranked by who held the longest.
			</Dialog.Description>
		</Dialog.Header>

		<div class="min-h-0 flex-1">
			<ScrollArea class="h-[600px] rounded-md border">
				<div class="bg-card p-2">
					<DataTable
						columns={leaderboardColumns}
						data={leaderboard}
						onRowClick={(holder) => goto(`/user/${holder.username}`)}
						enableUserPreview={true}
						emptyTitle="No holders"
						emptyDescription="This coin doesn't have any current holders."
					/>
				</div>
			</ScrollArea>
		</div>
	</Dialog.Content>
</Dialog.Root>