<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ThumbsUpIcon,
		ThumbsDownIcon,
		SparklesIcon,
		Settings01Icon,
		Alert02Icon,
		CancelCircleIcon
	} from '@hugeicons/core-free-icons';
	import { LAST_SEEN_VERSION, CHANGELOG_REACTIONS } from '$lib/stores/changelog';
	import { getPublicUrl } from '$lib/utils';
	import type { ChangelogCategory, PublicChangelogRelease } from '$lib/types/changelog';

	let { open = $bindable(false) } = $props<{ open?: boolean }>();

	const CATEGORY_META: Record<
		ChangelogCategory,
		{ label: string; icon: typeof SparklesIcon; badgeClass: string }
	> = {
		NEW: {
			label: 'New',
			icon: SparklesIcon,
			badgeClass: 'bg-green-500/15 text-green-500 border-green-500/30'
		},
		IMPROVED: {
			label: 'Improved',
			icon: Settings01Icon,
			badgeClass: 'bg-blue-500/15 text-blue-500 border-blue-500/30'
		},
		FIXED: {
			label: 'Fixed',
			icon: Alert02Icon,
			badgeClass: 'bg-orange-500/15 text-orange-500 border-orange-500/30'
		},
		REMOVED: {
			label: 'Removed',
			icon: CancelCircleIcon,
			badgeClass: 'bg-red-500/15 text-red-500 border-red-500/30'
		}
	};

	let releases = $state<PublicChangelogRelease[]>([]);
	let isLoading = $state(true);
	let hasLoaded = $state(false);

	async function loadReleases() {
		isLoading = true;
		try {
			const response = await fetch('/api/changelog');
			if (response.ok) {
				const data = await response.json();
				releases = data.releases;
			}
		} catch (err) {
			console.error('Failed to load changelog:', err);
		} finally {
			isLoading = false;
			hasLoaded = true;
			if (releases[0]?.version) {
				LAST_SEEN_VERSION.markSeen(releases[0].version);
			}
		}
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	$effect(() => {
		if (open && !hasLoaded) {
			loadReleases();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex max-h-[80vh] w-full max-w-xl flex-col gap-0 overflow-hidden p-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
	>
		<Dialog.Header class="border-b px-5 py-4">
			<Dialog.Title>What's New</Dialog.Title>
			<Dialog.Description>Recent updates and changes to Rugplay.</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto px-5 py-4">
			{#if isLoading}
				<div class="space-y-5">
					{#each Array(3) as _}
						<Skeleton class="h-20 w-full rounded" />
					{/each}
				</div>
			{:else if releases.length === 0}
				<p class="text-muted-foreground py-8 text-center text-sm">No updates yet.</p>
			{:else}
				<div class="space-y-5">
					{#each releases as release, i (release.id)}
						<div class={i > 0 ? 'border-t pt-5' : ''}>
							<div class="mb-1 flex flex-wrap items-baseline gap-2">
								<span class="text-sm font-semibold">v{release.version}</span>
								{#if release.title}
									<span class="text-sm font-medium">{release.title}</span>
								{/if}
								<span class="text-muted-foreground text-xs">{formatDate(release.releasedAt)}</span>
							</div>

							{#if release.coverImage}
								<img
									src={release.coverImageIsExternal
										? release.coverImage
										: getPublicUrl(release.coverImage)}
									alt={release.title ?? `v${release.version}`}
									class="mb-2 max-h-40 w-full rounded border object-cover"
									loading="lazy"
								/>
							{/if}

							{#if release.summary}
								<p class="text-muted-foreground mb-2 text-sm">{release.summary}</p>
							{/if}

							{#if release.changes.length > 0}
								<ul class="mb-2 space-y-1.5">
									{#each release.changes as change}
										{@const meta = CATEGORY_META[change.category]}
										<li class="flex items-start gap-2 text-sm">
											<Badge
												variant="outline"
												class="mt-0.5 shrink-0 gap-1 text-[10px] {meta.badgeClass}"
											>
												<HugeiconsIcon icon={meta.icon} class="h-3 w-3" />
												{meta.label}
											</Badge>
											<span class="pt-0.5">{change.text}</span>
										</li>
									{/each}
								</ul>
							{/if}

							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-7 gap-1.5 px-2 text-xs {$CHANGELOG_REACTIONS[release.version] === 'LIKE'
										? 'bg-green-500/15 text-green-500'
										: 'text-muted-foreground'}"
									onclick={() => CHANGELOG_REACTIONS.react(release.version, 'LIKE')}
									aria-label="Like this update"
								>
									<HugeiconsIcon
										icon={ThumbsUpIcon}
										class="h-3.5 w-3.5"
										strokeWidth={$CHANGELOG_REACTIONS[release.version] === 'LIKE' ? 2.5 : 1.5}
									/>
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 gap-1.5 px-2 text-xs {$CHANGELOG_REACTIONS[release.version] ===
									'DISLIKE'
										? 'bg-red-500/15 text-red-500'
										: 'text-muted-foreground'}"
									onclick={() => CHANGELOG_REACTIONS.react(release.version, 'DISLIKE')}
									aria-label="Dislike this update"
								>
									<HugeiconsIcon
										icon={ThumbsDownIcon}
										class="h-3.5 w-3.5"
										strokeWidth={$CHANGELOG_REACTIONS[release.version] === 'DISLIKE' ? 2.5 : 1.5}
									/>
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex justify-end border-t px-5 py-3">
			<Dialog.Close>
				{#snippet child({ props }: { props: Record<string, unknown> })}
					<Button {...props} size="sm" variant="secondary">Close</Button>
				{/snippet}
			</Dialog.Close>
		</div>
	</Dialog.Content>
</Dialog.Root>
