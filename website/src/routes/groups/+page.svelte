<!-- src/routes/groups/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		UserMultiple02Icon,
		PlusSignIcon,
		Search01Icon,
		CrownIcon,
		UserIcon
	} from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';
	import { formatValue } from '$lib/utils';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import SEO from '$lib/components/self/SEO.svelte';

	const GROUP_CREATION_COST = 150_000;

	interface Group {
		id: number;
		name: string;
		description: string | null;
		ownerId: number;
		ownerUsername: string;
		balance: string;
		createdAt: string;
		memberCount: number;
		role?: string;
	}

	let allGroups = $state<Group[]>([]);
	let myGroups = $state<Group[]>([]);
	let loading = $state(true);
	let tab = $state<'all' | 'mine'>('all');
	let search = $state('');
	let showCreate = $state(false);
	let creating = $state(false);
	let shouldSignIn = $state(false);

	let newName = $state('');
	let newDescription = $state('');

	let filtered = $derived(
		(tab === 'mine' ? myGroups : allGroups).filter(
			(g) =>
				g.name.toLowerCase().includes(search.toLowerCase()) ||
				g.ownerUsername.toLowerCase().includes(search.toLowerCase())
		)
	);

	async function fetchGroups() {
		loading = true;
		try {
			const [allRes, mineRes] = await Promise.all([
				fetch('/api/groups?filter=all'),
				$USER_DATA ? fetch('/api/groups?filter=mine') : Promise.resolve(null)
			]);
			allGroups = await allRes.json();
			if (mineRes) myGroups = await mineRes.json();
		} catch {
			toast.error('Failed to load groups');
		} finally {
			loading = false;
		}
	}

	async function createGroup() {
		if (!$USER_DATA) { shouldSignIn = true; return; }

		const name = newName.trim();
		if (!name || name.length < 3) {
			toast.error('Group name must be at least 3 characters');
			return;
		}

		creating = true;
		try {
			const res = await fetch('/api/groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description: newDescription.trim() })
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? 'Failed to create group');
				return;
			}
			toast.success('Group created!');
			showCreate = false;
			newName = '';
			newDescription = '';
			await fetchGroups();
			goto(`/groups/${data.groupId}`);
		} catch {
			toast.error('Failed to create group');
		} finally {
			creating = false;
		}
	}

	onMount(fetchGroups);
</script>

<SEO
	title="Groups - Rugplay"
	description="Create and join groups with other Rugplay traders."
	keywords="groups, crypto game, trading community"
/>

<SignInConfirmDialog bind:open={shouldSignIn} />

<Dialog.Root bind:open={showCreate}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Create Group</Dialog.Title>
			<Dialog.Description>
				Creating a group costs
				<span class="text-primary font-semibold">${GROUP_CREATION_COST.toLocaleString()}</span>.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label>Name <span class="text-muted-foreground text-xs">(3–50 chars)</span></Label>
				<Input bind:value={newName} maxlength={50} placeholder="My Trading Crew" />
			</div>
			<div class="space-y-1.5">
				<Label>Description <span class="text-muted-foreground text-xs">(optional)</span></Label>
				<Textarea bind:value={newDescription} maxlength={200} rows={3} placeholder="What's your group about?" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCreate = false)}>Cancel</Button>
			<Button onclick={createGroup} disabled={creating || newName.trim().length < 3}>
				{creating ? 'Creating...' : `Create — $${GROUP_CREATION_COST.toLocaleString()}`}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="container mx-auto max-w-4xl p-4 md:p-6">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-2 text-2xl font-bold md:text-3xl">
				<HugeiconsIcon icon={UserMultiple02Icon} class="text-primary h-7 w-7" />
				Groups
			</h1>
			<p class="text-muted-foreground mt-1 text-sm">Join a group or create your own</p>
		</div>
		<Button
			onclick={() => ($USER_DATA ? (showCreate = true) : (shouldSignIn = true))}
			class="gap-2"
		>
			<HugeiconsIcon icon={PlusSignIcon} class="h-4 w-4" />
			Create Group
		</Button>
	</div>

	<!-- Tabs + Search -->
	<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="bg-muted flex rounded-lg p-1">
			{#each (['all', 'mine'] as const) as t}
				<button
					onclick={() => (tab = t)}
					class="rounded-md px-4 py-1.5 text-sm font-medium transition-all
					{tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
				>
					{t === 'all' ? 'All Groups' : 'My Groups'}
					{#if t === 'mine' && myGroups.length > 0}
						<Badge variant="secondary" class="ml-1.5 text-xs">{myGroups.length}</Badge>
					{/if}
				</button>
			{/each}
		</div>
		<div class="relative flex-1">
			<HugeiconsIcon icon={Search01Icon} class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
			<input
				bind:value={search}
				placeholder="Search groups..."
				class="border-border bg-background w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-1"
			/>
		</div>
	</div>

	<!-- Groups Grid -->
	{#if loading}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each Array(4) as _}
				<Skeleton class="h-32 w-full rounded-xl" />
			{/each}
		</div>
	{:else if filtered.length === 0}
		<div class="text-muted-foreground flex flex-col items-center justify-center gap-3 py-16">
			<HugeiconsIcon icon={UserMultiple02Icon} class="h-12 w-12 opacity-20" />
			<p class="text-sm">
				{tab === 'mine' ? "You haven't joined any groups yet." : 'No groups found.'}
			</p>
			{#if tab === 'mine'}
				<Button variant="outline" size="sm" onclick={() => ($USER_DATA ? (showCreate = true) : (shouldSignIn = true))}>
					Create one
				</Button>
			{/if}
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each filtered as g (g.id)}
				<button
					onclick={() => goto(`/groups/${g.id}`)}
					class="bg-card border-border hover:border-primary/40 group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-md"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="flex items-center gap-2">
							<div class="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
								<HugeiconsIcon icon={UserMultiple02Icon} class="text-primary h-5 w-5" />
							</div>
							<div>
								<div class="flex items-center gap-1.5">
									<span class="font-semibold leading-tight">{g.name}</span>
									{#if g.role === 'owner'}
										<HugeiconsIcon icon={CrownIcon} class="text-amber-400 h-3.5 w-3.5" />
									{/if}
								</div>
								<span class="text-muted-foreground text-xs">by @{g.ownerUsername}</span>
							</div>
						</div>
						<Badge variant="secondary" class="shrink-0 text-xs">
							<HugeiconsIcon icon={UserIcon} class="mr-1 h-3 w-3" />
							{g.memberCount}
						</Badge>
					</div>

					{#if g.description}
						<p class="text-muted-foreground line-clamp-2 text-sm">{g.description}</p>
					{/if}

					<div class="mt-auto flex items-center justify-between pt-1">
						<span class="text-muted-foreground text-xs">
							Treasury: <span class="text-foreground font-medium">{formatValue(Number(g.balance))}</span>
						</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>