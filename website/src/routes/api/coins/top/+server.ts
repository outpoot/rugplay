import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, priceHistory } from '$lib/server/db/schema';
import { and, eq, desc, gte, inArray, sql } from 'drizzle-orm';

const SPARKLINE_COINS = 6;
const SPARKLINE_TTL_MS = 60_000;

// The home page is the most visited route, so the hourly averages behind the
// little charts are worked out at most once a minute per server process.
let sparklineCache: { key: string; expires: number; data: Map<number, number[]> } | null = null;

async function getSparklines(coinIds: number[]): Promise<Map<number, number[]>> {
    const key = coinIds.join(',');
    if (sparklineCache && sparklineCache.key === key && sparklineCache.expires > Date.now()) {
        return sparklineCache.data;
    }

    const data = new Map<number, number[]>();
    if (coinIds.length > 0) {
        const bucket = sql<Date>`date_trunc('hour', ${priceHistory.timestamp})`;
        const rows = await db
            .select({
                coinId: priceHistory.coinId,
                bucket,
                price: sql<string>`avg(${priceHistory.price})`
            })
            .from(priceHistory)
            .where(
                and(
                    inArray(priceHistory.coinId, coinIds),
                    gte(priceHistory.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))
                )
            )
            .groupBy(priceHistory.coinId, bucket)
            .orderBy(priceHistory.coinId, bucket);

        for (const row of rows) {
            const points = data.get(row.coinId) ?? [];
            points.push(Number(row.price));
            data.set(row.coinId, points);
        }
    }

    sparklineCache = { key, expires: Date.now() + SPARKLINE_TTL_MS, data };
    return data;
}

export async function GET() {
    try {
        const coins = await db
            .select({
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                icon: coin.icon,
                currentPrice: coin.currentPrice,
                change24h: coin.change24h, // Read directly from DB
                marketCap: coin.marketCap,
                volume24h: coin.volume24h // Read directly from DB
            })
            .from(coin)
            .where(eq(coin.isListed, true))
            .orderBy(desc(coin.marketCap))
            .limit(50);

        let sparklines = new Map<number, number[]>();
        try {
            sparklines = await getSparklines(coins.slice(0, SPARKLINE_COINS).map((c) => c.id));
        } catch (e) {
            // The charts are decoration; never fail the list over them.
            console.error('Error fetching sparklines:', e);
        }

        const formattedCoins = coins.map(c => {
            const history = sparklines.get(c.id);
            return {
                symbol: c.symbol,
                name: c.name,
                icon: c.icon,
                price: Number(c.currentPrice),
                change24h: Number(c.change24h),
                marketCap: Number(c.marketCap),
                volume24h: Number(c.volume24h),
                ...(history ? { sparkline: [...history, Number(c.currentPrice)] } : {})
            };
        });

        return json({ coins: formattedCoins });
    } catch (e) {
        console.error('Error fetching top coins:', e);
        return json({ coins: [] });
    }
}
