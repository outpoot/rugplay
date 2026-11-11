<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import UserName from '$lib/components/self/UserName.svelte';
	import { getPublicUrl } from '$lib/utils';

	type Player = {
		id: number;
		name: string;
		username: string;
		image: string | null;
		nameColor?: string | null;
	};

	let {
		open = $bindable(false),
		title,
		players,
		loading = false,
		emptyMessage = 'Nobody here yet.',
		footnote = ''
	}: {
		open?: boolean;
		title: string;
		players: Player[];
		loading?: boolean;
		emptyMessage?: string;
		footnote?: string;
	} = $props();

	let query = $state('');

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

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[80vh] flex-col gap-3 sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
		</Dialog.Header>
		{#if loading}
			<div class="space-y-2">
				{#each Array(5) as _}
					<div class="flex items-center gap-2">
						<Skeleton class="h-6 w-6 shrink-0 rounded-full" />
						<Skeleton class="h-4 flex-1" />
					</div>
				{/each}
			</div>
		{:else if players.length === 0}
			<p class="text-muted-foreground py-6 text-center text-sm">{emptyMessage}</p>
		{:else}
			<Input bind:value={query} placeholder="Filter players..." />
			<div class="-mx-2 min-h-0 flex-1 overflow-y-auto">
				{#each filtered as player (player.id)}
					<a
						href={`/user/${player.username}`}
						onclick={() => (open = false)}
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
				{:else}
					<p class="text-muted-foreground py-6 text-center text-sm">No one matches "{query}".</p>
				{/each}
			</div>
			{#if footnote}
				<p class="text-muted-foreground text-center text-xs">{footnote}</p>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
