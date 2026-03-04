// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS FUNCTION to src/lib/server/job.ts
// Then call it from your existing cron/job runner (alongside the existing jobs).
//
// Snapshots every active user's portfolio value once per hour.
// Only runs if Redis lock is not held (prevents double-runs in multi-process).
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '$lib/server/db';
import { user, userPortfolio, coin, portfolioSnapshot } from '$lib/server/db/schema';
import { eq, sql, gt } from 'drizzle-orm';
import { redis } from '$lib/server/redis';

const SNAPSHOT_LOCK_KEY = 'job:portfolio_snapshot:lock';
const SNAPSHOT_INTERVAL_SECONDS = 3600; // 1 hour

export async function runPortfolioSnapshotJob(): Promise<void> {
    // Distributed lock — only one instance runs the job per hour
    const acquired = await redis.set(
        SNAPSHOT_LOCK_KEY,
        '1',
        'EX',
        SNAPSHOT_INTERVAL_SECONDS,
        'NX'
    );
    if (!acquired) return; // Another process is handling this

    console.log('[job] Running portfolio snapshot...');

    try {
        // Fetch all users who have had any activity (avoid snapshotting brand-new
        // accounts with default $100 every hour — only snapshot if they have
        // holdings OR have already prestiged at least once)
        const activeUsers = await db
            .select({ id: user.id, baseCurrencyBalance: user.baseCurrencyBalance })
            .from(user)
            .where(sql`${user.prestigeLevel} > 0 OR EXISTS (
                SELECT 1 FROM user_portfolio up WHERE up.user_id = ${user.id}
            )`);

        if (activeUsers.length === 0) return;

        // For each active user, compute total portfolio value
        for (const u of activeUsers) {
            try {
                const [stats] = await db
                    .select({
                        holdingsValue: sql<string>`
                            COALESCE(
                                SUM(
                                    CAST(${userPortfolio.quantity} AS NUMERIC) *
                                    CAST(${coin.currentPrice} AS NUMERIC)
                                ),
                                0
                            )`,
                    })
                    .from(userPortfolio)
                    .leftJoin(coin, eq(userPortfolio.coinId, coin.id))
                    .where(eq(userPortfolio.userId, u.id));

                const cashBalance = Number(u.baseCurrencyBalance);
                const holdingsValue = Number(stats?.holdingsValue ?? 0);
                const totalValue = cashBalance + holdingsValue;

                await db.insert(portfolioSnapshot).values({
                    userId: u.id,
                    totalValue: totalValue.toFixed(8),
                    cashBalance: cashBalance.toFixed(8),
                    holdingsValue: holdingsValue.toFixed(8),
                    snapshottedAt: new Date(),
                });
            } catch (err) {
                // Don't let one user failure break the whole job
                console.error(`[job] Snapshot failed for user ${u.id}:`, err);
            }
        }

        console.log(`[job] Portfolio snapshot done — ${activeUsers.length} users`);
    } catch (err) {
        console.error('[job] Portfolio snapshot job error:', err);
        // Release the lock early so we can retry sooner
        await redis.del(SNAPSHOT_LOCK_KEY);
    }
}
