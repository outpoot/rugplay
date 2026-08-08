<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Add01Icon, StarIcon, ImageAdd01Icon } from '@hugeicons/core-free-icons';
	import { USER_DATA } from '$lib/stores/user-data';
	import { getPublicUrl } from '$lib/utils';
	import ChangelogEditorModal from '$lib/components/self/ChangelogEditorModal.svelte';
	import type { AdminChangelogRelease } from '$lib/types/changelog';

	const CATEGORY_BADGE_CLASS: Record<string, string> = {
		NEW: 'bg-green-500/15 text-green-500 border-green-500/30',
		IMPROVED: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
		FIXED: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
		REMOVED: 'bg-red-500/15 text-red-500 border-red-500/30'
	};

	let releases = $state<AdminChangelogRelease[]>([]);
	let isLoading = $state(true);
	let showEditor = $state(false);
	let editingRelease = $state<AdminChangelogRelease | null>(null);

	async function loadReleases() {
		isLoading = true;
		try {
			const response = await fetch('/api/admin/changelog');
			if (response.ok) {
				const data = await response.json();
				releases = data.releases;
			}
		} catch (err) {
			console.error('Failed to load changelog releases:', err);
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		editingRelease = null;
		showEditor = true;
	}

	function openEdit(release: AdminChangelogRelease) {
		editingRelease = release;
		showEditor = true;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	$effect(() => {
		if ($USER_DATA?.isAdmin) {
			loadReleases();
		}
	});
</script>

<svelte:head>
	<title>Edit Changelogs - Admin | Rugplay</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !$USER_DATA || !$USER_DATA.isAdmin}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold">Access Denied</h1>
			<p class="text-muted-foreground">You don't have permission to access this page.</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto max-w-3xl space-y-4 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<HugeiconsIcon icon={StarIcon} class="h-5 w-5" />
				<h1 class="text-2xl font-bold">Edit Changelogs</h1>
			</div>
			<Button size="sm" onclick={openCreate}>
				<HugeiconsIcon icon={Add01Icon} class="h-4 w-4" />
				New entry
			</Button>
		</div>

		{#if isLoading}
			<div class="space-y-3">
				{#each Array(3) as _}
					<Skeleton class="h-24 w-full rounded-lg" />
				{/each}
			</div>
		{:else if releases.length === 0}
			<Card>
				<CardContent class="text-muted-foreground py-10 text-center text-sm">
					No changelog entries yet. Click "New entry" to publish the first one.
				</CardContent>
			</Card>
		{:else}
			<div class="space-y-3">
				{#each releases as release (release.id)}
					<button type="button" onclick={() => openEdit(release)} class="block w-full text-left">
						<Card class="hover:bg-muted/50 transition-colors">
							<CardHeader class="pb-2">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										<CardTitle class="flex flex-wrap items-center gap-2 text-base">
											<span class="font-mono">v{release.version}</span>
											{#if release.title}
												<span class="truncate font-normal">{release.title}</span>
											{/if}
										</CardTitle>
										<CardDescription>{formatDate(release.releasedAt)}</CardDescription>
									</div>
									{#if release.coverImage}
										<HugeiconsIcon
											icon={ImageAdd01Icon}
											class="text-muted-foreground h-4 w-4 shrink-0"
										/>
									{/if}
								</div>
							</CardHeader>
							<CardContent class="pt-0">
								{#if release.summary}
									<p class="text-muted-foreground mb-2 text-sm">{release.summary}</p>
								{/if}
								<div class="flex flex-wrap gap-1">
									{#each release.changes.slice(0, 6) as change}
										<Badge
											variant="outline"
											class="text-[10px] {CATEGORY_BADGE_CLASS[change.category]}"
										>
											{change.category}
										</Badge>
									{/each}
									{#if release.changes.length > 6}
										<Badge variant="outline" class="text-[10px]">
											+{release.changes.length - 6} more
										</Badge>
									{/if}
									{#if release.changes.length === 0}
										<span class="text-muted-foreground text-xs">No change entries yet</span>
									{/if}
								</div>
							</CardContent>
						</Card>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<ChangelogEditorModal bind:open={showEditor} release={editingRelease} onSaved={loadReleases} />
