<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import UserName from '$lib/components/self/UserName.svelte';
	import { getPublicUrl } from '$lib/utils';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { UserCheck01Icon } from '@hugeicons/core-free-icons';

	type Player = {
		id: number;
		name: string;
		username: string;
		image: string | null;
		nameColor?: string | null;
	};

	// The card stays the same height however many players you follow: a short
	// list here, everyone else behind "View all".
	let { players, limit = 5 }: { players: Player[]; limit?: number } = $props();

	let open = $state(false);
	let query = $state('');

	let preview = $derived(players.slice(0, limit));
	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase().replace(/^@/, '');
		if (!q) return players;
		return players.filter(
			(p) => p.username.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
		);
	});

	$effect(() => {
		if (!open) query = '';
	});
</script>

{#snippet row(player: Player)}
	<a
		href={`/user/${player.username}`}
		class="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
	>
		<Avatar.Root class="h-6 w-6 shrink-0">
			<Avatar.Image src={getPublicUrl(player.image)} alt={player.name} />
			<Avatar.Fallback class="text-[10px]">
				{player.name?.charAt(0)?.toUpperCase() ?? '?'}
			</Avatar.Fallback>
		</Avatar.Root>
		<span class="min-w-0 flex-1 truncate text-sm font-medium">
			<UserName name={player.name} nameColor={player.nameColor} />
		</span>
		<span class="text-muted-foreground max-w-[45%] shrink-0 truncate text-xs">
			@{player.username}
		</span>
	</a>
{/snippet}

<section class="bg-card rounded-xl border p-3">
	<div class="mb-1.5 flex items-center justify-between">
		<h2 class="flex items-center gap-1.5 text-sm font-semibold">
			<HugeiconsIcon icon={UserCheck01Icon} class="text-primary h-4 w-4" />
			Following
			<span class="text-muted-foreground font-normal tabular-nums">{players.length}</span>
		</h2>
		{#if players.length > limit}
			<button
				class="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
				onclick={() => (open = true)}
			>
				View all
			</button>
		{/if}
	</div>
	<div class="-mx-2">
		{#each preview as player (player.id)}
			{@render row(player)}
		{/each}
	</div>
</section>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[80vh] flex-col gap-3 sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Following ({players.length})</Dialog.Title>
		</Dialog.Header>
		<Input bind:value={query} placeholder="Filter players..." />
		<div class="-mx-2 min-h-0 flex-1 overflow-y-auto">
			{#each filtered as player (player.id)}
				{@render row(player)}
			{:else}
				<p class="text-muted-foreground py-6 text-center text-sm">No one matches "{query}".</p>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
