<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { getPublicUrl } from '$lib/utils';
	import CoinIcon from './CoinIcon.svelte';
	import UserName from './UserName.svelte';
	import NewsArticleActions from './NewsArticleActions.svelte';
	import { NEWS_TYPE_META } from '$lib/data/news-meta';
	import type { NewsArticle } from '$lib/types/news';

	let {
		article,
		layout = 'feed',
		onReact,
		onReport
	}: {
		article: NewsArticle;
		layout?: 'feed' | 'magazine';
		onReact: (articleId: number, type: 'LIKE' | 'DISLIKE') => void;
		onReport: (articleId: number) => void;
	} = $props();

	let copied = $state(false);
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

	function handleReportClick() {
		onReport(article.id);
	}

	function openArticle() {
		goto(`/news/${article.id}`);
	}
</script>

{#if layout === 'magazine'}
	<Card.Root class="overflow-hidden py-0 gap-0 transition-shadow hover:shadow-lg">
		{#if article.coverImage}
			<button
				type="button"
				class="block w-full aspect-[16/8] overflow-hidden bg-muted"
				onclick={openArticle}
			>
				<img
					src={getPublicUrl(article.coverImage) ?? article.coverImage}
					alt={article.headline}
					class="h-full w-full object-cover transition-transform hover:scale-105"
					loading="lazy"
				/>
			</button>
		{/if}

		<Card.Content class="p-5">
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

			<button type="button" class="text-left" onclick={openArticle}>
				<h3 class="mb-2 text-xl font-bold leading-tight hover:underline">{article.headline}</h3>
			</button>
			<p class="mb-3 text-sm text-muted-foreground">{article.summary}</p>

			{#if article.relatedCoin || article.relatedUser}
				<div class="mb-4 flex items-center gap-2">
					{#if article.relatedCoin}
						<a
							href="/coin/{article.relatedCoin.symbol}"
							class="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
						>
							<CoinIcon
								icon={article.relatedCoin.icon}
								symbol={article.relatedCoin.symbol}
								size={4}
							/>
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
								<Avatar.Fallback class="text-[8px]"
									>{article.relatedUser.name.slice(0, 2)}</Avatar.Fallback
								>
							</Avatar.Root>
							<UserName name={article.relatedUser.name} nameColor={article.relatedUser.nameColor} />
						</a>
					{/if}
				</div>
			{/if}

			<NewsArticleActions
				{article}
				{onReact}
				onReport={handleReportClick}
				{copied}
				onShare={handleShare}
				onCopyLink={() => handleCopyLink()}
			/>
		</Card.Content>
	</Card.Root>
{:else}
	<Card.Root class="overflow-hidden py-0 gap-0 transition-shadow hover:shadow-md">
		<div class="flex gap-3 p-3 sm:gap-4 sm:p-4">
			{#if article.coverImage}
				<button
					type="button"
					class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24"
					onclick={openArticle}
				>
					<img
						src={getPublicUrl(article.coverImage) ?? article.coverImage}
						alt={article.headline}
						class="h-full w-full object-cover"
						loading="lazy"
					/>
				</button>
			{/if}

			<div class="min-w-0 flex-1">
				<div class="mb-1.5 flex flex-wrap items-center gap-1.5">
					<Badge variant="outline" class="gap-1 text-[10px] {meta.badgeClass}">
						<HugeiconsIcon icon={meta.icon} class="h-3 w-3" />
						{meta.label}
					</Badge>
					<span class="text-xs text-muted-foreground">{timeAgo(article.createdAt)}</span>
				</div>

				<button type="button" class="text-left" onclick={openArticle}>
					<h3 class="mb-1 line-clamp-2 text-sm font-semibold leading-snug hover:underline sm:text-base">
						{article.headline}
					</h3>
				</button>
				<p class="mb-2 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{article.summary}</p>

				<NewsArticleActions
					{article}
					{onReact}
					onReport={handleReportClick}
					{copied}
					onShare={handleShare}
					onCopyLink={() => handleCopyLink()}
					compact
				/>
			</div>
		</div>
	</Card.Root>
{/if}
