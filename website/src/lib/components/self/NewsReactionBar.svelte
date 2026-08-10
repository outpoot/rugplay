<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Add01Icon, Loading03Icon, DollarCircleIcon } from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';
	import { USER_DATA } from '$lib/stores/user-data';
	import { websocketController } from '$lib/stores/websocket';
	import { haptic } from '$lib/stores/haptics';
	import { EMOJI_CATALOG } from '$lib/data/emoji-catalog';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import type { NewsReactionSlot } from '$lib/types/news-comment';

	const { articleId }: { articleId: number } = $props();

	// Same room used by NewsCommentSection — one `set_coin` join per
	// article page covers both the comment feed and the reaction bar,
	// since both listen on the same websocket subscription.
	const room = $derived(`news:${articleId}`);

	const REACTION_LIMIT = 6;

	let slots = $state<NewsReactionSlot[]>([]);
	let slotsRemaining = $state(REACTION_LIMIT);
	let createCost = $state(5000);
	let isLoading = $state(true);
	let pickerOpen = $state(false);
	let shouldSignIn = $state(false);
	let pendingEmoji = $state<string | null>(null); // emoji currently mid-request, disables its button
	let confirmCreateEmoji = $state<string | null>(null); // emoji awaiting cost confirmation dialog
	let confirmDialogOpen = $state(false);
	let confirmSubmitting = $state(false);

	async function loadReactions() {
		isLoading = true;
		try {
			const response = await fetch(`/api/news/${articleId}/reactions`);
			if (response.ok) {
				const result = await response.json();
				slots = result.reactions;
				slotsRemaining = result.slotsRemaining;
				createCost = result.createCost;
			}
		} catch (e) {
			console.error('Failed to load news reactions:', e);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		websocketController.setCoin(room);
		websocketController.subscribeToComments(room, handleWebSocketMessage);

		return () => {
			websocketController.unsubscribeFromComments(room, handleWebSocketMessage);
		};
	});

	function handleWebSocketMessage(message: { type: string; data?: any }) {
		if (message.type !== 'reaction_update') return;
		const data = message.data;
		const myId = $USER_DATA ? Number($USER_DATA.id) : null;

		const idx = slots.findIndex((s) => s.id === data.slotId);

		if (idx === -1) {
			// A brand-new emoji slot was just created by someone (possibly
			// us, possibly another tab/user) — add it if there's room.
			if (slots.length >= REACTION_LIMIT) return;
			slots = [
				...slots,
				{
					id: data.slotId,
					emoji: data.emoji,
					count: data.count,
					reactedByMe: myId != null && data.reactedUserId === myId,
					createdByUserId: data.createdByUserId ?? null,
					createdByUsername: data.createdByUsername ?? null,
					createdByName: data.createdByName ?? null,
					createdByNameColor: data.createdByNameColor ?? null
				}
			];
		} else {
			const current = slots[idx];
			slots[idx] = {
				...current,
				count: data.count,
				reactedByMe:
					myId != null && data.reactedUserId === myId ? !data.removed : current.reactedByMe
			};
		}
		slotsRemaining = Math.max(0, REACTION_LIMIT - slots.length);
	}

	async function toggleReact(slot: NewsReactionSlot) {
		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}

		pendingEmoji = slot.emoji;
		const wasReacted = slot.reactedByMe;
		const idx = slots.findIndex((s) => s.id === slot.id);
		const original = slots[idx];

		// Optimistic update, rolled back on failure.
		slots[idx] = {
			...original,
			reactedByMe: !wasReacted,
			count: wasReacted ? Math.max(0, original.count - 1) : original.count + 1
		};

		try {
			const response = await fetch(`/api/news/${articleId}/reactions`, {
				method: wasReacted ? 'DELETE' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emoji: slot.emoji })
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				slots[idx] = original;
				toast.error(err.message || 'Failed to update reaction');
				return;
			}

			if (!wasReacted) {
				haptic.trigger('light');
				const result = await response.json();
				const creatorUsername = result.createdBy?.username;
				if (creatorUsername) {
					toast.success(reactionSuccessMessage(slot.emoji, creatorUsername));
				}
			}
		} catch (e) {
			slots[idx] = original;
			toast.error('Failed to update reaction');
		} finally {
			pendingEmoji = null;
		}
	}

	function reactionSuccessMessage(emoji: string, creatorUsername: string): string {
		return `You have successfully reacted to ${emoji} that was created by @${creatorUsername}`;
	}

	function onPickEmoji(emoji: string) {
		pickerOpen = false;

		if (!$USER_DATA) {
			shouldSignIn = true;
			return;
		}

		const existing = slots.find((s) => s.emoji === emoji);
		if (existing) {
			// Already on the article — reacting is free, no confirmation needed.
			toggleReact(existing);
			return;
		}

		if (slotsRemaining <= 0) {
			toast.error(`This article already has the maximum of ${REACTION_LIMIT} reactions`);
			return;
		}

		// Brand-new emoji for this article — costs money, confirm first.
		confirmCreateEmoji = emoji;
		confirmDialogOpen = true;
	}

	async function confirmCreateReaction() {
		if (!confirmCreateEmoji) return;
		const emoji = confirmCreateEmoji;
		confirmSubmitting = true;

		try {
			const response = await fetch(`/api/news/${articleId}/reactions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emoji })
			});

			const result = await response.json().catch(() => ({}));

			if (!response.ok) {
				toast.error(result.message || 'Failed to add reaction');
				return;
			}

			// Add locally if the websocket broadcast hasn't landed yet — the
			// handler above will just no-op the dupe when it does arrive
			// since the slot id will already be present.
			if (!slots.some((s) => s.id === result.slotId)) {
				slots = [
					...slots,
					{
						id: result.slotId,
						emoji: result.emoji,
						count: result.count,
						reactedByMe: true,
						createdByUserId: result.createdBy?.userId ?? null,
						createdByUsername: result.createdBy?.username ?? null,
						createdByName: result.createdBy?.name ?? null,
						createdByNameColor: result.createdBy?.nameColor ?? null
					}
				];
				slotsRemaining = Math.max(0, REACTION_LIMIT - slots.length);
			}

			haptic.trigger('medium');
			const creatorUsername = result.createdBy?.username;
			if (creatorUsername) {
				toast.success(reactionSuccessMessage(result.emoji, creatorUsername));
			}
			confirmCreateEmoji = null;
			confirmDialogOpen = false;
		} catch (e) {
			toast.error('Failed to add reaction');
		} finally {
			confirmSubmitting = false;
		}
	}

	$effect(() => {
		void articleId;
		loadReactions();
	});
</script>

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="flex flex-wrap items-center gap-1.5">
	{#if isLoading}
		<HugeiconsIcon icon={Loading03Icon} class="h-4 w-4 animate-spin text-muted-foreground" />
	{:else}
		{#each slots as slot (slot.id)}
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							variant="outline"
							size="sm"
							disabled={pendingEmoji === slot.emoji}
							onclick={() => toggleReact(slot)}
							class="h-7 gap-1.5 rounded-full px-2.5 text-sm {slot.reactedByMe
								? 'border-primary bg-primary/10 text-primary'
								: 'text-muted-foreground'}"
						>
							<span>{slot.emoji}</span>
							<span class="text-xs font-medium">{slot.count}</span>
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						{#if slot.createdByUsername}
							Added by @{slot.createdByUsername}
						{:else}
							{slot.emoji} reaction
						{/if}
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		{/each}

		{#if slotsRemaining > 0}
			<Popover.Root bind:open={pickerOpen}>
				<Popover.Trigger>
					<Button
						variant="outline"
						size="sm"
						class="h-7 gap-1 rounded-full px-2 text-muted-foreground"
						aria-label="Add reaction"
					>
						<HugeiconsIcon icon={Add01Icon} class="h-3.5 w-3.5" />
					</Button>
				</Popover.Trigger>
				<Popover.Content class="w-72 p-3" align="start">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-xs font-medium text-muted-foreground">Add a reaction</span>
						<span class="text-xs text-muted-foreground">{slotsRemaining} slot{slotsRemaining === 1 ? '' : 's'} left</span>
					</div>
					<div class="space-y-2">
						{#each EMOJI_CATALOG as group (group.label)}
							<div>
								<div class="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									{group.label}
								</div>
								<div class="flex flex-wrap gap-1">
									{#each group.emoji as emoji (emoji)}
										{@const existing = slots.find((s) => s.emoji === emoji)}
										<button
											type="button"
											onclick={() => onPickEmoji(emoji)}
											class="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-accent {existing
												? 'ring-1 ring-primary/40'
												: ''}"
											title={existing ? `Already on this article — free to react` : `New — costs $${createCost.toLocaleString()}`}
										>
											{emoji}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
					<p class="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
						<HugeiconsIcon icon={DollarCircleIcon} class="h-3 w-3" />
						New emoji cost ${createCost.toLocaleString()} · anyone can react to it for free after
					</p>
				</Popover.Content>
			</Popover.Root>
		{/if}
	{/if}
</div>

<Dialog bind:open={confirmDialogOpen}>
	<DialogContent class="sm:max-w-sm">
		<DialogHeader>
			<DialogTitle>Add {confirmCreateEmoji} as a reaction?</DialogTitle>
			<DialogDescription>
				This emoji isn't on this article yet. Adding it costs ${createCost.toLocaleString()},
				charged to your balance. Once added, everyone (including you) can react with it for free.
			</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					confirmDialogOpen = false;
					confirmCreateEmoji = null;
				}}
				disabled={confirmSubmitting}
			>
				Cancel
			</Button>
			<Button onclick={confirmCreateReaction} disabled={confirmSubmitting}>
				{confirmSubmitting ? 'Adding...' : `Pay $${createCost.toLocaleString()}`}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
