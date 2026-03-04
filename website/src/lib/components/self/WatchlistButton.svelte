<script lang="ts">
    // src/lib/components/self/WatchlistButton.svelte
    // Drop into any coin page header.
    // Usage: <WatchlistButton {coinId} {coinSymbol} />

    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { USER_DATA } from '$lib/stores/user-data';
    import { Button } from '$lib/components/ui/button';
    import { HugeiconsIcon } from '@hugeicons/svelte';
    import { StarIcon, Loading03Icon } from '@hugeicons/core-free-icons';

    let {
        coinId,
        coinSymbol,
    }: {
        coinId: number;
        coinSymbol: string;
    } = $props();

    let userData = $derived($USER_DATA);
    let watched = $state(false);
    let loading = $state(true);
    let toggling = $state(false);

    onMount(async () => {
        if (!$USER_DATA) { loading = false; return; }
        try {
            const res = await fetch('/api/watchlist');
            if (res.ok) {
                const list: { coin: { id: number } }[] = await res.json();
                watched = list.some((w) => w.coin.id === coinId);
            }
        } catch { /* ignore */ } finally {
            loading = false;
        }
    });

    async function toggle() {
        if (!userData) {
            toast.error('Sign in to use your watchlist');
            return;
        }
        toggling = true;
        try {
            const method = watched ? 'DELETE' : 'POST';
            const res = await fetch('/api/watchlist', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coinId }),
            });
            if (!res.ok) throw new Error();
            watched = !watched;
            toast.success(watched ? `${coinSymbol} added to watchlist` : `${coinSymbol} removed`);
        } catch {
            toast.error('Failed to update watchlist');
        } finally {
            toggling = false;
        }
    }
</script>

<Button
    variant={watched ? 'secondary' : 'outline'}
    size="sm"
    onclick={toggle}
    disabled={loading || toggling}
    class="gap-1.5"
    aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
>
    {#if toggling || loading}
        <HugeiconsIcon icon={Loading03Icon} class="h-4 w-4 animate-spin" />
    {:else}
        <HugeiconsIcon
            icon={StarIcon}
            class="h-4 w-4 {watched ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}"
        />
    {/if}
    {watched ? 'Watching' : 'Watch'}
</Button>
