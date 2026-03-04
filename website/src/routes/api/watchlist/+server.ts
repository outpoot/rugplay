// src/routes/api/watchlist/+server.ts
// GET  /api/watchlist          → list current user's watched coins (with live price/change)
// POST /api/watchlist          → { coinId } → add to watchlist
// DELETE /api/watchlist        → { coinId } → remove from watchlist

import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { watchlist, coin } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);

    const rows = await db
        .select({
            watchlistId: watchlist.id,
            createdAt: watchlist.createdAt,
            coinId: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            icon: coin.icon,
            currentPrice: coin.currentPrice,
            change24h: coin.change24h,
            marketCap: coin.marketCap,
            volume24h: coin.volume24h,
        })
        .from(watchlist)
        .innerJoin(coin, eq(watchlist.coinId, coin.id))
        .where(eq(watchlist.userId, userId))
        .orderBy(watchlist.createdAt);

    return json(
        rows.map((r) => ({
            watchlistId: r.watchlistId,
            addedAt: r.createdAt,
            coin: {
                id: r.coinId,
                symbol: r.symbol,
                name: r.name,
                icon: r.icon,
                currentPrice: Number(r.currentPrice),
                change24h: Number(r.change24h ?? 0),
                marketCap: Number(r.marketCap),
                volume24h: Number(r.volume24h ?? 0),
            },
        }))
    );
};

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);
    const body = await request.json();
    const coinId = Number(body?.coinId);

    if (!coinId || isNaN(coinId)) throw error(400, 'coinId is required');

    // Verify the coin exists
    const [coinRow] = await db
        .select({ id: coin.id, symbol: coin.symbol })
        .from(coin)
        .where(eq(coin.id, coinId))
        .limit(1);

    if (!coinRow) throw error(404, 'Coin not found');

    // Insert — ignore duplicates
    await db
        .insert(watchlist)
        .values({ userId, coinId })
        .onConflictDoNothing();

    return json({ success: true, coinId, symbol: coinRow.symbol });
};

export const DELETE: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);
    const body = await request.json();
    const coinId = Number(body?.coinId);

    if (!coinId || isNaN(coinId)) throw error(400, 'coinId is required');

    await db
        .delete(watchlist)
        .where(and(eq(watchlist.userId, userId), eq(watchlist.coinId, coinId)));

    return json({ success: true });
};
