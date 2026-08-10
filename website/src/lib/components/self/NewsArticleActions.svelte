<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ThumbsUpIcon,
		ThumbsDownIcon,
		Share08Icon,
		Link01Icon,
		Alert02Icon,
		Tick01Icon
	} from '@hugeicons/core-free-icons';
	import type { NewsArticle } from '$lib/types/news';

	let {
		article,
		onReact,
		onReport,
		onShare,
		onCopyLink,
		copied = false,
		compact = false
	}: {
		article: NewsArticle;
		onReact: (articleId: number, type: 'LIKE' | 'DISLIKE') => void;
		onReport: () => void;
		onShare: () => void;
		onCopyLink: () => void;
		copied?: boolean;
		compact?: boolean;
	} = $props();

	const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
	const buttonSize = compact ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-sm';
</script>

<div class="flex flex-wrap items-center gap-1">
	<Button
		variant="ghost"
		size="sm"
		class="{buttonSize} gap-1.5 {article.myReaction === 'LIKE' ? 'text-green-500' : 'text-muted-foreground'}"
		onclick={() => onReact(article.id, 'LIKE')}
		aria-label="Like"
	>
		<HugeiconsIcon icon={ThumbsUpIcon} class={iconSize} />
		{article.likesCount}
	</Button>

	<Button
		variant="ghost"
		size="sm"
		class="{buttonSize} gap-1.5 {article.myReaction === 'DISLIKE' ? 'text-red-500' : 'text-muted-foreground'}"
		onclick={() => onReact(article.id, 'DISLIKE')}
		aria-label="Dislike"
	>
		<HugeiconsIcon icon={ThumbsDownIcon} class={iconSize} />
		{article.dislikesCount}
	</Button>

	<Button
		variant="ghost"
		size="sm"
		class="{buttonSize} gap-1.5 text-muted-foreground"
		onclick={onShare}
		aria-label="Share"
	>
		<HugeiconsIcon icon={Share08Icon} class={iconSize} />
		{#if !compact}Share{/if}
	</Button>

	<Button
		variant="ghost"
		size="sm"
		class="{buttonSize} gap-1.5 text-muted-foreground"
		onclick={onCopyLink}
		aria-label="Copy link"
	>
		<HugeiconsIcon icon={copied ? Tick01Icon : Link01Icon} class={iconSize} />
		{#if !compact}{copied ? 'Copied' : 'Copy link'}{/if}
	</Button>

	<Button
		variant="ghost"
		size="sm"
		class="{buttonSize} gap-1.5 ml-auto text-muted-foreground hover:text-red-500"
		onclick={onReport}
		aria-label="Report"
	>
		<HugeiconsIcon icon={Alert02Icon} class={iconSize} />
		{#if !compact}Report{/if}
	</Button>
</div>
