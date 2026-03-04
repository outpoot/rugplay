<script lang="ts">
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { goto } from '$app/navigation';
    import { USER_DATA } from '$lib/stores/user-data';
    import { formatValue, formatPrice, getPublicUrl } from '$lib/utils';
    import SEO from '$lib/components/self/SEO.svelte';
    import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
    import CoinIcon from '$lib/components/self/CoinIcon.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Skeleton } from '$lib/components/ui/skeleton';
    import { HugeiconsIcon } from '@hugeicons/svelte';
    import {
        StarIcon,
        Delete02Icon,
        TrendUp01Icon,
        TrendDown01Icon,
        Search01Icon,
    } from '@hugeicons/core-free-icons';

    type WatchedCoin = {
        watchlistId: number;
        addedAt: string;
        coin: {
            id: number;
            symbol: string;
            name: string;
            icon: string | null;
            currentPrice: number;
            change24h: number;
            marketCap: number;
            volume24h: number;
        };
    };

    let userData = $derived($USER_DATA);
    let shouldSignIn = $state(false);
    let loading = $state(true);
    let watchedCoins = $state<WatchedCoin[]>([]);
    let removing = $state<Set<number>>(new Set());

    onMount(async () => {
        if (!$USER_DATA) {
            loading = false;
            return;
        }
        await fetchWatchlist();
        loading = false;

        // Auto-refresh prices every 15s
        const interval = setInterval(fetchWatchlist, 15_000);
        return () => clearInterval(interval);
    });

    async function fetchWatchlist() {
        try {
            const res = await fetch('/api/watchlist');
            if (!res.ok) throw new Error('Failed to load watchlist');
            watchedCoins = await res.json();
        } catch (e) {
            toast.error('Could not load watchlist');
        }
    }

    async function removeFromWatchlist(coinId: number, symbol: string) {
        removing = new Set([...removing, coinId]);
        try {
            const res = await fetch('/api/watchlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coinId }),
            });
            if (!res.ok) throw new Error();
            watchedCoins = watchedCoins.filter((w) => w.coin.id !== coinId);
            toast.success(`Removed ${symbol} from watchlist`);
        } catch {
            toast.error('Failed to remove coin');
        } finally {
            removing = new Set([...removing].filter((id) => id !== coinId));
        }
    }
</script>

<SEO
    title="Watchlist - Rugplay"
    description="Track your favourite coins in one place."
    noindex={true}
/>

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="container mx-auto max-w-4xl p-6">
    <header class="mb-8">
        <div class="flex items-center gap-3 mb-2">
            <HugeiconsIcon icon={StarIcon} class="h-8 w-8 text-yellow-500" />
            <h1 class="text-3xl font-bold">Watchlist</h1>
        </div>
        <p class="text-muted-foreground">
            Star coins from any coin page to track them here. Prices refresh every 15 seconds.
        </p>
    </header>

    {#if !userData}
        <div class="flex h-72 items-center justify-center">
            <div class="text-center">
                <HugeiconsIcon icon={StarIcon} class="mx-auto mb-4 h-16 w-16 text-yellow-500/40" />
                <p class="text-muted-foreground mb-4">Sign in to use your watchlist</p>
                <Button onclick={() => (shouldSignIn = true)}>Sign In</Button>
            </div>
        </div>
    {:else if loading}
        <div class="flex flex-col gap-3">
            {#each Array(5) as _}
                <Skeleton class="h-16 w-full rounded-xl" />
            {/each}
        </div>
    {:else if watchedCoins.length === 0}
        <div class="flex h-72 items-center justify-center">
            <div class="text-center">
                <HugeiconsIcon icon={Search01Icon} class="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                <h3 class="mb-2 text-lg font-semibold">No coins starred yet</h3>
                <p class="text-muted-foreground mb-4 text-sm">
                    Visit any coin page and click the ⭐ button to add it here.
                </p>
                <Button onclick={() => goto('/market')} variant="outline">Browse Market</Button>
            </div>
        </div>
    {:else}
        <!-- Summary bar -->
        <div class="mb-4 flex items-center justify-between">
            <span class="text-muted-foreground text-sm">
                {watchedCoins.length} coin{watchedCoins.length !== 1 ? 's' : ''} starred
            </span>
            <Button variant="ghost" size="sm" onclick={() => goto('/market')}>+ Add coins</Button>
        </div>

        <!-- Table header -->
        <div class="mb-2 grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 text-xs text-muted-foreground uppercase tracking-wide">
            <span></span>
            <span>Name</span>
            <span class="text-right">Price</span>
            <span class="text-right">24h</span>
            <span></span>
        </div>

        <div class="flex flex-col gap-2">
            {#each watchedCoins as { watchlistId, coin } (coin.id)}
                <Card.Root class="hover:border-border/80 transition-colors">
                    <Card.Content class="p-0">
                        <div class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3">
                            <!-- Icon -->
                            <button
                                class="shrink-0"
                                onclick={() => goto(`/coin/${coin.symbol}`)}
                                aria-label="View {coin.symbol}"
                            >
                                <CoinIcon icon={coin.icon} symbol={coin.symbol} size="sm" />
                            </button>

                            <!-- Name / symbol -->
                            <button
                                class="min-w-0 text-left"
                                onclick={() => goto(`/coin/${coin.symbol}`)}
                            >
                                <div class="font-semibold truncate">{coin.symbol}</div>
                                <div class="text-muted-foreground text-xs truncate">{coin.name}</div>
                            </button>

                            <!-- Price -->
                            <div class="text-right font-mono text-sm">
                                ${formatPrice(coin.currentPrice)}
                            </div>

                            <!-- 24h change -->
                            <div
                                class="flex items-center gap-1 text-sm font-semibold"
                                class:text-green-500={coin.change24h >= 0}
                                class:text-red-500={coin.change24h < 0}
                            >
                                <HugeiconsIcon
                                    icon={coin.change24h >= 0 ? TrendUp01Icon : TrendDown01Icon}
                                    class="h-4 w-4"
                                />
                                {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                            </div>

                            <!-- Remove -->
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={removing.has(coin.id)}
                                onclick={() => removeFromWatchlist(coin.id, coin.symbol)}
                                aria-label="Remove {coin.symbol}"
                            >
                                <HugeiconsIcon icon={Delete02Icon} class="h-4 w-4" />
                            </Button>
                        </div>
                    </Card.Content>
                </Card.Root>
            {/each}
        </div>
    {/if}
</div>

<style>
    .container { min-height: calc(100vh - 4rem); }
</style>
