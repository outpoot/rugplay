<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import PlayerListDialog from '$lib/components/self/PlayerListDialog.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import UserName from '$lib/components/self/UserName.svelte';
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import { formatRelativeTime, formatValue, getPublicUrl } from '$lib/utils';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { UserCheck01Icon } from '@hugeicons/core-free-icons';

	type Player = {
		id: number;
		name: string;
		username: string;
		image: string | null;
		nameColor?: string | null;
	};

	type Trade = {
		id: number;
		type: 'BUY' | 'SELL';
		totalValue: number;
		timestamp: number;
		name: string;
		username: string;
		image: string | null;
		nameColor?: string | null;
		coinSymbol: string;
		coinName: string;
		coinIcon: string | null;
	};

	// What the players you follow have been doing, not who they are: the feed is
	// the card, and the full list sits behind the count.
	let {
		players,
		trades,
		loading = false
	}: { players: Player[]; trades: Trade[]; loading?: boolean } = $props();

	let open = $state(false);
</script>

{#snippet avatar(person: { name: string; image: string | null }, size: string)}
	<Avatar.Root class="{size} shrink-0">
		<Avatar.Image src={getPublicUrl(person.image)} alt={person.name} />
		<Avatar.Fallback class="text-[10px]">
			{person.name?.charAt(0)?.toUpperCase() ?? '?'}
		</Avatar.Fallback>
	</Avatar.Root>
{/snippet}

<section class="bg-card flex h-full flex-col rounded-xl border p-3">
	<div class="mb-1.5 flex items-center justify-between">
		<h2 class="flex items-center gap-1.5 text-sm font-semibold">
			<HugeiconsIcon icon={UserCheck01Icon} class="text-primary h-4 w-4" />
			Following
		</h2>
		<button
			class="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
			onclick={() => (open = true)}
		>
			{players.length}
			{players.length === 1 ? 'player' : 'players'}
		</button>
	</div>

	{#if loading}
		{#each Array(3) as _}
			<div class="flex items-center gap-2 py-1.5">
				<Skeleton class="h-7 w-7 shrink-0 rounded-full" />
				<div class="flex-1 space-y-1">
					<Skeleton class="h-3.5 w-2/3" />
					<Skeleton class="h-3 w-1/2" />
				</div>
			</div>
		{/each}
	{:else if trades.length === 0}
		<p class="text-muted-foreground py-4 text-center text-xs">
			No big trades from players you follow this week.
		</p>
	{:else}
		<div class="-mx-2">
			{#each trades as trade (trade.id)}
				<div class="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1 transition-colors">
					<a href={`/user/${trade.username}`} aria-label={`${trade.name}'s profile`}>
						{@render avatar(trade, 'h-7 w-7')}
					</a>
					<a href={`/coin/${trade.coinSymbol}`} class="min-w-0 flex-1 leading-tight">
						<span class="flex items-baseline justify-between gap-2">
							<span class="min-w-0 truncate text-sm font-medium">
								<UserName name={trade.name} nameColor={trade.nameColor} />
							</span>
							<span class="text-muted-foreground shrink-0 text-[11px]">
								{formatRelativeTime(new Date(trade.timestamp))}
							</span>
						</span>
						<span class="flex items-center gap-1 text-xs">
							<span
								class="font-medium {trade.type === 'BUY' ? 'text-success' : 'text-destructive'}"
							>
								{trade.type === 'BUY' ? 'Bought' : 'Sold'}
							</span>
							<span class="font-mono font-medium tabular-nums">{formatValue(trade.totalValue)}</span>
							<span class="text-muted-foreground">of</span>
							<CoinIcon
								icon={trade.coinIcon}
								symbol={trade.coinSymbol}
								name={trade.coinName}
								size={4}
								class="shrink-0 [&>span]:text-[7px]"
							/>
							<span class="min-w-0 truncate font-medium">*{trade.coinSymbol}</span>
						</span>
					</a>
				</div>
			{/each}
		</div>
	{/if}
</section>

<PlayerListDialog bind:open title={`Following (${players.length})`} {players} />
