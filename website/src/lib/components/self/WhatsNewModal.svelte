<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ThumbsUpIcon,
		ThumbsDownIcon,
		SparklesIcon,
		Settings01Icon,
		Alert02Icon,
		CancelCircleIcon
	} from '@hugeicons/core-free-icons';
	import { CHANGELOG, type ChangeCategory } from '$lib/data/changelog';
	import { LAST_SEEN_VERSION, CHANGELOG_REACTIONS } from '$lib/stores/changelog';

	let { open = $bindable(false) } = $props<{ open?: boolean }>();

	const CATEGORY_META: Record<
		ChangeCategory,
		{ label: string; icon: typeof SparklesIcon; badgeClass: string }
	> = {
		new: {
			label: 'New',
			icon: SparklesIcon,
			badgeClass: 'bg-green-500/15 text-green-500 border-green-500/30'
		},
		improved: {
			label: 'Improved',
			icon: Settings01Icon,
			badgeClass: 'bg-blue-500/15 text-blue-500 border-blue-500/30'
		},
		fixed: {
			label: 'Fixed',
			icon: Alert02Icon,
			badgeClass: 'bg-orange-500/15 text-orange-500 border-orange-500/30'
		},
		removed: {
			label: 'Removed',
			icon: CancelCircleIcon,
			badgeClass: 'bg-red-500/15 text-red-500 border-red-500/30'
		}
	};

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	$effect(() => {
		if (open) {
			LAST_SEEN_VERSION.markSeen();
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
			<div class="space-y-5">
				{#each CHANGELOG as release, i (release.version)}
					<div class={i > 0 ? 'border-t pt-5' : ''}>
						<div class="mb-1 flex flex-wrap items-baseline gap-2">
							<span class="text-sm font-semibold">v{release.version}</span>
							{#if release.title}
								<span class="text-sm font-medium">{release.title}</span>
							{/if}
							<span class="text-muted-foreground text-xs">{formatDate(release.date)}</span>
						</div>

						{#if release.summary}
							<p class="text-muted-foreground mb-2 text-sm">{release.summary}</p>
						{/if}

						<ul class="mb-2 space-y-1.5">
							{#each release.changes as change}
								{@const meta = CATEGORY_META[change.category]}
								<li class="flex items-start gap-2 text-sm">
									<Badge variant="outline" class="mt-0.5 shrink-0 gap-1 text-[10px] {meta.badgeClass}">
										<HugeiconsIcon icon={meta.icon} class="h-3 w-3" />
										{meta.label}
									</Badge>
									<span class="pt-0.5">{change.text}</span>
								</li>
							{/each}
						</ul>

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
								class="h-7 gap-1.5 px-2 text-xs {$CHANGELOG_REACTIONS[release.version] === 'DISLIKE'
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
