<script lang="ts">
    // src/lib/components/self/PortfolioHistoryChart.svelte
    // Shows the user's portfolio value over time.
    // Drop into src/routes/portfolio/+page.svelte.

    import { onMount } from 'svelte';
    import { formatValue } from '$lib/utils';
    import { Button } from '$lib/components/ui/button';
    import { Skeleton } from '$lib/components/ui/skeleton';

    type Range = '1d' | '7d' | '30d' | 'all';

    type Point = {
        t: number;
        totalValue: number;
        cashBalance: number;
        holdingsValue: number;
    };

    type Summary = {
        currentValue: number;
        startValue: number;
        pnlAbsolute: number;
        pnlPercent: number;
        peakValue: number;
        troughValue: number;
    };

    let range = $state<Range>('30d');
    let points = $state<Point[]>([]);
    let summary = $state<Summary | null>(null);
    let loading = $state(true);
    let hoveredIdx = $state<number | null>(null);

    const RANGES: Range[] = ['1d', '7d', '30d', 'all'];

    $effect(() => {
        fetchHistory(range);
    });

    async function fetchHistory(r: Range) {
        loading = true;
        try {
            const res = await fetch(`/api/portfolio/history?range=${r}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            points = data.points;
            summary = data.summary;
        } catch {
            points = [];
            summary = null;
        } finally {
            loading = false;
        }
    }

    // ── SVG path helpers ────────────────────────────────────────────────────
    const W = 600, H = 160, PAD = { l: 48, r: 12, t: 12, b: 28 };
    const IW = W - PAD.l - PAD.r;
    const IH = H - PAD.t - PAD.b;

    function chartData(pts: Point[]) {
        if (pts.length < 2) return null;
        const values = pts.map((p) => p.totalValue);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const coords = pts.map((p, i) => {
            const x = PAD.l + (i / (pts.length - 1)) * IW;
            const y = PAD.t + IH - ((p.totalValue - min) / range) * IH;
            return { x, y, ...p };
        });

        const linePath = coords
            .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
            .join(' ');

        const fillPath =
            `M ${coords[0].x} ${PAD.t + IH} ` +
            coords.map((c) => `L ${c.x} ${c.y}`).join(' ') +
            ` L ${coords.at(-1)!.x} ${PAD.t + IH} Z`;

        return { coords, linePath, fillPath, min, max };
    }

    let cd = $derived(chartData(points));

    let hoveredPoint = $derived(hoveredIdx !== null ? cd?.coords[hoveredIdx] ?? null : null);

    let isProfit = $derived((summary?.pnlAbsolute ?? 0) >= 0);
    let strokeColor = $derived(isProfit ? '#4ade80' : '#f87171');

    function handleMouseMove(e: MouseEvent, svg: SVGSVGElement) {
        if (!cd) return;
        const rect = svg.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * W;
        const relX = svgX - PAD.l;
        const idx = Math.round((relX / IW) * (cd.coords.length - 1));
        hoveredIdx = Math.max(0, Math.min(idx, cd.coords.length - 1));
    }

    function formatLabel(t: number): string {
        return new Date(t).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
            hour: range === '1d' ? '2-digit' : undefined,
            minute: range === '1d' ? '2-digit' : undefined,
        });
    }
</script>

<div class="space-y-4">
    <!-- Range selector -->
    <div class="flex gap-1">
        {#each RANGES as r}
            <Button
                variant={range === r ? 'secondary' : 'ghost'}
                size="sm"
                class="text-xs px-3"
                onclick={() => { range = r; hoveredIdx = null; }}
            >
                {r.toUpperCase()}
            </Button>
        {/each}
    </div>

    {#if loading}
        <Skeleton class="h-40 w-full rounded-xl" />
    {:else if !cd || points.length < 2}
        <div class="flex h-40 items-center justify-center rounded-xl border text-sm text-muted-foreground">
            Not enough data yet — check back later.
        </div>
    {:else}
        <!-- Stats row -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-lg border p-3">
                <div class="text-xs text-muted-foreground mb-1">Current</div>
                <div class="font-mono font-bold">{formatValue(summary?.currentValue ?? 0)}</div>
            </div>
            <div class="rounded-lg border p-3">
                <div class="text-xs text-muted-foreground mb-1">P&L</div>
                <div
                    class="font-mono font-bold"
                    class:text-green-500={isProfit}
                    class:text-red-500={!isProfit}
                >
                    {isProfit ? '+' : ''}{formatValue(summary?.pnlAbsolute ?? 0)}
                    ({isProfit ? '+' : ''}{(summary?.pnlPercent ?? 0).toFixed(1)}%)
                </div>
            </div>
            <div class="rounded-lg border p-3">
                <div class="text-xs text-muted-foreground mb-1">Peak</div>
                <div class="font-mono font-bold">{formatValue(summary?.peakValue ?? 0)}</div>
            </div>
            <div class="rounded-lg border p-3">
                <div class="text-xs text-muted-foreground mb-1">Trough</div>
                <div class="font-mono font-bold">{formatValue(summary?.troughValue ?? 0)}</div>
            </div>
        </div>

        <!-- SVG chart -->
        <div
            class="relative rounded-xl border bg-card overflow-hidden"
            role="img"
            aria-label="Portfolio value chart"
        >
            <svg
                viewBox="0 0 {W} {H}"
                class="w-full"
                onmousemove={(e) => handleMouseMove(e, e.currentTarget as SVGSVGElement)}
                onmouseleave={() => (hoveredIdx = null)}
            >
                <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color={strokeColor} stop-opacity="0.25" />
                        <stop offset="100%" stop-color={strokeColor} stop-opacity="0" />
                    </linearGradient>
                </defs>

                <!-- Y-axis labels -->
                {#each [0, 0.25, 0.5, 0.75, 1] as frac}
                    {@const y = PAD.t + IH * frac}
                    {@const val = (cd.max - cd.min) * (1 - frac) + cd.min}
                    <line
                        x1={PAD.l} x2={W - PAD.r}
                        y1={y} y2={y}
                        stroke="currentColor"
                        stroke-opacity="0.06"
                        stroke-width="1"
                    />
                    <text
                        x={PAD.l - 4} y={y + 4}
                        text-anchor="end"
                        class="fill-muted-foreground"
                        font-size="9"
                    >
                        {formatValue(val)}
                    </text>
                {/each}

                <!-- Fill -->
                <path d={cd.fillPath} fill="url(#portfolioGrad)" />
                <!-- Line -->
                <path
                    d={cd.linePath}
                    fill="none"
                    stroke={strokeColor}
                    stroke-width="2"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                />

                <!-- Hover crosshair -->
                {#if hoveredPoint}
                    <line
                        x1={hoveredPoint.x} x2={hoveredPoint.x}
                        y1={PAD.t} y2={PAD.t + IH}
                        stroke={strokeColor}
                        stroke-opacity="0.4"
                        stroke-width="1"
                        stroke-dasharray="3 3"
                    />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4" fill={strokeColor} />
                {/if}
            </svg>

            <!-- Hover tooltip -->
            {#if hoveredPoint}
                <div class="absolute top-2 left-1/2 -translate-x-1/2 rounded-lg bg-popover border shadow-md px-3 py-1.5 text-xs pointer-events-none">
                    <div class="font-semibold">{formatValue(hoveredPoint.totalValue)}</div>
                    <div class="text-muted-foreground">{formatLabel(hoveredPoint.t)}</div>
                </div>
            {/if}
        </div>
    {/if}
</div>
