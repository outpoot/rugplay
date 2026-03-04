// src/routes/api/portfolio/history/+server.ts
// GET /api/portfolio/history?range=1d|7d|30d|all
// Returns portfolio snapshot data for the P&L chart.

import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { portfolioSnapshot, user, userPortfolio, coin } from '$lib/server/db/schema';
import { eq, gte, desc, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const RANGE_MS: Record<string, number> = {
    '1d':  1  * 24 * 60 * 60 * 1000,
    '7d':  7  * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': Infinity,
};

export const GET: RequestHandler = async ({ request, url }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);
    const range = url.searchParams.get('range') ?? '30d';
    const ms = RANGE_MS[range] ?? RANGE_MS['30d'];

    const since = ms === Infinity
        ? new Date(0)
        : new Date(Date.now() - ms);

    // ── Historical snapshots ─────────────────────────────────────────────────
    const snapshots = await db
        .select({
            totalValue: portfolioSnapshot.totalValue,
            cashBalance: portfolioSnapshot.cashBalance,
            holdingsValue: portfolioSnapshot.holdingsValue,
            snapshottedAt: portfolioSnapshot.snapshottedAt,
        })
        .from(portfolioSnapshot)
        .where(
            sql`${portfolioSnapshot.userId} = ${userId} AND ${portfolioSnapshot.snapshottedAt} >= ${since}`
        )
        .orderBy(portfolioSnapshot.snapshottedAt);

    // ── Current live value (append as the rightmost point) ──────────────────
    const [userRow] = await db
        .select({ baseCurrencyBalance: user.baseCurrencyBalance })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    const [portfolioStats] = await db
        .select({
            holdingsValue: sql<number>`
                COALESCE(
                    SUM(CAST(${userPortfolio.quantity} AS NUMERIC) * CAST(${coin.currentPrice} AS NUMERIC)),
                    0
                )`,
        })
        .from(userPortfolio)
        .leftJoin(coin, eq(userPortfolio.coinId, coin.id))
        .where(eq(userPortfolio.userId, userId));

    const cashNow = Number(userRow?.baseCurrencyBalance ?? 100);
    const holdingsNow = Number(portfolioStats?.holdingsValue ?? 0);
    const totalNow = cashNow + holdingsNow;

    const points = [
        ...snapshots.map((s) => ({
            t: new Date(s.snapshottedAt).getTime(),
            totalValue: Number(s.totalValue),
            cashBalance: Number(s.cashBalance),
            holdingsValue: Number(s.holdingsValue),
        })),
        // Live point
        {
            t: Date.now(),
            totalValue: totalNow,
            cashBalance: cashNow,
            holdingsValue: holdingsNow,
        },
    ];

    // ── Summary stats ────────────────────────────────────────────────────────
    const firstValue = points[0]?.totalValue ?? totalNow;
    const pnlAbsolute = totalNow - firstValue;
    const pnlPercent = firstValue > 0 ? (pnlAbsolute / firstValue) * 100 : 0;

    const peakValue = points.reduce((m, p) => Math.max(m, p.totalValue), 0);
    const troughValue = points.reduce((m, p) => Math.min(m, p.totalValue), Infinity);

    return json({
        points,
        summary: {
            currentValue: totalNow,
            startValue: firstValue,
            pnlAbsolute,
            pnlPercent,
            peakValue,
            troughValue,
            range,
            pointCount: points.length,
        },
    });
};
