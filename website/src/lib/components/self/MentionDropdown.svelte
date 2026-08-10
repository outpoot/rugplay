<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { getPublicUrl } from '$lib/utils';

	interface MentionUser {
		id: number;
		username: string;
		name: string;
		image: string | null;
		bio: string | null;
		isAdmin: boolean | null;
	}

	interface Props {
		users: MentionUser[];
		activeIndex: number;
		loading: boolean;
		onSelect: (user: MentionUser) => void;
		onHover: (index: number) => void;
	}

	const { users, activeIndex, loading, onSelect, onHover }: Props = $props();
</script>

{#if loading || users.length > 0}
	<div
		class="bg-popover text-popover-foreground absolute bottom-full left-0 z-50 mb-1 max-h-56 w-full max-w-xs overflow-y-auto rounded-md border shadow-md"
	>
		{#if loading}
			<div class="text-muted-foreground px-3 py-2 text-xs">Searching...</div>
		{:else}
			{#each users as user, i (user.id)}
				<button
					type="button"
					class="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors {i ===
					activeIndex
						? 'bg-accent text-accent-foreground'
						: ''}"
					onmousedown={(e) => {
						e.preventDefault();
						onSelect(user);
					}}
					onmouseenter={() => onHover(i)}
				>
					<Avatar.Root class="h-6 w-6 shrink-0">
						<Avatar.Image src={getPublicUrl(user.image)} alt={user.username} />
						<Avatar.Fallback class="text-[10px]">
							{user.username.slice(0, 2).toUpperCase()}
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1 truncate font-medium">
							@{user.username}
							{#if user.isAdmin}
								<span class="text-cyan-400 text-[10px]">✓</span>
							{/if}
						</div>
						{#if user.name && user.name !== user.username}
							<div class="text-muted-foreground truncate text-xs">{user.name}</div>
						{/if}
					</div>
				</button>
			{/each}
		{/if}
	</div>
{/if}
