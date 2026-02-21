<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { Badge } from '$lib/components/ui/badge';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Message01Icon,
		SentIcon,
		Loading03Icon,
		FavouriteIcon
	} from '@hugeicons/core-free-icons';
	import { USER_DATA } from '$lib/stores/user-data';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { formatTimeAgo, getPublicUrl } from '$lib/utils';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import UserName from '$lib/components/self/UserName.svelte';
	import { websocketController } from '$lib/stores/websocket';

	const { coinSymbol } = $props<{ coinSymbol: string }>();
	import type { Comment } from '$lib/types/comment';
	let comments = $state<Comment[]>([]);
	let newComment = $state('');
	let isSubmitting = $state(false);
	let isLoading = $state(true);
	let shouldSignIn = $state(false);
	let expandedComments = $state(new Set<number>());

	const MAX_COMMENTS = 50;
	const MAX_LINES_PREVIEW = 3;

	$effect(() => {
		websocketController.setCoin(coinSymbol);
		websocketController.subscribeToComments(coinSymbol, handleWebSocketMessage);

		return () => {
			websocketController.unsubscribeFromComments(coinSymbol);
		};
	});

	function handleWebSocketMessage(message: { type: string; data?: any }) {
		switch (message.type) {
			case 'new_comment':
				// check if comment already exists
				const commentExists = comments.some((c) => c.id === message.data.id);
				if (!commentExists) {
					comments = [message.data, ...comments.slice(0, MAX_COMMENTS - 1)];
				}
				break;
			case 'comment_liked':
				const commentIndex = comments.findIndex((c) => c.id === message.data.commentId);
				if (commentIndex !== -1) {
					comments[commentIndex] = {
						...comments[commentIndex],
						likesCount: message.data.likesCount,
						isLikedByUser:
							message.data.userId === Number($USER_DATA?.id)
								? message.data.isLikedByUser
								: comments[commentIndex].isLikedByUser
					};
				}
				break;
		}
	}

	async function loadComments() {
		try {
			const response = await fetch(`/api/coin/${coinSymbol}/comments`);
			if (response.ok) {
				const result = await response.json();
				comments = result.comments.slice(0, MAX_COMMENTS);
			}
		} catch (e) {
			console.error('Failed to load comments:', e);
		} finally {
			isLoading = false;
		}
	}

	async function submitComment() {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}

		if (!newComment.trim()) return;

		isSubmitting = true;
		try {
			const response = await fetch(`/api/coin/${coinSymbol}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: newComment.trim() })
			});

			if (response.ok) {
				const result = await response.json();
				// check if comment already exists (from ws) before adding
				const commentExists = comments.some((c) => c.id === result.comment.id);
				if (!commentExists) {
					comments = [result.comment, ...comments.slice(0, MAX_COMMENTS - 1)];
				}
				newComment = '';
			} else {
				const error = await response.json();
				toast.error(error.message || 'Failed to post comment');
			}
		} catch (e) {
			toast.error('Failed to post comment');
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			submitComment();
		}
	}
	async function toggleLike(commentId: number) {
		if (!$USER_DATA) {
			goto('/');
			return;
		}

		const commentIndex = comments.findIndex((c) => c.id === commentId);
		if (commentIndex === -1) return;

		const comment = comments[commentIndex];
		const wasLiked = comment.isLikedByUser;

		comments[commentIndex] = {
			...comment,
			isLikedByUser: !wasLiked,
			likesCount: wasLiked ? comment.likesCount - 1 : comment.likesCount + 1
		};

		fetch(`/api/coin/${coinSymbol}/comments/${commentId}/like`, {
			method: wasLiked ? 'DELETE' : 'POST',
			headers: { 'Content-Type': 'application/json' }
		}).catch(() => {
			comments[commentIndex] = comment;
		});
	}

	function handleLikeClick(commentId: number) {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}
		toggleLike(commentId);
	}

	function toggleCommentExpansion(commentId: number) {
		if (expandedComments.has(commentId)) {
			expandedComments.delete(commentId);
		} else {
			expandedComments.add(commentId);
		}
		expandedComments = new Set(expandedComments);
	}

	function shouldTruncateComment(content: string): boolean {
		const lines = content.split('\n');
		return lines.length > MAX_LINES_PREVIEW;
	}

	function getTruncatedContent(content: string): string {
		const lines = content.split('\n');
		return lines.slice(0, MAX_LINES_PREVIEW).join('\n');
	}

	$effect(() => {
		loadComments();
	});
</script>

<SignInConfirmDialog bind:open={shouldSignIn} />

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<HugeiconsIcon icon={Message01Icon} class="h-5 w-5" />
			Comments ({comments.length})
		</Card.Title>
	</Card.Header>
	<Card.Content class="space-y-4">
		<!-- Comment Form -->
		{#if $USER_DATA}
			<div class="space-y-3">
				<div class="relative">
					<Textarea
						bind:value={newComment}
						placeholder="Share your thoughts about this coin..."
						class="min-h-[80px] w-full break-words pb-8 pr-20"
						style="word-break: break-word; overflow-wrap: break-word;"
						maxlength={500}
						onkeydown={handleKeydown}
					/>
					<kbd
						class="bg-muted pointer-events-none absolute bottom-2 right-2 hidden h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-70 sm:flex"
					>
						<span class="text-xs">⌘</span>Enter
					</kbd>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground text-xs">
						{newComment.length}/500 characters
					</span>
					<Button onclick={submitComment} disabled={!newComment.trim() || isSubmitting} size="sm">
						{#if isSubmitting}
							<HugeiconsIcon icon={Loading03Icon} class="h-4 w-4 animate-spin" />
							Posting...
						{:else}
							<HugeiconsIcon icon={SentIcon} class="h-4 w-4" />
							Post
						{/if}
					</Button>
				</div>
			</div>
		{:else}
			<div class="text-center">
				<p class="text-muted-foreground mb-3 text-sm">Sign in to join the discussion</p>
				<Button onclick={() => (shouldSignIn = true)} size="sm">Sign In</Button>
			</div>
		{/if}

		<!-- Comments List -->
		{#if isLoading}
			<div class="text-center">
				<HugeiconsIcon icon={Loading03Icon} class="mx-auto h-6 w-6 animate-spin" />
			</div>
		{:else if comments.length === 0}
			<div class="text-center">
				<p class="text-muted-foreground mt-2 text-sm">
					No comments yet. Be the first to share your thoughts!
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each comments as comment (comment.id)}
					{@const isExpanded = expandedComments.has(comment.id)}
					{@const shouldTruncate = shouldTruncateComment(comment.content)}
					{@const displayContent =
						shouldTruncate && !isExpanded ? getTruncatedContent(comment.content) : comment.content}

					<div class="border-border border-b pb-4 last:border-b-0">
						<div class="flex items-start gap-3">
							<button onclick={() => goto(`/user/${comment.userUsername}`)} class="cursor-pointer">
								<Avatar.Root class="h-8 w-8">
									<Avatar.Image src={getPublicUrl(comment.userImage)} alt={comment.userName} />
									<Avatar.Fallback>{comment.userName?.charAt(0) || '?'}</Avatar.Fallback>
								</Avatar.Root>
							</button>
							<div class="flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<HoverCard.Root>
										<HoverCard.Trigger
											class="min-w-0 max-w-[120px] flex-shrink cursor-pointer text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8 sm:max-w-[180px] sm:text-base"
											onclick={() => goto(`/user/${comment.userUsername}`)}
										>
											<span class="block truncate"><UserName name={comment.userName} nameColor={comment.userNameColor} /></span>
										</HoverCard.Trigger>
										<HoverCard.Content class="w-80" side="top" sideOffset={3}>
											<UserProfilePreview userId={comment.userId} />
										</HoverCard.Content>
									</HoverCard.Root>
									<button
										onclick={() => goto(`/user/${comment.userUsername}`)}
										class="max-w-[80px] flex-shrink-0 cursor-pointer sm:max-w-none"
									>
										<Badge variant="outline" class="w-full justify-start text-xs">
											<span class="truncate">@{comment.userUsername}</span>
										</Badge>
									</button>
									<span class="text-muted-foreground flex-shrink-0 whitespace-nowrap text-xs">
										{formatTimeAgo(comment.createdAt)}
									</span>
								</div>
								<div class="space-y-1">
									<p
										class="whitespace-pre-wrap break-words text-sm leading-relaxed"
										style="word-break: break-word; overflow-wrap: break-word;"
									>
										{displayContent}
									</p>

									{#if shouldTruncate}
										<button
											onclick={() => toggleCommentExpansion(comment.id)}
											class="text-primary hover:text-primary/80 cursor-pointer text-xs font-medium transition-colors hover:underline"
										>
											{isExpanded ? 'Read less' : 'Read more...'}
										</button>
									{/if}
								</div>
							</div>
							<div class="flex items-center">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleLikeClick(comment.id)}
									class="flex h-auto items-center gap-1 p-2 {comment.isLikedByUser
										? 'text-red-500 hover:text-red-600'
										: 'text-muted-foreground hover:text-foreground'}"
								>
									<HugeiconsIcon icon={FavouriteIcon} class="h-4 w-4 {comment.isLikedByUser ? 'fill-current' : ''}" />
									{#if comment.likesCount > 0}
										<span class="text-xs">{comment.likesCount}</span>
									{/if}
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
