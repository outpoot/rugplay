<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Notification01Icon,
		Copy01Icon,
		Tick01Icon,
		ArrowDown01Icon,
		SparklesIcon,
		Settings01Icon,
		Alert02Icon,
		CancelCircleIcon,
		Fire02Icon,
		SkullIcon,
		Rocket01Icon
	} from '@hugeicons/core-free-icons';
	import { CHANGELOG, type ChangeCategory } from '$lib/data/changelog';
	import { LAST_SEEN_VERSION, CHANGELOG_REACTIONS, type ReactionKey } from '$lib/stores/changelog';
	import { onMount } from 'svelte';

	let { open = $bindable(false) } = $props<{ open?: boolean }>();

	const CATEGORY_META: Record<
		ChangeCategory,
		{ label: string; icon: typeof SparklesIcon; badgeClass: string; dotClass: string }
	> = {
		new: {
			label: 'New',
			icon: SparklesIcon,
			badgeClass: 'border-green-500/40 bg-green-500/10 text-green-500',
			dotClass: 'bg-green-500'
		},
		improved: {
			label: 'Improved',
			icon: Settings01Icon,
			badgeClass: 'border-blue-500/40 bg-blue-500/10 text-blue-500',
			dotClass: 'bg-blue-500'
		},
		fixed: {
			label: 'Fixed',
			icon: Alert02Icon,
			badgeClass: 'border-orange-500/40 bg-orange-500/10 text-orange-500',
			dotClass: 'bg-orange-500'
		},
		removed: {
			label: 'Removed',
			icon: CancelCircleIcon,
			badgeClass: 'border-red-500/40 bg-red-500/10 text-red-500',
			dotClass: 'bg-red-500'
		}
	};

	const FILTERS: { key: 'all' | ChangeCategory; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'new', label: 'New' },
		{ key: 'improved', label: 'Improved' },
		{ key: 'fixed', label: 'Fixed' }
	];

	const REACTION_META: { key: ReactionKey; icon: typeof Fire02Icon; label: string }[] = [
		{ key: 'fire', icon: Fire02Icon, label: 'Fire' },
		{ key: 'rocket', icon: Rocket01Icon, label: 'To the moon' },
		{ key: 'skull', icon: SkullIcon, label: 'Rugged' }
	];

	let activeFilter = $state<'all' | ChangeCategory>('all');
	let query = $state('');
	let expanded = $state<Set<string>>(new Set([CHANGELOG[0]?.version]));
	let copiedVersion = $state<string | null>(null);

	onMount(() => {
		// Deep-link support: /?update=2.3.0 auto-expands and scrolls to that version
		const params = new URLSearchParams(window.location.search);
		const target = params.get('update');
		if (target) {
			expanded.add(target);
			expanded = new Set(expanded);
		}
	});

	$effect(() => {
		if (open) {
			LAST_SEEN_VERSION.markSeen();
		}
	});

	function toggleExpanded(version: string) {
		if (expanded.has(version)) {
			expanded.delete(version);
		} else {
			expanded.add(version);
		}
		expanded = new Set(expanded);
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Flavor "ticker" percentage: purely cosmetic, derived from the mix of new vs fixed items
	function tickerValue(release: (typeof CHANGELOG)[number]): { pct: string; positive: boolean } {
		const newCount = release.changes.filter((c) => c.category === 'new').length;
		const fixedCount = release.changes.filter((c) => c.category === 'fixed').length;
		const removedCount = release.changes.filter((c) => c.category === 'removed').length;
		const score = newCount * 12 + release.changes.length * 3 - removedCount * 8;
		const positive = score >= fixedCount * 2;
		return { pct: `${positive ? '+' : '-'}${Math.abs(score)}%`, positive };
	}

	function filteredReleases() {
		const q = query.trim().toLowerCase();
		return CHANGELOG.map((release) => {
			const changes = release.changes.filter((c) => {
				const matchesFilter = activeFilter === 'all' || c.category === activeFilter;
				const matchesQuery =
					!q ||
					c.text.toLowerCase().includes(q) ||
					release.version.includes(q) ||
					release.title?.toLowerCase().includes(q);
				return matchesFilter && matchesQuery;
			});
			return { release, changes };
		}).filter(({ changes }) => changes.length > 0);
	}

	async function copyLink(version: string) {
		const url = new URL(window.location.href);
		url.searchParams.set('update', version);
		try {
			await navigator.clipboard.writeText(url.toString());
			copiedVersion = version;
			setTimeout(() => {
				if (copiedVersion === version) copiedVersion = null;
			}, 1500);
		} catch {
			// clipboard unavailable, ignore silently
		}
	}

	function reactionCount(version: string, key: ReactionKey): number {
		return $CHANGELOG_REACTIONS[version]?.[key] ?? 0;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
		<!-- Header: ticker-tape style banner -->
		<div class="border-b bg-gradient-to-r from-green-500/10 via-transparent to-red-500/10 px-6 py-5">
			<Dialog.Header class="gap-1">
				<Dialog.Title class="flex items-center gap-2 text-lg">
					<HugeiconsIcon icon={Notification01Icon} class="text-primary h-5 w-5" />
					What's New
					<Badge variant="outline" class="ml-1 font-mono text-[10px]">RUG REPORT</Badge>
				</Dialog.Title>
				<Dialog.Description>
					Every listing, every rug, every fix — straight from the Rugplay dev pool.
				</Dialog.Description>
			</Dialog.Header>

			<!-- Search -->
			<div class="relative mt-3">
				<Input bind:value={query} placeholder="Search updates..." class="h-8 text-sm" />
			</div>

			<!-- Filter pills -->
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each FILTERS as filter}
					<button
						onclick={() => (activeFilter = filter.key)}
						class="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors {activeFilter ===
						filter.key
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border bg-background hover:bg-accent'}"
					>
						{filter.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Body: scrollable list of "listed coin" release cards -->
		<div class="flex-1 overflow-y-auto px-6 py-4">
			{#if filteredReleases().length === 0}
				<div class="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
					No updates match "{query}"
				</div>
			{:else}
				<div class="space-y-3">
					{#each filteredReleases() as { release, changes } (release.version)}
						{@const ticker = tickerValue(release)}
						{@const isOpen = expanded.has(release.version)}
						<div class="rounded-lg border" id={`update-${release.version}`}>
							<!-- "Listed coin" row header -->
							<button
								onclick={() => toggleExpanded(release.version)}
								class="hover:bg-muted/50 flex w-full items-center gap-3 rounded-t-lg px-3 py-2.5 text-left transition-colors"
							>
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-green-500/20 to-red-500/20 font-mono text-[10px] font-bold"
								>
									${release.version.split('.')[0]}.{release.version.split('.')[1]}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span class="font-mono text-sm font-semibold">${release.version}</span>
										{#if release.title}
											<span class="truncate text-sm font-medium">{release.title}</span>
										{/if}
									</div>
									<div class="text-muted-foreground text-xs">{formatDate(release.date)}</div>
								</div>
								<Badge
									variant="outline"
									class={`font-mono text-xs ${ticker.positive ? 'border-green-500/40 text-green-500' : 'border-red-500/40 text-red-500'}`}
								>
									{ticker.pct}
								</Badge>
								<HugeiconsIcon
									icon={ArrowDown01Icon}
									class={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
								/>
							</button>

							{#if isOpen}
								<div class="space-y-3 border-t px-3 py-3">
									{#if release.summary}
										<p class="text-muted-foreground text-sm italic">{release.summary}</p>
									{/if}

									<ul class="space-y-1.5">
										{#each changes as change}
											{@const meta = CATEGORY_META[change.category]}
											<li class="flex items-start gap-2 text-sm">
												<Badge variant="outline" class={`mt-0.5 shrink-0 gap-1 ${meta.badgeClass}`}>
													<HugeiconsIcon icon={meta.icon} class="h-3 w-3" />
													{meta.label}
												</Badge>
												<span class="pt-0.5">{change.text}</span>
											</li>
										{/each}
									</ul>

									<!-- Footer row: reactions + copy link -->
									<div class="flex items-center justify-between border-t pt-2.5">
										<div class="flex items-center gap-1">
											{#each REACTION_META as r}
												<button
													onclick={() => CHANGELOG_REACTIONS.react(release.version, r.key)}
													title={r.label}
													class="hover:bg-muted flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors"
												>
													<HugeiconsIcon icon={r.icon} class="h-3 w-3" />
													<span class="font-mono">{reactionCount(release.version, r.key)}</span>
												</button>
											{/each}
										</div>
										<button
											onclick={() => copyLink(release.version)}
											class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
										>
											{#if copiedVersion === release.version}
												<HugeiconsIcon icon={Tick01Icon} class="h-3 w-3 text-green-500" />
												Copied
											{:else}
												<HugeiconsIcon icon={Copy01Icon} class="h-3 w-3" />
												Copy link
											{/if}
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-between border-t px-6 py-3">
			<span class="text-muted-foreground text-xs">
				{CHANGELOG.length} releases tracked
			</span>
			<Dialog.Close>
				{#snippet child({ props }: { props: Record<string, unknown> })}
					<Button {...props} size="sm" variant="secondary">Close</Button>
				{/snippet}
			</Dialog.Close>
		</div>
	</Dialog.Content>
</Dialog.Root>
