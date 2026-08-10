<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { browser } from '$app/environment';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Globe02Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import SEO from '$lib/components/self/SEO.svelte';
	import NewsCard from '$lib/components/self/NewsCard.svelte';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import NewsFeedSkeleton from '$lib/components/self/skeletons/NewsFeedSkeleton.svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { newsPublishedStore } from '$lib/stores/websocket';
	import type { NewsArticle, NewsFeedSort, NewsLayout } from '$lib/types/news';

	const LAYOUT_STORAGE_KEY = 'news-layout';

	let articles = $state<NewsArticle[]>([]);
	let sort = $state<NewsFeedSort>('latest');
	let layout = $state<NewsLayout>('feed');
	let loading = $state(true);
	let loadingMore = $state(false);
	let nextCursor = $state<number | null>(null);
	let shouldSignIn = $state(false);
	let reportDialogOpen = $state(false);
	let reportTargetId = $state<number | null>(null);
	let reportSubmitting = $state(false);
	let hasNewArticles = $derived($newsPublishedStore !== null);

	let loadMoreEl: HTMLDivElement | null = $state(null);
	let observer: IntersectionObserver | null = null;

	onMount(() => {
		// Default to "For You" when logged in, "Latest" when logged out —
		// matches the API's own foryou -> latest degrade for anonymous users.
		sort = $USER_DATA ? 'foryou' : 'latest';

		if (browser) {
			const storedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
			if (storedLayout === 'feed' || storedLayout === 'magazine') {
				layout = storedLayout;
			}
		}

		fetchArticles();

		observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && nextCursor !== null && !loadingMore && !loading) {
					loadMore();
				}
			},
			{ rootMargin: '400px' }
		);

		return () => {
			observer?.disconnect();
		};
	});

	$effect(() => {
		if (loadMoreEl && observer) {
			observer.observe(loadMoreEl);
		}
		return () => {
			if (loadMoreEl && observer) observer.unobserve(loadMoreEl);
		};
	});

	async function fetchArticles() {
		loading = true;
		try {
			const response = await fetch(`/api/news?sort=${sort}`);
			if (response.ok) {
				const result = await response.json();
				articles = result.articles;
				nextCursor = result.nextCursor;
			} else {
				toast.error('Failed to load news feed');
			}
		} catch (e) {
			console.error('Failed to fetch news feed:', e);
			toast.error('Failed to load news feed');
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (nextCursor === null || loadingMore) return;
		loadingMore = true;
		try {
			const response = await fetch(`/api/news?sort=${sort}&cursor=${nextCursor}`);
			if (response.ok) {
				const result = await response.json();
				const existingIds = new Set(articles.map((a) => a.id));
				const fresh = result.articles.filter((a: NewsArticle) => !existingIds.has(a.id));
				articles = [...articles, ...fresh];
				nextCursor = result.nextCursor;
			} else {
				toast.error('Failed to load more articles');
			}
		} catch (e) {
			console.error('Failed to load more news:', e);
			toast.error('Failed to load more articles');
		} finally {
			loadingMore = false;
		}
	}

	function selectSort(newSort: NewsFeedSort) {
		if (newSort === sort) return;
		sort = newSort;
		fetchArticles();
	}

	function selectLayout(newLayout: NewsLayout) {
		if (newLayout === layout) return;
		layout = newLayout;
		if (browser) {
			localStorage.setItem(LAYOUT_STORAGE_KEY, newLayout);
		}
	}

	function handleReact(articleId: number, type: 'LIKE' | 'DISLIKE') {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}

		const index = articles.findIndex((a) => a.id === articleId);
		if (index === -1) return;

		const original = articles[index];
		const wasReaction = original.myReaction;

		let myReaction: 'LIKE' | 'DISLIKE' | null;
		let likesCount = original.likesCount;
		let dislikesCount = original.dislikesCount;

		if (wasReaction === type) {
			// Toggling off.
			myReaction = null;
			if (type === 'LIKE') likesCount = Math.max(0, likesCount - 1);
			else dislikesCount = Math.max(0, dislikesCount - 1);
		} else {
			myReaction = type;
			if (wasReaction === 'LIKE') likesCount = Math.max(0, likesCount - 1);
			if (wasReaction === 'DISLIKE') dislikesCount = Math.max(0, dislikesCount - 1);
			if (type === 'LIKE') likesCount += 1;
			else dislikesCount += 1;
		}

		articles[index] = { ...original, myReaction, likesCount, dislikesCount };

		fetch(`/api/news/${articleId}/react`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type })
		}).catch(() => {
			articles[index] = original;
			toast.error('Failed to save your reaction');
		});
	}

	function handleReport(articleId: number) {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}
		reportTargetId = articleId;
		reportDialogOpen = true;
	}

	async function confirmReport() {
		if (reportTargetId === null) return;
		reportSubmitting = true;
		try {
			const response = await fetch(`/api/news/${reportTargetId}/report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});

			if (response.ok) {
				toast.success('Article reported');
				reportDialogOpen = false;
			} else if (response.status === 409) {
				const result = await response.json().catch(() => ({}));
				toast.error(result.message || 'You already reported this article');
				reportDialogOpen = false;
			} else {
				toast.error('Failed to report article');
			}
		} catch (e) {
			console.error('Failed to report article:', e);
			toast.error('Failed to report article');
		} finally {
			reportSubmitting = false;
			reportTargetId = null;
		}
	}

	function loadNewArticles() {
		newsPublishedStore.set(null);
		fetchArticles();
	}
</script>

<SEO
	title="News - Rugplay"
	description="Live news covering coin pumps, rug pulls, hopium question resolutions, whale trades, and more across the Rugplay simulation game."
	keywords="crypto news, rug pull news, trading news, simulation game news"
/>

<div class="container mx-auto max-w-4xl p-4 md:p-6">
	<header class="mb-6">
		<div class="mb-4 flex items-center gap-2">
			<HugeiconsIcon icon={Globe02Icon} class="h-7 w-7 text-primary" />
			<h1 class="text-2xl font-bold md:text-3xl">News</h1>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap gap-2">
				<Button
					variant={sort === 'foryou' ? 'default' : 'outline'}
					size="sm"
					onclick={() => selectSort('foryou')}
				>
					For You
				</Button>
				<Button
					variant={sort === 'latest' ? 'default' : 'outline'}
					size="sm"
					onclick={() => selectSort('latest')}
				>
					Latest
				</Button>
				<Button
					variant={sort === 'trending' ? 'default' : 'outline'}
					size="sm"
					onclick={() => selectSort('trending')}
				>
					Trending
				</Button>
			</div>

			<div class="flex gap-1 rounded-md border p-1">
				<Button
					variant={layout === 'feed' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-7 px-3 text-xs"
					onclick={() => selectLayout('feed')}
					aria-label="Feed layout"
				>
					Feed
				</Button>
				<Button
					variant={layout === 'magazine' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-7 px-3 text-xs"
					onclick={() => selectLayout('magazine')}
					aria-label="Magazine layout"
				>
					Magazine
				</Button>
			</div>
		</div>
	</header>

	{#if hasNewArticles}
		<button
			type="button"
			class="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
			onclick={loadNewArticles}
		>
			<HugeiconsIcon icon={ArrowDown01Icon} class="h-4 w-4" />
			New article available — click to load
		</button>
	{/if}

	{#if loading}
		<NewsFeedSkeleton {layout} />
	{:else if articles.length === 0}
		<div class="flex h-72 flex-col items-center justify-center text-center">
			<HugeiconsIcon icon={Globe02Icon} class="mb-4 h-10 w-10 text-muted-foreground" />
			<h2 class="mb-1 text-lg font-semibold">No news yet</h2>
			<p class="text-sm text-muted-foreground">
				Check back soon — articles appear here as things happen on Rugplay.
			</p>
		</div>
	{:else if layout === 'magazine'}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each articles as article (article.id)}
				<NewsCard {article} {layout} onReact={handleReact} onReport={handleReport} />
			{/each}
		</div>
	{:else}
		<div class="space-y-3">
			{#each articles as article (article.id)}
				<NewsCard {article} {layout} onReact={handleReact} onReport={handleReport} />
			{/each}
		</div>
	{/if}

	{#if !loading && nextCursor !== null}
		<div bind:this={loadMoreEl} class="flex justify-center py-6">
			{#if loadingMore}
				<span class="text-sm text-muted-foreground">Loading more...</span>
			{:else}
				<Button variant="outline" size="sm" onclick={loadMore}>Load more</Button>
			{/if}
		</div>
	{/if}
</div>

<SignInConfirmDialog bind:open={shouldSignIn} />

<Dialog bind:open={reportDialogOpen}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Report this article?</DialogTitle>
			<DialogDescription>
				This will flag the article for review. Articles that receive enough reports are
				automatically hidden pending moderation.
			</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={() => (reportDialogOpen = false)} disabled={reportSubmitting}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={confirmReport} disabled={reportSubmitting}>
				{reportSubmitting ? 'Reporting...' : 'Report'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
