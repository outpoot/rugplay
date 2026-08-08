<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
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
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import UserName from '$lib/components/self/UserName.svelte';
	import NewsArticleActions from '$lib/components/self/NewsArticleActions.svelte';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import { NEWS_TYPE_META } from '$lib/data/news-meta';
	import { getPublicUrl } from '$lib/utils';
	import { trackArticlePageDwell } from '$lib/utils/news-dwell';
	import { USER_DATA } from '$lib/stores/user-data';
	import type { NewsArticle } from '$lib/types/news';

	let { data }: { data: { article: NewsArticle } } = $props();

	let article = $state<NewsArticle>(data.article);
	let copied = $state(false);

	// Reading the full article page is the strongest dwell signal the
	// personalization system gets — tracked for as long as this page stays
	// mounted and the tab is focused, flushed on navigate-away/unload.
	onMount(() => trackArticlePageDwell(article.id));
	let shouldSignIn = $state(false);
	let reportDialogOpen = $state(false);
	let reportSubmitting = $state(false);

	let meta = $derived(NEWS_TYPE_META[article.type]);

	function timeAgo(iso: string): string {
		const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function articleUrl(): string {
		return `${window.location.origin}/news/${article.id}`;
	}

	async function handleShare() {
		try {
			await fetch(`/api/news/${article.id}/share`, { method: 'POST' });
		} catch {
			// non-critical, ignore
		}

		if (navigator.share) {
			try {
				await navigator.share({ title: article.headline, text: article.summary, url: articleUrl() });
				return;
			} catch {
				// user cancelled the native share sheet — fall through to copy
			}
		}
		await handleCopyLink(false);
	}

	async function handleCopyLink(showToast = true) {
		try {
			await navigator.clipboard.writeText(articleUrl());
			copied = true;
			if (showToast) toast.success('Link copied to clipboard');
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
			if (showToast) toast.error('Failed to copy link');
		}
	}

	function handleReact(articleId: number, type: 'LIKE' | 'DISLIKE') {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}

		const original = article;
		const wasReaction = original.myReaction;

		let myReaction: 'LIKE' | 'DISLIKE' | null;
		let likesCount = original.likesCount;
		let dislikesCount = original.dislikesCount;

		if (wasReaction === type) {
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

		article = { ...original, myReaction, likesCount, dislikesCount };

		fetch(`/api/news/${articleId}/react`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type })
		}).catch(() => {
			article = original;
			toast.error('Failed to save your reaction');
		});
	}

	function handleReportClick() {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}
		reportDialogOpen = true;
	}

	async function confirmReport() {
		reportSubmitting = true;
		try {
			const response = await fetch(`/api/news/${article.id}/report`, {
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
		}
	}
</script>

<SEO
	title={article.headline}
	description={article.summary}
	type="article"
	image={article.coverImage ? (getPublicUrl(article.coverImage) ?? '/apple-touch-icon.png') : '/apple-touch-icon.png'}
	imageAlt={article.headline}
	twitterCard="summary_large_image"
/>

<div class="container mx-auto max-w-3xl p-4 md:p-6">
	<a
		href="/news"
		class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
	>
		<HugeiconsIcon icon={ArrowLeft01Icon} class="h-4 w-4" />
		Back to News
	</a>

	<Card.Root class="overflow-hidden py-0 gap-0">
		{#if article.coverImage}
			<div class="aspect-[16/8] w-full overflow-hidden bg-muted">
				<img
					src={getPublicUrl(article.coverImage) ?? article.coverImage}
					alt={article.headline}
					class="h-full w-full object-cover"
				/>
			</div>
		{/if}

		<Card.Content class="p-5 md:p-6">
			<div class="mb-3 flex flex-wrap items-center gap-2">
				<Badge variant="outline" class="gap-1 {meta.badgeClass}">
					<HugeiconsIcon icon={meta.icon} class="h-3.5 w-3.5" />
					{meta.label}
				</Badge>
				{#if article.source === 'AI'}
					<Badge variant="outline" class="text-muted-foreground">AI-written</Badge>
				{/if}
				<span class="text-xs text-muted-foreground">{timeAgo(article.createdAt)}</span>
			</div>

			<h1 class="mb-3 text-2xl font-bold leading-tight md:text-3xl">{article.headline}</h1>
			<p class="mb-5 text-base text-muted-foreground">{article.summary}</p>

			{#if article.relatedCoin || article.relatedUser}
				<div class="mb-5 flex items-center gap-2">
					{#if article.relatedCoin}
						<a
							href="/coin/{article.relatedCoin.symbol}"
							class="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
						>
							<CoinIcon icon={article.relatedCoin.icon} symbol={article.relatedCoin.symbol} size={4} />
							*{article.relatedCoin.symbol}
						</a>
					{/if}
					{#if article.relatedUser}
						<a
							href="/user/{article.relatedUser.username}"
							class="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
						>
							<Avatar.Root class="h-4 w-4">
								<Avatar.Image src={article.relatedUser.image ?? undefined} />
								<Avatar.Fallback class="text-[8px]">{article.relatedUser.name.slice(0, 2)}</Avatar.Fallback>
							</Avatar.Root>
							<UserName name={article.relatedUser.name} nameColor={article.relatedUser.nameColor} />
						</a>
					{/if}
				</div>
			{/if}

			<div class="prose prose-sm dark:prose-invert mb-6 max-w-none whitespace-pre-wrap text-sm leading-relaxed">
				{article.body}
			</div>

			<div class="border-t pt-4">
				<NewsArticleActions
					{article}
					onReact={handleReact}
					onReport={handleReportClick}
					{copied}
					onShare={handleShare}
					onCopyLink={() => handleCopyLink()}
				/>
			</div>
		</Card.Content>
	</Card.Root>
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
