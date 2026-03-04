<script lang="ts">
    // src/lib/components/self/CoinChat.svelte
    // Drop-in live chat for any coin page.
    // Usage: <CoinChat coinSymbol="BTC" />
    //
    // Polls every 8 seconds for new messages.
    // WebSocket push would be cleaner but this keeps the diff minimal.

    import { onMount, onDestroy } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { USER_DATA } from '$lib/stores/user-data';
    import { formatTimeAgo, getPublicUrl, getPrestigeName, getPrestigeColor } from '$lib/utils';
    import * as Avatar from '$lib/components/ui/avatar';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import { HugeiconsIcon } from '@hugeicons/svelte';
    import { Send01Icon, Loading03Icon } from '@hugeicons/core-free-icons';

    let { coinSymbol }: { coinSymbol: string } = $props();

    type ChatMessage = {
        id: number;
        content: string;
        likesCount: number;
        createdAt: string;
        userId: number | null;
        username: string | null;
        userImage: string | null;
        prestigeLevel: number | null;
        nameColor: string | null;
        founderBadge: boolean | null;
        isAdmin: boolean | null;
    };

    let messages = $state<ChatMessage[]>([]);
    let draft = $state('');
    let sending = $state(false);
    let loading = $state(true);
    let listEl: HTMLDivElement;

    let userData = $derived($USER_DATA);

    let pollInterval: ReturnType<typeof setInterval>;

    onMount(async () => {
        await fetchMessages();
        loading = false;
        scrollToBottom();
        pollInterval = setInterval(fetchMessages, 8_000);
    });

    onDestroy(() => clearInterval(pollInterval));

    async function fetchMessages() {
        try {
            const res = await fetch(`/api/coin-chat/${coinSymbol}`);
            if (!res.ok) return;
            const fresh: ChatMessage[] = await res.json();

            // Only update if there are new messages (avoid re-render flicker)
            if (fresh.length !== messages.length || (fresh.at(-1)?.id !== messages.at(-1)?.id)) {
                messages = fresh;
                // Scroll to bottom only if user was already near it
                setTimeout(scrollToBottom, 50);
            }
        } catch { /* silently ignore poll errors */ }
    }

    function scrollToBottom() {
        if (!listEl) return;
        const threshold = 120; // px from bottom
        const nearBottom =
            listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < threshold;
        if (nearBottom || messages.length <= 5) {
            listEl.scrollTop = listEl.scrollHeight;
        }
    }

    async function sendMessage() {
        if (!draft.trim() || sending || !userData) return;
        sending = true;
        try {
            const res = await fetch(`/api/coin-chat/${coinSymbol}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: draft.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? 'Failed to send');
            messages = [...messages, data];
            draft = '';
            setTimeout(scrollToBottom, 50);
        } catch (e: any) {
            toast.error(e.message ?? 'Could not send message');
        } finally {
            sending = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function usernameStyle(msg: ChatMessage): string {
        if (msg.nameColor) return `color: ${msg.nameColor}`;
        if (msg.isAdmin) return 'color: hsl(var(--primary))';
        return '';
    }

    function prestigeBadge(level: number | null): string | null {
        if (!level || level <= 0) return null;
        return getPrestigeName(level);
    }

    function prestigeClass(level: number | null): string {
        if (!level) return '';
        return getPrestigeColor(level);
    }
</script>

<div class="flex flex-col h-[420px] rounded-xl border bg-card overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span class="text-sm font-semibold">Live Chat</span>
        <span class="text-xs text-muted-foreground">updates every 8s</span>
    </div>

    <!-- Message list -->
    <div
        bind:this={listEl}
        class="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth"
    >
        {#if loading}
            {#each Array(4) as _}
                <div class="flex gap-2 animate-pulse">
                    <div class="h-7 w-7 rounded-full bg-muted shrink-0"></div>
                    <div class="flex-1 space-y-1">
                        <div class="h-3 w-24 rounded bg-muted"></div>
                        <div class="h-3 w-full rounded bg-muted"></div>
                    </div>
                </div>
            {/each}
        {:else if messages.length === 0}
            <div class="flex h-full items-center justify-center text-muted-foreground text-sm">
                No messages yet. Be the first to say something!
            </div>
        {:else}
            {#each messages as msg (msg.id)}
                <div class="flex gap-2 group">
                    <Avatar.Root class="h-7 w-7 shrink-0 mt-0.5">
                        <Avatar.Image src={getPublicUrl(msg.userImage)} alt={msg.username ?? '?'} />
                        <Avatar.Fallback class="text-xs">
                            {(msg.username ?? '?').charAt(0).toUpperCase()}
                        </Avatar.Fallback>
                    </Avatar.Root>

                    <div class="min-w-0 flex-1">
                        <div class="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                            <span
                                class="text-xs font-semibold leading-none"
                                style={usernameStyle(msg)}
                            >
                                {msg.username ?? '[deleted]'}
                            </span>
                            {#if prestigeBadge(msg.prestigeLevel)}
                                <span class="text-[10px] {prestigeClass(msg.prestigeLevel)} font-medium leading-none">
                                    {prestigeBadge(msg.prestigeLevel)}
                                </span>
                            {/if}
                            {#if msg.isAdmin}
                                <span class="text-[10px] text-primary font-medium leading-none">Admin</span>
                            {/if}
                            {#if msg.founderBadge}
                                <span class="text-[10px] text-cyan-400 font-medium leading-none">Supporter</span>
                            {/if}
                            <span class="text-[10px] text-muted-foreground ml-auto leading-none">
                                {formatTimeAgo(msg.createdAt)}
                            </span>
                        </div>
                        <p class="text-sm leading-snug break-words text-foreground/90">{msg.content}</p>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    <!-- Input -->
    <div class="border-t p-2 bg-background">
        {#if !userData}
            <p class="text-center text-xs text-muted-foreground py-1">
                Sign in to chat
            </p>
        {:else}
            <div class="flex gap-2 items-end">
                <Textarea
                    bind:value={draft}
                    onkeydown={handleKeydown}
                    placeholder="Say something… (Enter to send)"
                    rows={1}
                    maxlength={300}
                    class="resize-none min-h-[36px] max-h-[100px] text-sm"
                    disabled={sending}
                />
                <Button
                    size="icon"
                    class="shrink-0 h-9 w-9"
                    onclick={sendMessage}
                    disabled={sending || !draft.trim()}
                    aria-label="Send message"
                >
                    {#if sending}
                        <HugeiconsIcon icon={Loading03Icon} class="h-4 w-4 animate-spin" />
                    {:else}
                        <HugeiconsIcon icon={Send01Icon} class="h-4 w-4" />
                    {/if}
                </Button>
            </div>
            <div class="flex justify-end mt-0.5">
                <span class="text-[10px] text-muted-foreground">{draft.length}/300</span>
            </div>
        {/if}
    </div>
</div>
