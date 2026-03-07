<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		UserMultiple02Icon,
		Delete01Icon,
		Search01Icon,
		CrownIcon,
		UserIcon,
		Loading03Icon
	} from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';
	import { formatValue } from '$lib/utils';
	import { USER_DATA } from '$lib/stores/user-data';

	interface AdminGroup {
		id: number;
		name: string;
		description: string | null;
		ownerId: number;
		ownerUsername: string;
		ownerEmail: string;
		balance: string;
		createdAt: string;
		memberCount: number;
	}

	let groups = $state<AdminGroup[]>([]);
	let loading = $state(true);
	let actionLoading = $state(false);
	let search = $state('');
	let searchDebounce: ReturnType<typeof setTimeout>;

	let disbandTarget = $state<AdminGroup | null>(null);
	let showDisband = $state(false);

	async function loadGroups() {
		loading = true;
		try {
			const params = new URLSearchParams({ limit: '100' });
			if (search.trim()) params.set('search', search.trim());
			const res = await fetch(`/api/admin/groups?${params}`);
			if (!res.ok) throw new Error('Failed to load');
			const data = await res.json();
			groups = data.groups;
		} catch {
			toast.error('Failed to load groups');
		} finally {
			loading = false;
		}
	}

	async function disbandGroup() {
		if (!disbandTarget) return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/admin/groups?id=${disbandTarget.id}`, { method: 'DELETE' });
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? 'Failed to disband group');
				return;
			}
			toast.success(`Group "${disbandTarget.name}" disbanded`);
			showDisband = false;
			disbandTarget = null;
			await loadGroups();
		} catch {
			toast.error('Failed to disband group');
		} finally {
			actionLoading = false;
		}
	}

	function onSearchInput() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(loadGroups, 350);
	}

	onMount(loadGroups);
</script>

<svelte:head>
	<title>Groups - Admin | Rugplay</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !$USER_DATA?.isAdmin}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold">Access Denied</h1>
			<p class="text-muted-foreground">You don't have permission to access this page.</p>
		</div>
	</div>
{:else}
	<Dialog.Root bind:open={showDisband}>
		<Dialog.Content class="max-w-sm">
			<Dialog.Header>
				<Dialog.Title>Disband Group</Dialog.Title>
				<Dialog.Description>
					Permanently delete <strong>{disbandTarget?.name}</strong>. Any treasury balance will be
					returned to the owner.
				</Dialog.Description>
			</Dialog.Header>
			{#if disbandTarget}
				<div class="bg-muted rounded-lg p-3 text-sm">
					<p>Owner: <span class="font-medium">@{disbandTarget.ownerUsername}</span></p>
					<p>Members: <span class="font-medium">{disbandTarget.memberCount}</span></p>
					<p>
						Treasury: <span class="font-medium" style="color: #00ff0d"
							>{formatValue(Number(disbandTarget.balance))}</span
						>
					</p>
				</div>
			{/if}
			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => {
						showDisband = false;
						disbandTarget = null;
					}}>Cancel</Button
				>
				<Button variant="destructive" onclick={disbandGroup} disabled={actionLoading}>
					{#if actionLoading}
						<HugeiconsIcon icon={Loading03Icon} class="h-4 w-4 animate-spin" />
					{/if}
					Disband
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<div class="container mx-auto max-w-5xl p-4 md:p-6">
		<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<div class="mb-1 flex items-center gap-2.5">
					<HugeiconsIcon icon={UserMultiple02Icon} class="h-5 w-5" />
					<h1 class="text-2xl font-bold">Group Moderation</h1>
				</div>
				<p class="text-muted-foreground text-sm">
					{groups.length} group{groups.length !== 1 ? 's' : ''} loaded
				</p>
			</div>

			<div class="relative max-w-xs flex-1">
				<HugeiconsIcon
					icon={Search01Icon}
					class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
				/>
				<Input
					bind:value={search}
					oninput={onSearchInput}
					placeholder="Search by group name..."
					class="pl-9"
				/>
			</div>
		</div>

		<Card.Root>
			<Card.Content class="p-0">
				{#if loading}
					<div class="divide-border divide-y">
						{#each Array(5) as _}
							<div class="flex items-center justify-between px-5 py-4">
								<div class="space-y-2">
									<Skeleton class="h-4 w-40" />
									<Skeleton class="h-3 w-28" />
								</div>
								<Skeleton class="h-8 w-20" />
							</div>
						{/each}
					</div>
				{:else if groups.length === 0}
					<div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
						<HugeiconsIcon icon={UserMultiple02Icon} class="text-muted-foreground h-10 w-10 opacity-30" />
						<p class="text-muted-foreground text-sm">No groups found.</p>
					</div>
				{:else}
					<div class="divide-border divide-y">
						{#each groups as g (g.id)}
							<div class="flex items-start justify-between gap-4 px-5 py-4">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span class="font-semibold">{g.name}</span>
										<Badge variant="outline" class="text-xs">
											<HugeiconsIcon icon={UserIcon} class="mr-1 h-3 w-3" />
											{g.memberCount}
										</Badge>
										{#if Number(g.balance) > 0}
											<span class="text-xs font-medium" style="color: #00ff0d">
												{formatValue(Number(g.balance))}
											</span>
										{/if}
									</div>
									<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
										<span class="text-muted-foreground flex items-center gap-1 text-xs">
											<HugeiconsIcon icon={CrownIcon} class="text-amber-400 h-3 w-3" />
											@{g.ownerUsername}
										</span>
										<span class="text-muted-foreground text-xs">{g.ownerEmail}</span>
										<span class="text-muted-foreground text-xs">
											{new Date(g.createdAt).toLocaleDateString()}
										</span>
									</div>
									{#if g.description}
										<p class="text-muted-foreground mt-1 line-clamp-1 text-xs">{g.description}</p>
									{/if}
								</div>

								<Button
									size="sm"
									variant="destructive"
									class="shrink-0 gap-1.5"
									onclick={() => {
										disbandTarget = g;
										showDisband = true;
									}}
								>
									<HugeiconsIcon icon={Delete01Icon} class="h-3.5 w-3.5" />
									Disband
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{/if}